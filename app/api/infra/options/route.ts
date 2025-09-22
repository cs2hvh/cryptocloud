import { NextRequest } from "next/server";

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

  const ips = [
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

  return Response.json({ ok: true, locations, os, ips });
}

