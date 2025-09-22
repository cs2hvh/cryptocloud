import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
export const dynamic = "force-dynamic";



type Location = {
  id: string;
  name: string;
  host: string;
};

export async function GET(_req: NextRequest) {
  const host = process.env.PROXMOX_HOST?.replace(/\/$/, "");

  const locations: Location[] = host
    ? [
        {
          id: "dev-1",
          name: "Dev Host",
          host,
        },
      ]
    : [];

  const os = [
    { id: "ubuntu-24", name: "Ubuntu 24.04 LTS" },
  ];

  const ipsAll = [
    ...(process.env.PUBLIC_IP_1
      ? [
          {
            id: "ip1",
            ip: process.env.PUBLIC_IP_1,
            mac: process.env.PUBLIC_IP_1_MAC || null,
          },
        ]
      : []),
    ...(process.env.PUBLIC_IP_2
      ? [
          {
            id: "ip2",
            ip: process.env.PUBLIC_IP_2,
            mac: process.env.PUBLIC_IP_2_MAC || process.env.PUBLIC_IP_1_MAC || null,
          },
        ]
      : []),
  ];

  // Filter out IPs already assigned to a server
  let usedIps = new Set<string>();
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from("servers").select("ip");
    if (!error && Array.isArray(data)) {
      for (const row of data) if (row?.ip) usedIps.add(String(row.ip));
    }
  } catch {}

  const ips = ipsAll.filter((i) => i.ip && !usedIps.has(String(i.ip)));

  return Response.json({ ok: true, locations, os, ips });
}
