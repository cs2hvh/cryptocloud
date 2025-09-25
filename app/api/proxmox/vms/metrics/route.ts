import { NextRequest } from "next/server";
import { Agent as UndiciAgent } from "undici";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type HostConfig = {
  id: string;
  host_url: string;
  allow_insecure_tls: boolean;
  token_id: string | null;
  token_secret: string | null;
  username: string | null;
  password: string | null;
};

function getBearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7) : undefined;
}

function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("Request timed out")), ms);
    p.then((v) => { clearTimeout(id); resolve(v); })
     .catch((e) => { clearTimeout(id); reject(e); });
  });
}

async function proxmoxHeaders(apiBase: string, dispatcher: any, cfg: HostConfig) {
  const tokenId = cfg.token_id || undefined;
  const tokenSecret = cfg.token_secret || undefined;
  const username = cfg.username || undefined;
  const password = cfg.password || undefined;
  if (tokenId && tokenSecret) {
    const headers = { Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}` } as HeadersInit;
    // quick verify
    try {
      const res = await withTimeout(fetch(`${apiBase}/api2/json/nodes`, { cache: "no-store", headers, redirect: "follow", // @ts-expect-error
        dispatcher }));
      if (res.ok) return headers;
    } catch {}
  }
  if (!username || !password) throw new Error("Missing Proxmox credentials");
  const body = new URLSearchParams({ username, password });
  const ticketRes = await withTimeout(fetch(`${apiBase}/api2/json/access/ticket`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, redirect: "follow", // @ts-expect-error
    dispatcher }));
  if (!ticketRes.ok) {
    const t = await ticketRes.text();
    throw new Error(`login failed (${ticketRes.status}): ${t}`);
  }
  const json = await ticketRes.json();
  const ticket = json?.data?.ticket as string | undefined;
  const csrf = json?.data?.CSRFPreventionToken as string | undefined;
  if (!ticket || !csrf) throw new Error("Missing ticket/CSRF token");
  return { Cookie: `PVEAuthCookie=${ticket}`, CSRFPreventionToken: csrf } as HeadersInit;
}

export async function GET(req: NextRequest) {
  const bearer = getBearer(req);
  if (!bearer) return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const serverId = url.searchParams.get("serverId");
  const range = (url.searchParams.get("range") || "hour").toLowerCase(); // hour|day|week|month|year
  if (!serverId) return Response.json({ ok: false, error: "serverId required" }, { status: 400 });

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authClient = createClient(sbUrl, anon, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${bearer}` } as any } } as any);
  const { data: userData } = await authClient.auth.getUser();
  const userId = userData?.user?.id as string | undefined;
  if (!userId) return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  // Use service role key for database operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json({ ok: false, error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: server, error: serverErr } = await supabase
    .from("servers")
    .select("id, vmid, node, location")
    .eq("id", serverId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (serverErr) return Response.json({ ok: false, error: serverErr.message }, { status: 500 });
  if (!server) return Response.json({ ok: false, error: "Server not found" }, { status: 404 });

  const vmid = (server as any).vmid as number | undefined;
  const node = (server as any).node as string | undefined;
  const hostId = (server as any).location as string | undefined;
  if (!vmid || !node || !hostId) return Response.json({ ok: false, error: "Missing vmid/node/location" }, { status: 400 });

  const { data: host, error: hostErr } = await supabase
    .from("proxmox_hosts")
    .select("id, host_url, allow_insecure_tls, token_id, token_secret, username, password")
    .eq("id", hostId)
    .maybeSingle();
  if (hostErr) return Response.json({ ok: false, error: hostErr.message }, { status: 500 });
  if (!host) return Response.json({ ok: false, error: "Host not found" }, { status: 404 });

  const cfg = host as HostConfig;
  const dispatcher = cfg.allow_insecure_tls ? new UndiciAgent({ connect: { rejectUnauthorized: false } }) : undefined;
  const apiBase = cfg.host_url.startsWith("http:") ? cfg.host_url.replace(/^http:/, "https:") : cfg.host_url;

  try {
    const headers = await proxmoxHeaders(apiBase, dispatcher, cfg);
    const params = new URLSearchParams({ timeframe: range as any, cf: "AVERAGE" });
    const res = await withTimeout(fetch(`${apiBase}/api2/json/nodes/${encodeURIComponent(node)}/qemu/${vmid}/rrddata?${params.toString()}`, {
      cache: "no-store",
      headers: headers as any,
      redirect: "follow",
      // @ts-expect-error
      dispatcher,
    }));
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`rrddata failed (${res.status}): ${text}`);
    }
    const json = await res.json();
    const points = ((json as any)?.data || []) as Array<any>;
    // Normalize
    const series = points.map((p) => ({
      t: Number(p?.time) * 1000,
      cpu: typeof p?.cpu === "number" ? p.cpu * 100 : null,
      memUsed: typeof p?.mem === "number" && typeof p?.maxmem === "number" && p.maxmem > 0 ? (p.mem / p.maxmem) * 100 : null,
      netIn: typeof p?.netin === "number" ? p.netin : null,
      netOut: typeof p?.netout === "number" ? p.netout : null,
      diskRead: typeof p?.diskread === "number" ? p.diskread : null,
      diskWrite: typeof p?.diskwrite === "number" ? p.diskwrite : null,
    }));
    return Response.json({ ok: true, series });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

