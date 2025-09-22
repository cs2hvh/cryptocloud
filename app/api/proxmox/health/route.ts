import { NextRequest } from "next/server";
import { Agent as UndiciAgent } from "undici";

type ProxmoxVersion = {
  version: string;
  release: string;
  repoid?: string;
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

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function withTimeout<T>(p: Promise<T>, ms = 7000): Promise<T> {
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

  // Use HTTPS directly for any credentialed requests to avoid
  // redirect dropping headers (Cookie/Authorization) on scheme change.
  const apiBase = host.startsWith("http:") ? host.replace(/^http:/, "https:") : host;

  const result: any = {
    ok: false,
    host,
    reachable: false,
    version: null as ProxmoxVersion | null,
    auth: { method: null as null | "token" | "password", authenticated: false },
    nodes: null as null | unknown,
  };

  // Optional: allow self-signed TLS for HTTPS when flag enabled.
  // We use undici's dispatcher so redirects to HTTPS are also covered.
  const allowInsecure = process.env.PROXMOX_ALLOW_INSECURE_TLS === "true";
  const dispatcher = allowInsecure
    ? new UndiciAgent({ connect: { rejectUnauthorized: false } })
    : undefined;

  try {
    // Basic reachability check (no auth required)
    const versionRes = await withTimeout(
      fetch(`${host}/api2/json/version`, {
        cache: "no-store",
        redirect: "follow",
        // @ts-expect-error undici dispatcher
        dispatcher,
      })
    );
    // Any HTTP response means the host is reachable (even 401)
    result.reachable = true;
    // Surface redirect info (e.g., HTTP -> HTTPS)
    if (versionRes.status >= 300 && versionRes.status < 400) {
      const loc = versionRes.headers.get("location");
      (result as any).redirect = { status: versionRes.status, location: loc };
    }
    if (versionRes.ok) {
      const versionJson = (await versionRes.json()) as { data?: ProxmoxVersion };
      if (versionJson?.data) result.version = versionJson.data;
    } else {
      let text = "";
      try { text = await versionRes.text(); } catch {}
      // Do not exit early; continue to try authentication.
      (result as any).versionCheck = {
        ok: false,
        status: versionRes.status,
        details: text?.slice(0, 500),
      };
    }
  } catch (e: any) {
    return Response.json(
      {
        ...result,
        error: `Failed to reach Proxmox host: ${e?.message || e}`,
        errorDetails: serializeError(e),
      },
      { status: 502 }
    );
  }

  // Try token-based auth first, then password-based
  const tokenId = process.env.PROXMOX_TOKEN_ID;
  const tokenSecret = process.env.PROXMOX_TOKEN_SECRET;
  const username = process.env.PROXMOX_USERNAME;
  const password = process.env.PROXMOX_PASSWORD;

  // Helper to GET nodes
  const getNodes = async (init?: RequestInit) => {
    const res = await withTimeout(
      fetch(`${apiBase}/api2/json/nodes`, {
        cache: "no-store",
        redirect: "follow",
        ...(init || {}),
        // @ts-expect-error undici dispatcher
        dispatcher,
      })
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`nodes request failed (${res.status}): ${text}`);
    }
    const json = await res.json();
    return json?.data ?? json;
  };

  // Attempt token auth
  if (tokenId && tokenSecret) {
    try {
      result.auth.method = "token";
      const headers = {
        Authorization: `PVEAPIToken=${tokenId}=${tokenSecret}`,
      } as HeadersInit;
      const nodes = await getNodes({ headers });
      // Clear any previous error details from earlier attempts
      result.auth = { method: "token", authenticated: true } as any;
      result.nodes = nodes;
      result.ok = true;
      return Response.json(result);
    } catch (e: any) {
      // fall through to password auth
      result.auth = {
        method: "token",
        authenticated: false,
        error: e?.message,
        // include exact error details for debugging
        errorDetails: serializeError(e),
      } as any;
    }
  }

  // Attempt password auth
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
      const nodes = await getNodes({ headers: { Cookie: cookie } });
      // Clear any previous error details from earlier attempts
      result.auth = { method: "password", authenticated: true } as any;
      result.nodes = nodes;
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

  // If we got here, auth attempts failed
  return Response.json(
    { ...result, error: result.auth?.error || "Authentication to Proxmox failed" },
    { status: 401 }
  );
}
