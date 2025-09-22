import { NextRequest } from "next/server";
import { Agent as UndiciAgent } from "undici";
export const dynamic = "force-dynamic";

type ProxmoxVM = {
  type: "qemu" | "lxc";
  vmid: number;
  name?: string;
  status?: string;
  node: string;
  [key: string]: any;
};

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

function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
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

export async function GET(_req: NextRequest) {
  const host = process.env.PROXMOX_HOST?.replace(/\/$/, "");
  if (!host) {
    return Response.json(
      { ok: false, error: "PROXMOX_HOST not configured" },
      { status: 500 }
    );
  }

  const allowInsecure = process.env.PROXMOX_ALLOW_INSECURE_TLS === "true";
  const dispatcher = allowInsecure
    ? new UndiciAgent({ connect: { rejectUnauthorized: false } })
    : undefined;

  // Use HTTPS for authenticated calls to avoid header drop on redirects
  const apiBase = host.startsWith("http:") ? host.replace(/^http:/, "https:") : host;

  const result: any = {
    ok: false,
    host,
    auth: { method: null as null | "token" | "password", authenticated: false },
    nodes: [] as string[],
    vms: [] as ProxmoxVM[],
  };

  const tokenId = process.env.PROXMOX_TOKEN_ID;
  const tokenSecret = process.env.PROXMOX_TOKEN_SECRET;
  const username = process.env.PROXMOX_USERNAME;
  const password = process.env.PROXMOX_PASSWORD;

  const fetchJson = async (path: string, init?: RequestInit) => {
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
  };

  const getNodes = async (init?: RequestInit) => {
    const json = await fetchJson(`/api2/json/nodes`, init);
    const data = (json as any)?.data ?? json;
    return Array.isArray(data) ? data : [];
  };

  const getNodeVMs = async (node: string, init?: RequestInit) => {
    const [qemuJson, lxcJson] = await Promise.all([
      fetchJson(`/api2/json/nodes/${encodeURIComponent(node)}/qemu`, init),
      fetchJson(`/api2/json/nodes/${encodeURIComponent(node)}/lxc`, init),
    ]);
    const qemus = (((qemuJson as any)?.data ?? qemuJson) as any[]).map((vm: any) => ({
      ...vm,
      node,
      type: "qemu" as const,
    }));
    const lxcs = (((lxcJson as any)?.data ?? lxcJson) as any[]).map((ct: any) => ({
      ...ct,
      node,
      type: "lxc" as const,
    }));
    return [...qemus, ...lxcs] as ProxmoxVM[];
  };

  // Attempt token auth first
  if (tokenId && tokenSecret) {
    try {
      result.auth.method = "token";
      const headers = { Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}` } as HeadersInit;
      const nodes = await getNodes({ headers });
      result.nodes = nodes.map((n: any) => n.node || n.id || n.name).filter(Boolean);
      const preferredNode = process.env.PROXMOX_NODE;
      if (preferredNode) {
        const filtered = result.nodes.filter((n: string) => String(n) === preferredNode);
        if (filtered.length > 0) result.nodes = filtered;
      }
      const all = (
        await Promise.all(
          result.nodes.map((n: string) => getNodeVMs(n, { headers }))
        )
      ).flat();
      result.vms = all;
      result.auth = { method: "token", authenticated: true } as any;
      result.ok = true;
      return Response.json(result);
    } catch (e: any) {
      result.auth = {
        method: "token",
        authenticated: false,
        error: e?.message,
        errorDetails: serializeError(e),
      } as any;
    }
  }

  // Fallback to password auth
  if (username && password) {
    try {
      result.auth.method = "password";
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
      if (!ticket) throw new Error("Missing PVE ticket in response");

      const cookie = `PVEAuthCookie=${ticket}`;
      const headers = { Cookie: cookie } as HeadersInit;
      const nodes = await getNodes({ headers });
      result.nodes = nodes.map((n: any) => n.node || n.id || n.name).filter(Boolean);
      const preferredNode = process.env.PROXMOX_NODE;
      if (preferredNode) {
        const filtered = result.nodes.filter((n: string) => String(n) === preferredNode);
        if (filtered.length > 0) result.nodes = filtered;
      }
      const all = (
        await Promise.all(
          result.nodes.map((n: string) => getNodeVMs(n, { headers }))
        )
      ).flat();
      result.vms = all;
      result.auth = { method: "password", authenticated: true } as any;
      result.ok = true;
      return Response.json(result);
    } catch (e: any) {
      result.auth = {
        method: "password",
        authenticated: false,
        error: e?.message,
        errorDetails: serializeError(e),
      } as any;
    }
  }

  return Response.json(
    { ...result, error: result.auth?.error || "Authentication to Proxmox failed" },
    { status: 401 }
  );
}
