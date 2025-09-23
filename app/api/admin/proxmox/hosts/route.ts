import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function getBearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7) : undefined;
}

async function requireAdmin(req: NextRequest) {
  const bearer = getBearer(req);
  const supabase = createServerSupabase(bearer);
  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email || "";

  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (admins.length > 0 && !admins.includes(email.toLowerCase())) {
    return { ok: false as const, email, isAdmin: false };
  }
  return { ok: true as const, email, isAdmin: true };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });
  }

  const supabase = createServerSupabase();
  const { data: hosts, error } = await supabase
    .from("proxmox_hosts")
    .select(`
      id, name, host_url, allow_insecure_tls, node, storage, bridge, template_vmid, template_os, location,
      gateway_ip, dns_primary, dns_secondary, is_active, created_by_email, created_at, updated_at,
      public_ip_pools ( id, mac, public_ip_pool_ips ( id, ip ) ),
      proxmox_templates ( id, name, vmid, type, is_active )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, hosts: hosts || [] });
}

type HostInput = {
  id?: string;
  name: string;
  hostUrl: string;
  location?: string; // enum slug
  allowInsecureTls?: boolean;
  auth?: { method: "token" | "password"; tokenId?: string; tokenSecret?: string; username?: string; password?: string };
  node: string;
  storage?: string;
  bridge?: string;
  templateVmid?: number;
  templateOS?: string;
  templates?: Array<{ id?: number; name: string; vmid: number; type?: 'qemu' | 'lxc'; isActive?: boolean }>;
  network?: { gatewayIp?: string; dnsPrimary?: string; dnsSecondary?: string };
  pools?: Array<{ mac: string; ips: string[]; label?: string }>;
  isActive?: boolean;
};

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as HostInput;
  if (!body?.name || !body?.hostUrl || !body?.node) {
    return Response.json({ ok: false, error: "name, hostUrl and node are required" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const payload: any = {
    id: body.id || undefined,
    name: body.name,
    host_url: body.hostUrl,
    location: body.location ?? null,
    allow_insecure_tls: !!body.allowInsecureTls,
    node: body.node,
    storage: body.storage || "local",
    bridge: body.bridge || "vmbr0",
    template_vmid: body.templateVmid ?? null,
    template_os: body.templateOS ?? null,
    gateway_ip: body.network?.gatewayIp ?? null,
    dns_primary: body.network?.dnsPrimary ?? null,
    dns_secondary: body.network?.dnsSecondary ?? null,
    is_active: body.isActive ?? true,
    created_by_email: gate.email || null,
  };

  // Always accept both token and username/password
  payload.token_id = (body as any).tokenId ?? payload.token_id ?? null;
  payload.token_secret = (body as any).tokenSecret ?? payload.token_secret ?? null;
  payload.username = (body as any).username ?? payload.username ?? null;
  payload.password = (body as any).password ?? payload.password ?? null;

  const { data: upserted, error: upsertErr } = await supabase
    .from("proxmox_hosts")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (upsertErr) {
    return Response.json({ ok: false, error: upsertErr.message }, { status: 500 });
  }

  const hostId = upserted?.id as string;
  const pools = (body.pools || []).filter((p) => p?.mac).map((p) => ({ mac: String(p.mac), ips: (p.ips || []).filter(Boolean), label: p.label || null }));

  // Sync pools: create/update pools by (host_id, mac), then sync their IP lists; delete pools not present
  // Get existing pools
  const { data: existingPools } = await supabase
    .from("public_ip_pools")
    .select("id, mac")
    .eq("host_id", hostId);
  const existingMap = new Map<string, number>();
  for (const p of existingPools || []) existingMap.set(String((p as any).mac), Number((p as any).id));

  const incomingMacs = new Set(pools.map((p) => p.mac));

  // Delete pools that are no longer present
  for (const [mac, id] of existingMap.entries()) {
    if (!incomingMacs.has(mac)) {
      await supabase.from("public_ip_pools").delete().eq("id", id);
    }
  }

  // Upsert each incoming pool and its IPs
  for (const pool of pools) {
    let poolId = existingMap.get(pool.mac);
    if (!poolId) {
      const { data: inserted, error: insErr } = await supabase
        .from("public_ip_pools")
        .insert({ host_id: hostId, mac: pool.mac, label: pool.label || null })
        .select("id")
        .single();
      if (insErr) return Response.json({ ok: false, error: insErr.message }, { status: 500 });
      poolId = Number((inserted as any)?.id);
    } else {
      // Update label if provided
      if (pool.label !== undefined) {
        await supabase.from("public_ip_pools").update({ label: pool.label }).eq("id", poolId);
      }
    }

    // Sync IPs for this pool
    const { data: existingIps } = await supabase
      .from("public_ip_pool_ips")
      .select("id, ip")
      .eq("pool_id", poolId);
    const existingIpSet = new Set((existingIps || []).map((r: any) => String(r.ip)));
    const incomingIpSet = new Set(pool.ips.map((s) => String(s)));

    // Insert missing
    const toInsert = pool.ips.filter((ip) => !existingIpSet.has(String(ip))).map((ip) => ({ pool_id: poolId!, ip: String(ip) }));
    if (toInsert.length > 0) await supabase.from("public_ip_pool_ips").insert(toInsert);

    // Delete removed
    const toDelete = [...existingIpSet].filter((ip) => !incomingIpSet.has(ip));
    if (toDelete.length > 0) await supabase.from("public_ip_pool_ips").delete().eq("pool_id", poolId).in("ip", toDelete as any);
  }

  // Sync templates
  const templates = (body.templates || []).filter((t) => t?.name && t?.vmid).map((t) => ({
    name: String(t.name),
    vmid: Number(t.vmid),
    type: t.type === 'lxc' ? 'lxc' : 'qemu',
    is_active: t.isActive ?? true,
  }));
  const { data: existingTpls } = await supabase
    .from('proxmox_templates')
    .select('id, name')
    .eq('host_id', hostId);
  const existingTplMap = new Map<string, number>();
  for (const t of existingTpls || []) existingTplMap.set(String((t as any).name).toLowerCase(), Number((t as any).id));

  const incomingNames = new Set(templates.map((t) => t.name.toLowerCase()))
  // Delete missing templates
  for (const [name, id] of existingTplMap.entries()) {
    if (!incomingNames.has(name)) await supabase.from('proxmox_templates').delete().eq('id', id);
  }
  // Upsert templates by (host_id, name)
  for (const t of templates) {
    const existingId = existingTplMap.get(t.name.toLowerCase());
    if (existingId) {
      await supabase.from('proxmox_templates').update({ vmid: t.vmid, type: t.type, is_active: t.is_active }).eq('id', existingId);
    } else {
      await supabase.from('proxmox_templates').insert({ host_id: hostId, name: t.name, vmid: t.vmid, type: t.type, is_active: t.is_active });
    }
  }

  return Response.json({ ok: true, id: hostId });
}
