import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../_utils";

export const dynamic = "force-dynamic";

const VALID_ROLES = new Set(["user", "admin"]);

function parseJson(value: unknown) {
  if (value == null || value === "") return undefined;
  if (typeof value === "object") return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error("Invalid JSON payload provided");
  }
}

async function fetchRolesMap(supabase: ReturnType<typeof createServerSupabase>, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const { data: rows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);
  const map = new Map<string, string>();
  for (const row of rows || []) {
    if (row?.user_id && typeof row.role === "string") {
      map.set(String(row.user_id), row.role);
    }
  }
  return map;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const url = new URL(req.url);
  const pageParam = Number(url.searchParams.get("page") || "1");
  const perPageParam = Number(url.searchParams.get("perPage") || "50");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam - 1 : 0;
  const perPage = Number.isFinite(perPageParam) && perPageParam > 0 && perPageParam <= 200 ? perPageParam : 50;

  // Use service role key for admin operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json({ ok: false, error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const users = data?.users ?? [];
  const roles = await fetchRolesMap(supabase, users.map((u) => u.id).filter(Boolean));
  const enriched = users.map((user) => ({ ...user, role: roles.get(user.id) ?? "user" }));

  return Response.json({
    ok: true,
    users: enriched,
    total: data?.total ?? users.length ?? 0,
    page: page + 1,
    perPage,
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as any;
  if (!body?.email) return Response.json({ ok: false, error: "email is required" }, { status: 400 });

  let userMetadata: Record<string, unknown> | undefined;
  let appMetadata: Record<string, unknown> | undefined;
  try {
    userMetadata = parseJson(body.user_metadata);
    appMetadata = parseJson(body.app_metadata);
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Invalid metadata" }, { status: 400 });
  }

  const payload: any = {
    email: body.email,
    password: body.password || undefined,
    email_confirm: body.email_confirm === true,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
  };

  const role = typeof body.role === "string" ? body.role.toLowerCase() : undefined;
  if (role && !VALID_ROLES.has(role)) {
    return Response.json({ ok: false, error: "Invalid role" }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.admin.createUser(payload);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const createdUser = data.user;
  if (createdUser?.id && role) {
    await supabase.from("user_roles").upsert({ user_id: createdUser.id, role });
  }

  return Response.json({ ok: true, user: createdUser, role: role ?? "user" });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as any;
  const id = body?.id;
  if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });

  let userMetadata: Record<string, unknown> | undefined;
  let appMetadata: Record<string, unknown> | undefined;
  try {
    userMetadata = parseJson(body.user_metadata);
    appMetadata = parseJson(body.app_metadata);
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Invalid metadata" }, { status: 400 });
  }

  const updates: any = {};
  if (body.email) updates.email = body.email;
  if (body.password) updates.password = body.password;
  if (typeof body.email_confirm === "boolean") updates.email_confirm = body.email_confirm;
  if (typeof body.banned === "boolean") updates.banned = body.banned;
  if (userMetadata !== undefined) updates.user_metadata = userMetadata;
  if (appMetadata !== undefined) updates.app_metadata = appMetadata;

  const role = typeof body.role === "string" ? body.role.toLowerCase() : undefined;
  if (role && !VALID_ROLES.has(role)) {
    return Response.json({ ok: false, error: "Invalid role" }, { status: 400 });
  }

  // Use service role key for admin operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json({ ok: false, error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (role) {
    await supabase.from("user_roles").upsert({ user_id: id, role });
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.auth.admin.updateUserById(id, updates);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const refreshed = await supabase.auth.admin.getUserById(id).catch(() => null);
  return Response.json({ ok: true, user: refreshed?.user ?? null, role: role ?? undefined });
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return Response.json({ ok: false, error: "Not authorized" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "id query param required" }, { status: 400 });

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  await supabase.from("user_roles").delete().eq("user_id", id);

  return Response.json({ ok: true });
}

