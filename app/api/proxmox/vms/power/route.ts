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

function withTimeout<T>(p: Promise<T>, ms = 60000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("Request timed out")), ms);
    p.then((v) => { clearTimeout(id); resolve(v); })
     .catch((e) => { clearTimeout(id); reject(e); });
  });
}

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

export async function POST(req: NextRequest) {
  const bearer = getBearer(req);
  if (!bearer) return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  // Use anon-key auth client to read user from the bearer token reliably
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authClient = createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${bearer}` } as any },
  } as any);
  const { data: userData } = await authClient.auth.getUser();
  const userId = userData?.user?.id as string | undefined;
  if (!userId) return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as any;
  const action = String(body.action || '').toLowerCase();
  const serverId = body.serverId as string;
  if (!serverId || !['start', 'stop', 'reboot'].includes(action)) {
    return Response.json({ ok: false, error: "serverId and valid action (start|stop|reboot) are required" }, { status: 400 });
  }

  // Load server owned by this user
  // Use server-role client for DB access
  const supabase = createServerSupabase();
  const { data: server, error: serverErr } = await supabase
    .from('servers')
    .select('id, vmid, node, location')
    .eq('id', serverId)
    .eq('owner_id', userId)
    .maybeSingle();
  if (serverErr) return Response.json({ ok: false, error: serverErr.message }, { status: 500 });
  if (!server) return Response.json({ ok: false, error: "Server not found" }, { status: 404 });

  const vmid = (server as any).vmid as number | undefined;
  const node = (server as any).node as string | undefined;
  const hostId = (server as any).location as string | undefined;
  if (!vmid || !node || !hostId) return Response.json({ ok: false, error: "Missing vmid/node/location" }, { status: 400 });

  const { data: host, error: hostErr } = await supabase
    .from('proxmox_hosts')
    .select('id, host_url, allow_insecure_tls, token_id, token_secret, username, password')
    .eq('id', hostId)
    .maybeSingle();
  if (hostErr) return Response.json({ ok: false, error: hostErr.message }, { status: 500 });
  if (!host) return Response.json({ ok: false, error: "Host not found" }, { status: 404 });

  const cfg = host as HostConfig;
  const allowInsecure = !!cfg.allow_insecure_tls;
  const dispatcher = allowInsecure ? new UndiciAgent({ connect: { rejectUnauthorized: false } }) : undefined;
  const apiBase = cfg.host_url.startsWith('http:') ? cfg.host_url.replace(/^http:/, 'https:') : cfg.host_url;

  try {
    const auth = await proxmoxAuthCookie(apiBase, dispatcher, cfg);

    let path = '';
    if (action === 'start') path = `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/start`;
    else if (action === 'stop') path = `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/shutdown`;
    else if (action === 'reboot') path = `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/reboot`;

    const res = await postForm(apiBase, path, { timeout: 60 }, auth, dispatcher);
    const upid = (res as any)?.data;
    // Don't block too long; fire-and-check quickly
    if (upid) {
      try {
        await withTimeout(
          fetch(`${apiBase}/api2/json/nodes/${encodeURIComponent(node)}/tasks/${encodeURIComponent(upid)}/status`, {
            cache: 'no-store',
            headers: auth.headers as any,
            // @ts-expect-error
            dispatcher,
          }),
          8000
        );
      } catch {}
    }

    // Attempt to read current status to reflect in DB
    let status = undefined as string | undefined;
    try {
      const cur = await withTimeout(
        fetch(`${apiBase}/api2/json/nodes/${encodeURIComponent(node)}/qemu/${vmid}/status/current`, {
          cache: 'no-store',
          headers: auth.headers as any,
          // @ts-expect-error
          dispatcher,
        }),
        8000
      );
      if (cur.ok) {
        const json = await cur.json();
        const data = (json as any)?.data ?? json;
        status = data?.status as string | undefined;
      }
    } catch {}

    try {
      if (status) {
        await supabase.from('servers').update({ status }).eq('id', serverId);
      }
    } catch {}

    return Response.json({ ok: true, action, vmid, node, status: status || null });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
