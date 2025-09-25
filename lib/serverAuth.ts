import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabase } from "./supabaseServer";

export type AuthSuccess = {
  success: true;
  token: string;
  userId: string;
  email: string;
  isAdmin: boolean;
  supabase: SupabaseClient;
};

export type AuthFailure = {
  success: false;
  status: number;
  message: string;
};

export function getBearer(req: NextRequest): string | undefined {
  const header = req.headers.get("authorization") || "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7) : undefined;
}

type AdminList = { wildcard: boolean; emails: Set<string> };

type TokenClaims = {
  sub?: string;
  email?: string;
  exp?: number;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  role?: string;
};

type AdminCandidate = {
  email: string;
  userMetadata: Record<string, unknown>;
  appMetadata: Record<string, unknown>;
};

function envAdminEmails(): AdminList {
  const raw = (process.env.ADMIN_EMAILS || "").trim();
  if (!raw) return { wildcard: false, emails: new Set() };
  if (raw === "*") return { wildcard: true, emails: new Set() };
  const emails = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return { wildcard: false, emails: new Set(emails) };
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  if (typeof atob === "function") {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }
  throw new Error("No base64 decoder available in this environment");
}

function decodeJwt(token: string): TokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = base64UrlDecode(parts[1]);
    return JSON.parse(payload) as TokenClaims;
  } catch {
    return null;
  }
}

function claimsIndicateAdmin(candidate: AdminCandidate): boolean {
  const { userMetadata, appMetadata } = candidate;
  if (typeof userMetadata.is_admin === "boolean" && userMetadata.is_admin) return true;

  const role = appMetadata.role;
  if (typeof role === "string" && role.toLowerCase() === "admin") return true;

  const roles = appMetadata.roles;
  if (Array.isArray(roles) && roles.some((value) => typeof value === "string" && value.toLowerCase() === "admin")) {
    return true;
  }

  return false;
}

function normaliseError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export async function requireUser(req: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const token = getBearer(req);
  if (!token) {
    return { success: false, status: 401, message: "Not authenticated" };
  }

  const claims = decodeJwt(token);
  if (!claims?.sub) {
    return { success: false, status: 401, message: "Not authenticated" };
  }

  if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) {
    return { success: false, status: 401, message: "Session expired" };
  }

  const userMetadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const appMetadata = { ...(claims.app_metadata ?? {}) } as Record<string, unknown>;
  if (typeof claims.role === "string" && !appMetadata.role) {
    appMetadata.role = claims.role;
  }

  let email = typeof claims.email === "string" ? claims.email : "";
  if (!email) {
    const metaEmail = userMetadata.email || appMetadata.email;
    if (typeof metaEmail === "string") email = metaEmail;
  }

  const candidate: AdminCandidate = {
    email,
    userMetadata,
    appMetadata,
  };

  let isAdmin = claimsIndicateAdmin(candidate);

  // Prefer explicit role assignments stored in the database when available
  try {
    const roleClient = createServerSupabase();
    const { data: roleRow } = await roleClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.sub)
      .maybeSingle();
    if (roleRow?.role === "admin") {
      isAdmin = true;
    } else if (roleRow?.role === "user") {
      isAdmin = false;
    }
  } catch {
    // Ignore role lookup errors; fall back to metadata/env checks
  }

  let supabase: SupabaseClient;
  try {
    supabase = createServerSupabase(token);
  } catch (err) {
    return {
      success: false,
      status: 500,
      message: normaliseError(err),
    };
  }

  return {
    success: true,
    token,
    userId: claims.sub,
    email,
    isAdmin,
    supabase,
  };
}

export async function requireAdmin(req: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const result = await requireUser(req);
  if (!result.success) return result;

  if (result.isAdmin) {
    return result;
  }

  const policy = envAdminEmails();
  const email = (result.email || "").toLowerCase();
  const allowByPolicy = policy.wildcard || policy.emails.size === 0 || (email && policy.emails.has(email));

  if (allowByPolicy) {
    return { ...result, isAdmin: true };
  }

  return { success: false, status: 403, message: "Not authorized" };
}
