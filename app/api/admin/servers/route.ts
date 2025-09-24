import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { requireAdmin } from "../_utils";
import { Agent as UndiciAgent } from "undici";

export const dynamic = "force-dynamic";

function parseJson(value: unknown) {
  if (value == null || value === "") return undefined;
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error("Invalid JSON payload provided");
  }
}

function toNumber(value: unknown) {
  if (value == null || value === "") return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error("Expected numeric value");
  return num;
}

// Minimal Proxmox helpers for stop/delete operations
type HostConfig = {
  id: string;
  host_url: string;
  allow_insecure_tls: boolean;
  token_id: string | null;
  token_secret: string | null;
  username: string | null;
  password: string | null;
};

function withTimeout<T>(p: Promise<T>, ms = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("Request timed out")), ms);
    p.then((v) => { clearTimeout(id); resolve(v); })
     .catch((e) => { clearTimeout(id); reject(e); });
  });
}

async function proxmoxAuthCookie(apiBase: string, dispatcher: any, cfg: HostConfig) {
  const tokenId = cfg.token_id || undefined;
  const tokenSecret = cfg.token_secret || undefined;
  const username = cfg.username || undefined;
  const password = cfg.password || undefined;

  if (tokenId && tokenSecret) {
    const tokenAuth = { headers: { Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}` } as HeadersInit };
    try {
      const verify = await withTimeout(
        fetch(`${apiBase}/api2/json/nodes`, {
          cache: "no-store",
          redirect: "follow",
          ...(tokenAuth as any),
          // @ts-expect-error undici dispatcher
          dispatcher,
        })
      );
      if (verify.ok) return tokenAuth;
    } catch {}
  }

  if (!username || !password) throw new Error("Missing Proxmox credentials in DB");

  const body = new URLSearchParams({ username, password });
  const ticketRes = await withTimeout(
    fetch(`${apiBase}/api2/json/access/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      redirect: "follow",
      // @ts-expect-error undici dispatcher
      dispatcher,
    })
  );
  if (!ticketRes.ok) {
    const t = await ticketRes.text();
    throw new Error(`login failed (${ticketRes.status}): ${t}`);
  }
  const ticketJson = (await ticketRes.json()) as any;
  const ticket = ticketJson?.data?.ticket as string | undefined;
  const csrf = ticketJson?.data?.CSRFPreventionToken as string | undefined;
  if (!ticket) throw new Error("Missing PVE ticket in response");
  if (!csrf) throw new Error("Missing CSRFPreventionToken in response");
  return { headers: { Cookie: `PVEAuthCookie=${ticket}`, CSRFPreventionToken: csrf } as HeadersInit };
}

