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
    p.then((v) => {
      clearTimeout(id);
      resolve(v);
    }).catch((e) => {
      clearTimeout(id);
      reject(e);
    });
  });
}

async function proxmoxAuthCookie(apiBase: string, dispatcher?: any) {
  const tokenId = process.env.PROXMOX_TOKEN_ID;
  const tokenSecret = process.env.PROXMOX_TOKEN_SECRET;
  const username = process.env.PROXMOX_USERNAME;
  const password = process.env.PROXMOX_PASSWORD;

  // Try token first if present, verify with a lightweight API call
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
      // fallthrough to password on non-OK (e.g., 401)
    } catch {
      // fallthrough to password
    }
  }

  if (!username || !password) throw new Error("Missing PROXMOX_USERNAME or PROXMOX_PASSWORD");

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
  const host = process.env.PROXMOX_HOST?.replace(/\/$/, "");
  if (!host) return Response.json({ ok: false, error: "PROXMOX_HOST not configured" }, { status: 500 });

  const allowInsecure = process.env.PROXMOX_ALLOW_INSECURE_TLS === "true";
  const dispatcher = allowInsecure ? new UndiciAgent({ connect: { rejectUnauthorized: false } }) : undefined;
  const apiBase = host.startsWith("http:") ? host.replace(/^http:/, "https:") : host;

  const body = (await req.json().catch(() => ({}))) as any;
  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : undefined;
  const node = process.env.PROXMOX_NODE || body.node;
  const storage = process.env.PROXMOX_STORAGE || body.storage || "local";
  const bridge = process.env.PROXMOX_BRIDGE || body.bridge || "vmbr0";
  const gateway = process.env.GATEWAY_IP;
  const dns1 = process.env.DNS_PRIMARY || "8.8.8.8";
  const dns2 = process.env.DNS_SECONDARY || "1.1.1.1";

  const hostname = body.hostname || `vm-${Date.now()}`;
  const sshPassword = body.sshPassword as string | undefined;
  let ipPrimary = (body.ipPrimary as string | undefined) ?? undefined;
  let macAddress = (body.mac as string | undefined) ?? undefined;
  const cpuCores = Number(body.cpuCores || 2);
  const memoryMB = Number(body.memoryMB || 2048);
  const diskGB = body.diskGB ? Number(body.diskGB) : undefined; // optional

  const os = body.os || "ubuntu-24";

  if (!node) return Response.json({ ok: false, error: "Missing node configuration (PROXMOX_NODE)" }, { status: 400 });
  if (!sshPassword) return Response.json({ ok: false, error: "sshPassword is required" }, { status: 400 });

  // Auto-assign next available IP from env pool if not provided
  try {
    const supabase = createServerSupabase(bearer);
    const ipPool: Array<{ ip: string; mac: string | null }> = [];
    if (process.env.PUBLIC_IP_1) ipPool.push({ ip: String(process.env.PUBLIC_IP_1), mac: process.env.PUBLIC_IP_1_MAC || null });
    if (process.env.PUBLIC_IP_2) ipPool.push({ ip: String(process.env.PUBLIC_IP_2), mac: process.env.PUBLIC_IP_2_MAC || process.env.PUBLIC_IP_1_MAC || null });
    // Future: add PUBLIC_IP_3..N if present
    const { data } = await supabase.from('servers').select('ip');
    const used = new Set<string>((data || []).map((r: any) => String(r.ip)));
    const available = ipPool.filter((c) => c.ip && !used.has(String(c.ip)));
    if (!ipPrimary) ipPrimary = available[0]?.ip;
    if (!macAddress) {
      const found = ipPool.find((c) => c.ip === ipPrimary);
      macAddress = found?.mac || process.env.PUBLIC_IP_1_MAC || process.env.PUBLIC_IP_2_MAC || undefined;
    }
  } catch {}

  if (!ipPrimary || !gateway) return Response.json({ ok: false, error: "No available IPs or gateway missing" }, { status: 409 });
  if (!macAddress) return Response.json({ ok: false, error: "MAC address required for routed IP" }, { status: 400 });

  const templateVmidFromEnv = process.env.PROXMOX_TEMPLATE_VMID; // preferred

  // Reserve IP in DB before provisioning to avoid reuse
  let reservationId: number | null = null;
  let db = { saved: false as boolean, id: null as null | number, error: null as null | string };
  try {
    const supabase = createServerSupabase(bearer);
    // Optional pre-check for clarity (unique index will still protect in race)
    const { data: existing } = await supabase
      .from('servers')
      .select('id')
      .eq('ip', ipPrimary)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return Response.json({ ok: false, error: 'IP already in use' }, { status: 409 });
    }
    const { data: inserted, error: insertErr } = await supabase
      .from('servers')
      .insert({
        // Use placeholder VMID to satisfy possible NOT NULL constraints
        vmid: 0,
        node,
        name: hostname,
        ip: ipPrimary,
        os,
        location: body.location,
        cpu_cores: cpuCores,
        memory_mb: memoryMB,
        disk_gb: diskGB ?? null,
        status: 'provisioning',
        details: null,
        owner_id: body.ownerId || null,
        owner_email: body.ownerEmail || null,
      })
      .select('id')
      .single();
    if (insertErr) {
      db.error = insertErr.message;
      // If unique constraint exists, surface conflict
      if (insertErr.message?.toLowerCase().includes('duplicate') || (insertErr as any).code === '23505') {
        return Response.json({ ok: false, error: 'IP already in use' }, { status: 409 });
      }
      return Response.json({ ok: false, error: 'Failed to reserve IP', db }, { status: 500 });
    }
    reservationId = (inserted as any)?.id ?? null;
    db.saved = true;
    db.id = reservationId;
  } catch (e: any) {
    db.error = e?.message || String(e);
    return Response.json({ ok: false, error: 'DB reservation failed', db }, { status: 500 });
  }

  try {
    const auth = await proxmoxAuthCookie(apiBase, dispatcher);

    // Resolve template vmid
    let templateVmid = templateVmidFromEnv ? Number(templateVmidFromEnv) : undefined;
    if (!templateVmid) {
      // Try to find a template that looks like Ubuntu 24 on the node
      const listJson = await fetchJson(apiBase, `/api2/json/nodes/${encodeURIComponent(node)}/qemu`, auth, dispatcher);
      const vms = ((listJson as any)?.data ?? listJson) as any[];
      const guess = vms.find((v) => String(v?.name || "").toLowerCase().includes("ubuntu") && String(v?.name || "").includes("24"));
      if (guess?.vmid) templateVmid = Number(guess.vmid);
    }
    if (!templateVmid) {
      return Response.json(
        { ok: false, error: "Set PROXMOX_TEMPLATE_VMID to your Ubuntu 24 template VMID" },
        { status: 400 }
      );
    }

    // Get next available VMID
    const nextIdJson = await fetchJson(apiBase, "/api2/json/cluster/nextid", auth, dispatcher);
    const newid = Number(((nextIdJson as any)?.data ?? nextIdJson) as string);

    // Clone template
    const cloneRes = await postForm(
      apiBase,
      `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${templateVmid}/clone`,
      {
        newid,
        name: hostname,
        full: 1,
        target: node,
        storage,
      },
      auth,
      dispatcher
    );
    const upid = (cloneRes as any)?.data;
    if (!upid) throw new Error("clone did not return task id");
    await waitTask(apiBase, node, upid, auth, dispatcher);

    // Configure VM (cloud-init, network, CPU/RAM)
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
        // ensure cloud-init drive is attached so options take effect
        ide2: `${storage}:cloudinit`,
        nameserver: nameservers,
        net0: `virtio=${macAddress},bridge=${bridge}`,
        ipconfig0: ipConfig0,
      },
      auth,
      dispatcher
    );

    // Optional disk resize
    if (diskGB && diskGB > 0) {
      try {
        await postForm(
          apiBase,
          `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${newid}/resize`,
          {
            disk: "scsi0",
            size: `+${diskGB}G`,
          } as any,
          auth,
          dispatcher
        );
      } catch (e) {
        // ignore resize errors for now (template may already be larger)
      }
    }

    // Start VM
    const startRes = await postForm(
      apiBase,
      `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${newid}/status/start`,
      {},
      auth,
      dispatcher
    );
    const startUpid = (startRes as any)?.data;
    if (startUpid) await waitTask(apiBase, node, startUpid, auth, dispatcher, 60000).catch(() => {});

    // Fetch current status/details
    let details: any = null;
    try {
      const cur = await fetchJson(
        apiBase,
        `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${newid}/status/current`,
        auth,
        dispatcher
      );
      details = (cur as any)?.data ?? cur;
    } catch {}

    const responsePayload = {
      ok: true,
      node,
      vmid: newid,
      name: hostname,
      ip: ipPrimary,
      os,
      location: body.location,
      specs: { cpuCores, memoryMB, diskGB },
      status: details?.status || "starting",
      details,
      ssh: { username: "ubuntu", port: 22 },
    } as const;

    // Update reservation with final details (best-effort)
    try {
      if (reservationId != null) {
        const supabase = createServerSupabase(bearer);
        const { error: updErr } = await supabase
          .from('servers')
          .update({ vmid: newid, status: responsePayload.status, details })
          .eq('id', reservationId);
        if (updErr) db.error = updErr.message; else db.saved = true;
      }
    } catch (e: any) {
      db.error = e?.message || String(e);
    }

    return Response.json({ ...responsePayload, db });
  } catch (e: any) {
    // On failure, mark reservation as failed
    try {
      if (reservationId != null) {
        const supabase = createServerSupabase(bearer);
        await supabase
          .from('servers')
          .update({ status: 'failed', details: { error: e?.message } as any })
          .eq('id', reservationId);
      }
    } catch {}
    return Response.json({ ok: false, error: e?.message, errorDetails: serializeError(e) }, { status: 500 });
  }
}
