import { NextRequest } from "next/server";
import { Agent as UndiciAgent } from "undici";
import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function serializeError(err: unknown) {
  const e = err as any;
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    code: e?.code,
    cause: e?.cause ? (e.cause.message || String(e.cause)) : undefined,
  };
}

function withTimeout<T>(p: Promise<T>, ms = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("Request timed out")), ms);
    p.then((v) => { clearTimeout(id); resolve(v); })
     .catch((e) => { clearTimeout(id); reject(e); });
  });
}

type HostConfig = {
  id: string;
  name: string;
  host_url: string;
  allow_insecure_tls: boolean;
  token_id: string | null;
  token_secret: string | null;
  username: string | null;
  password: string | null;
  node: string;
  storage: string;
  bridge: string;
  template_vmid: number | null;
  gateway_ip: string | null;
  dns_primary: string | null;
  dns_secondary: string | null;
};

async function proxmoxAuthCookie(apiBase: string, dispatcher: any, host: HostConfig) {
  const tokenId = host.token_id || undefined;
  const tokenSecret = host.token_secret || undefined;
  const username = host.username || undefined;
  const password = host.password || undefined;

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

async function fetchJson(apiBase: string, path: string, init?: RequestInit, dispatcher?: any) {
  const res = await withTimeout(
    fetch(`${apiBase}${path}`, {
      cache: "no-store",
      redirect: "follow",
      ...(init || {}),
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

async function waitTask(apiBase: string, node: string, upid: string, auth: RequestInit, dispatcher?: any, timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const json = await fetchJson(apiBase, `/api2/json/nodes/${encodeURIComponent(node)}/tasks/${encodeURIComponent(upid)}/status`, auth, dispatcher);
    const data = (json as any)?.data ?? json;
    if (data?.status === "stopped" && data?.exitstatus) {
      if (String(data.exitstatus).toUpperCase() === "OK") return true;
      throw new Error(`task failed: ${data.exitstatus}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("task timeout");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as any;
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : undefined;

  const hostId = String(body.location || "");
  if (!hostId) return Response.json({ ok: false, error: "location (hostId) required" }, { status: 400 });

  const supabase = createServerSupabase(bearer);
  const { data: host, error: hostErr } = await supabase
    .from("proxmox_hosts")
    .select("*")
    .eq("id", hostId)
    .eq("is_active", true)
    .maybeSingle();

  if (hostErr) return Response.json({ ok: false, error: hostErr.message }, { status: 500 });
  if (!host) return Response.json({ ok: false, error: "Host not found or inactive" }, { status: 404 });

  const cfg = host as HostConfig;

  const allowInsecure = !!cfg.allow_insecure_tls;
  const dispatcher = allowInsecure ? new UndiciAgent({ connect: { rejectUnauthorized: false } }) : undefined;
  const apiBase = cfg.host_url.startsWith("http:") ? cfg.host_url.replace(/^http:/, "https:") : cfg.host_url;

  const hostname = body.hostname || `vm-${Date.now()}`;
  const sshPassword = body.sshPassword as string | undefined;
  const cpuCores = Number(body.cpuCores || 2);
  const memoryMB = Number(body.memoryMB || 2048);
  const diskGB = body.diskGB ? Number(body.diskGB) : undefined;
  const os = body.os || cfg.template_os || "Ubuntu 24.04 LTS";

  if (!sshPassword) return Response.json({ ok: false, error: "sshPassword is required" }, { status: 400 });

  // IP auto-assign from DB pools if not provided
  let ipPrimary: string | undefined = body.ipPrimary ? String(body.ipPrimary) : undefined;
  let macAddress: string | undefined = body.mac ? String(body.mac) : undefined;

  try {
    const { data: usedRows } = await supabase.from("servers").select("ip");
    const usedSet = new Set<string>((usedRows || []).map((r: any) => String(r.ip)));

    const { data: pools } = await supabase
      .from("public_ip_pools")
      .select("id, mac")
      .eq("host_id", cfg.id);
    const poolIds = (pools || []).map((p: any) => Number(p.id));
    const macByPool = new Map<number, string | undefined>((pools || []).map((p: any) => [Number(p.id), p.mac as string | undefined]));

    let candidates: Array<{ ip: string; mac?: string; poolId: number }> = [];
    if (poolIds.length > 0) {
      const { data: ipRows } = await supabase
        .from("public_ip_pool_ips")
        .select("pool_id, ip")
        .in("pool_id", poolIds);
      for (const r of ipRows || []) {
        const poolId = Number((r as any).pool_id);
        const ip = String((r as any).ip);
        const mac = macByPool.get(poolId);
        if (!usedSet.has(ip)) candidates.push({ ip, mac, poolId });
      }
    }

    if (!ipPrimary) ipPrimary = candidates[0]?.ip;
    if (!macAddress && ipPrimary) {
      const found = candidates.find((x) => x.ip === ipPrimary);
      macAddress = found?.mac;
    }
  } catch {}

  const gateway = cfg.gateway_ip || undefined;
  const dns1 = cfg.dns_primary || "8.8.8.8";
  const dns2 = cfg.dns_secondary || "1.1.1.1";

  if (!ipPrimary || !gateway) return Response.json({ ok: false, error: "No available IPs or gateway missing" }, { status: 409 });
  if (!macAddress) return Response.json({ ok: false, error: "MAC address required for routed IP" }, { status: 400 });

  const node = cfg.node;
  const storage = cfg.storage || "local";
  const bridge = cfg.bridge || "vmbr0";
  const templateVmidFromDb = cfg.template_vmid || undefined;

  // Reserve DB record to avoid reuse
  let reservationId: number | null = null;
  let db = { saved: false as boolean, id: null as null | number, error: null as null | string };

  try {
    const { data: existing } = await supabase
      .from("servers")
      .select("id")
      .eq("ip", ipPrimary)
      .limit(1)
      .maybeSingle();
    if (existing) return Response.json({ ok: false, error: "IP already in use" }, { status: 409 });

    const { data: inserted, error: insertErr } = await supabase
      .from("servers")
      .insert({
        vmid: 0,
        node,
        name: hostname,
        ip: ipPrimary,
        os,
        location: hostId,
        cpu_cores: cpuCores,
        memory_mb: memoryMB,
        disk_gb: diskGB ?? null,
        status: "provisioning",
        details: null,
        owner_id: body.ownerId || null,
        owner_email: body.ownerEmail || null,
      })
      .select("id")
      .single();
    if (insertErr) {
      db.error = insertErr.message;
      if (insertErr.message?.toLowerCase().includes("duplicate") || (insertErr as any).code === "23505") {
        return Response.json({ ok: false, error: "IP already in use" }, { status: 409 });
      }
      return Response.json({ ok: false, error: "Failed to reserve IP", db }, { status: 500 });
    }
    reservationId = (inserted as any)?.id ?? null;
    db.saved = true;
    db.id = reservationId;
  } catch (e: any) {
    db.error = e?.message || String(e);
    return Response.json({ ok: false, error: "DB reservation failed", db }, { status: 500 });
  }

  try {
    const auth = await proxmoxAuthCookie(apiBase, dispatcher, cfg);

    // Resolve template vmid (priority: explicit template id in DB via OS name, then host default, then guess)
    let templateVmid = templateVmidFromDb ? Number(templateVmidFromDb) : undefined;
    try {
      // Try find matching template for this host by name (case-insensitive)
      const { data: t } = await supabase
        .from('proxmox_templates')
        .select('vmid, name, is_active')
        .eq('host_id', cfg.id)
        .ilike('name', os)
        .maybeSingle();
      if (t && (t as any).is_active !== false) {
        const vmid = Number((t as any).vmid);
        if (!Number.isNaN(vmid)) templateVmid = vmid;
      }
    } catch {}
    if (!templateVmid) {
      // Fallback guessing
      const listJson = await fetchJson(apiBase, `/api2/json/nodes/${encodeURIComponent(node)}/qemu`, auth, dispatcher);
      const vms = ((listJson as any)?.data ?? listJson) as any[];
      const guess = vms.find((v) => String(v?.name || "").toLowerCase().includes("ubuntu") && String(v?.name || "").includes("24"));
      if (guess?.vmid) templateVmid = Number(guess.vmid);
    }
    if (!templateVmid) {
      return Response.json({ ok: false, error: "Set template_vmid for host or ensure an Ubuntu 24 template exists" }, { status: 400 });
    }

    // Next VMID
    const nextIdJson = await fetchJson(apiBase, "/api2/json/cluster/nextid", auth, dispatcher);
    const newid = Number(((nextIdJson as any)?.data ?? nextIdJson) as string);

    // Clone
    const cloneRes = await postForm(
      apiBase,
      `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${templateVmid}/clone`,
      { newid, name: hostname, full: 1, target: node, storage },
      auth,
      dispatcher
    );
    const upid = (cloneRes as any)?.data;
    if (!upid) throw new Error("clone did not return task id");
    await waitTask(apiBase, node, upid, auth, dispatcher);

    // Configure
    const ipConfig0 = `ip=${ipPrimary}/32,gw=${gateway}`;
    const nameservers = `${dns1}${dns2 ? ` ${dns2}` : ""}`;
    await postForm(
      apiBase,
      `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${newid}/config`,
      {
        cores: cpuCores,
        memory: memoryMB,
        onboot: 1,
        ciuser: "ubuntu",
        cipassword: sshPassword,
        ide2: `${storage}:cloudinit`,
        nameserver: nameservers,
        net0: `virtio=${macAddress},bridge=${bridge}`,
        ipconfig0: ipConfig0,
      },
      auth,
      dispatcher
    );

    if (diskGB && diskGB > 0) {
      try {
        await postForm(
          apiBase,
          `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${newid}/resize`,
          { disk: "scsi0", size: `+${diskGB}G` } as any,
          auth,
          dispatcher
        );
      } catch {}
    }

    const startRes = await postForm(
      apiBase,
      `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${newid}/status/start`,
      {},
      auth,
      dispatcher
    );
    const startUpid = (startRes as any)?.data;
    if (startUpid) await waitTask(apiBase, node, startUpid, auth, dispatcher, 60000).catch(() => {});

    let details: any = null;
    try {
      const cur = await fetchJson(apiBase, `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${newid}/status/current`, auth, dispatcher);
      details = (cur as any)?.data ?? cur;
    } catch {}

    const responsePayload = {
      ok: true,
      node,
      vmid: newid,
      name: hostname,
      ip: ipPrimary,
      os,
      location: hostId,
      specs: { cpuCores, memoryMB, diskGB },
      status: details?.status || "starting",
      details,
      ssh: { username: "ubuntu", port: 22 },
    } as const;

    try {
      if (reservationId != null) {
        const { error: updErr } = await supabase
          .from("servers")
          .update({ vmid: newid, status: responsePayload.status, details })
          .eq("id", reservationId);
        if (updErr) db.error = updErr.message; else db.saved = true;
      }
    } catch (e: any) {
      db.error = e?.message || String(e);
    }

    return Response.json({ ...responsePayload, db });
  } catch (e: any) {
    try {
      if (reservationId != null) {
        await supabase
          .from("servers")
          .update({ status: "failed", details: { error: e?.message } as any })
          .eq("id", reservationId);
      }
    } catch {}
    return Response.json({ ok: false, error: e?.message, errorDetails: serializeError(e) }, { status: 500 });
  }
}