async function postForm(apiBase: string, path: string, form: Record<string, string | number | boolean>, auth: RequestInit, dispatcher?: any) {
  const body = new URLSearchParams();
  Object.entries(form).forEach(([k, v]) => body.append(k, String(v)));
  const res = await withTimeout(
    fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", ...(auth.headers as any) },
      body,
      redirect: "follow",
      // @ts-expect-error undici dispatcher
      dispatcher,
    })
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function waitTask(apiBase: string, node: string, upid: string, auth: RequestInit, dispatcher?: any, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await withTimeout(
      fetch(`${apiBase}/api2/json/nodes/${encodeURIComponent(node)}/tasks/${encodeURIComponent(upid)}/status`, {
        cache: "no-store",
        redirect: "follow",
        headers: auth.headers as any,
        // @ts-expect-error undici dispatcher
        dispatcher,
      })
    );
    if (res.ok) {
      const json = await res.json();
      const data = (json as any)?.data ?? json;
      if (data?.status === "stopped" && data?.exitstatus) {
        if (String(data.exitstatus).toUpperCase() === "OK") return true;
        throw new Error(`task failed: ${data.exitstatus}`);
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("task timeout");
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit") || "200");
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 200;
  const ownerId = url.searchParams.get("ownerId");
  const status = url.searchParams.get("status");
  const location = url.searchParams.get("location");

  const supabase = createServerSupabase();
  let query = supabase.from("servers").select("*").order("created_at", { ascending: false }).limit(limit);
  if (ownerId) query = query.eq("owner_id", ownerId);
  if (status) query = query.eq("status", status);
  if (location) query = query.eq("location", location);

  const { data, error } = await query;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, servers: data || [] });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as any;
  if (!body?.name || !body?.ip) {
    return Response.json({ ok: false, error: "name and ip are required" }, { status: 400 });
  }

  let details: Record<string, unknown> | undefined;
  try {
    details = parseJson(body.details);
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Invalid details" }, { status: 400 });
  }

  let cpuCores: number | undefined;
  let memoryMb: number | undefined;
  let diskGb: number | undefined;
  try {
    cpuCores = toNumber(body.cpu_cores);
    memoryMb = toNumber(body.memory_mb);
    diskGb = toNumber(body.disk_gb);
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Invalid numeric value" }, { status: 400 });
  }

  const payload: any = {
    name: body.name,
    ip: body.ip,
    location: body.location ?? null,
    owner_id: body.owner_id ?? null,
    owner_email: body.owner_email ?? null,
    status: body.status ?? null,
    os: body.os ?? null,
    vmid: body.vmid ?? null,
    node: body.node ?? null,
    cpu_cores: cpuCores ?? null,
    memory_mb: memoryMb ?? null,
    disk_gb: diskGb ?? null,
    details: details ?? null,
  };

  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("servers").insert(payload).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, server: data });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as any;
  const id = body?.id;
  if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });

  let details: Record<string, unknown> | undefined;
  try {
    details = parseJson(body.details);
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Invalid details" }, { status: 400 });
  }

  let cpuCores: number | undefined;
  let memoryMb: number | undefined;
  let diskGb: number | undefined;
  try {
    cpuCores = toNumber(body.cpu_cores);
    memoryMb = toNumber(body.memory_mb);
    diskGb = toNumber(body.disk_gb);
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Invalid numeric value" }, { status: 400 });
  }

  const updates: any = {};
  const fields: Array<[string, any]> = [
    ["name", body.name],
    ["ip", body.ip],
    ["location", body.location],
    ["owner_id", body.owner_id],
    ["owner_email", body.owner_email],
    ["status", body.status],
    ["os", body.os],
    ["vmid", body.vmid],
    ["node", body.node],
  ];
  for (const [key, value] of fields) {
    if (value !== undefined) updates[key] = value === "" ? null : value;
  }
  if (cpuCores !== undefined) updates.cpu_cores = cpuCores;
  if (memoryMb !== undefined) updates.memory_mb = memoryMb;
  if (diskGb !== undefined) updates.disk_gb = diskGb;
  if (details !== undefined) updates.details = details;

  if (Object.keys(updates).length === 0) {
    return Response.json({ ok: false, error: "No updates provided" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.from("servers").update(updates).eq("id", id).select("*").single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true, server: data });
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "id query param required" }, { status: 400 });

  const supabase = createServerSupabase();

  // Lookup the server to identify Proxmox VM
  const { data: server, error: serverErr } = await supabase
    .from("servers")
    .select("id, vmid, node, location")
    .eq("id", id)
    .maybeSingle();
  if (serverErr) return Response.json({ ok: false, error: serverErr.message }, { status: 500 });

  if (!server) {
    // If the record is already gone, nothing to delete remotely
    return Response.json({ ok: true, note: "Server not found" });
  }

  const vmid = (server as any)?.vmid as number | null | undefined;
  const node = (server as any)?.node as string | null | undefined;
  const hostId = (server as any)?.location as string | null | undefined;

  if (!vmid || !node || !hostId) {
    return Response.json({ ok: false, error: "Server missing vmid/node/location; cannot destroy VM" }, { status: 400 });
  }

  const { data: host, error: hostErr } = await supabase
    .from("proxmox_hosts")
    .select("id, host_url, allow_insecure_tls, token_id, token_secret, username, password")
    .eq("id", hostId)
    .maybeSingle();
  if (hostErr) return Response.json({ ok: false, error: hostErr.message }, { status: 500 });
  if (!host) return Response.json({ ok: false, error: "Host not found" }, { status: 404 });

  const cfg = host as HostConfig;
  const allowInsecure = !!cfg.allow_insecure_tls;
  const dispatcher = allowInsecure ? new UndiciAgent({ connect: { rejectUnauthorized: false } }) : undefined;
  const apiBase = (cfg.host_url || '').startsWith("http:") ? cfg.host_url.replace(/^http:/, "https:") : cfg.host_url;

  try {
    const auth = await proxmoxAuthCookie(apiBase, dispatcher, cfg);

    // Try to stop VM (ignore failures)
    try {
      const stop = await postForm(
        apiBase,
        `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/stop`,
        { timeout: 60 },
        auth,
        dispatcher
      );
      const upid = (stop as any)?.data;
      if (upid) await waitTask(apiBase, node, upid, auth, dispatcher, 120000).catch(() => {});
    } catch {}

    // Delete VM with purge
    const delRes = await withTimeout(
      fetch(`${apiBase}/api2/json/nodes/${encodeURIComponent(node)}/qemu/${vmid}?purge=1`, {
        method: "DELETE",
        headers: auth.headers as any,
        redirect: "follow",
        // @ts-expect-error undici dispatcher
        dispatcher,
      })
    );
    if (!delRes.ok) {
      if (delRes.status === 404) {
        // Already gone; proceed to DB deletion
      } else {
      const text = await delRes.text().catch(() => "");
      throw new Error(`delete failed (${delRes.status}): ${text}`);
      }
    } else {
      const delJson = await delRes.json().catch(() => ({} as any));
      const delUpid = (delJson as any)?.data;
      if (delUpid) await waitTask(apiBase, node, delUpid, auth, dispatcher, 180000);
    }

    // Remove row from DB
    const { error: dbErr } = await supabase.from("servers").delete().eq("id", id);
    if (dbErr) return Response.json({ ok: false, error: dbErr.message, proxmox: { deleted: true } }, { status: 500 });

    return Response.json({ ok: true, proxmox: { deleted: true }, id });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

