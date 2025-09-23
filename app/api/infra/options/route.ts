import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
export const dynamic = "force-dynamic";

type Location = { id: string; name: string; host: string };

export async function GET(_req: NextRequest) {
  const supabase = createServerSupabase();

  const { data: hosts, error: hostsErr } = await supabase
    .from("proxmox_hosts")
    .select("id,name,host_url,is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (hostsErr) {
    return Response.json({ ok: false, error: hostsErr.message }, { status: 500 });
  }

  const locations: Location[] = (hosts || []).map((h: any) => ({
    id: h.id,
    name: h.name || h.host_url || h.id,
    host: h.host_url,
  }));

  // Build OS list from templates across active hosts (unique by name)
  let os: Array<{ id: string; name: string }> = [];
  try {
    const { data: tpls } = await supabase
      .from('proxmox_templates')
      .select('name, is_active');
    const seen = new Set<string>();
    for (const t of tpls || []) {
      if ((t as any).is_active === false) continue;
      const name = String((t as any).name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      os.push({ id: name, name });
    }
    if (os.length === 0) os = [{ id: 'Ubuntu 24.04 LTS', name: 'Ubuntu 24.04 LTS' }];
  } catch {
    os = [{ id: 'Ubuntu 24.04 LTS', name: 'Ubuntu 24.04 LTS' }];
  }

  // Unassigned IPs across all hosts
  let usedIps = new Set<string>();
  try {
    const { data } = await supabase.from("servers").select("ip");
    for (const r of data || []) if (r?.ip) usedIps.add(String(r.ip));
  } catch {}

  let ips: Array<{ id: string; ip: string; mac: string | null; hostId: string }> = [];
  try {
    // Join pools and ip rows
    const { data: pools } = await supabase
      .from("public_ip_pools")
      .select("id, host_id, mac, public_ip_pool_ips ( id, ip )");
    for (const p of pools || []) {
      const mac = (p as any).mac as string | null;
      const hostId = String((p as any).host_id);
      const rows = ((p as any).public_ip_pool_ips || []) as Array<{ id: number; ip: string }>;
      for (const r of rows) {
        const ip = String(r.ip);
        if (!usedIps.has(ip)) ips.push({ id: String(r.id), ip, mac, hostId });
      }
    }
  } catch {}

  return Response.json({ ok: true, locations, os, ips });
}
