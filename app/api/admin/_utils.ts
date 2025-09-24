import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

type AdminGate = {
  ok: boolean;
  email: string | null;
  isAdmin: boolean;
};

export function getBearer(req: NextRequest) {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7) : undefined;
}

// Admin gating:
// - If ADMIN_EMAILS is empty, allow any authenticated user (dev-friendly default).
// - If ADMIN_EMAILS is "*", allow any authenticated user explicitly.
// - Else, require the user email to be included in ADMIN_EMAILS (comma-separated).
export async function requireAdmin(req: NextRequest): Promise<AdminGate> {
  const bearer = getBearer(req);
  // Use an auth-only client built with the anon key so the bearer JWT is honored
  // even when a service role key is configured for DB access.
  let email: string | null = null;
  let metaIsAdmin = false;
  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      const authClient = createClient(url, anon, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${bearer}` } as any },
      } as any);
      const { data: userData } = await authClient.auth.getUser();
      const user = userData?.user as any;
      email = user?.email ?? null;
      metaIsAdmin = Boolean(user?.user_metadata?.is_admin) || (user?.app_metadata?.role === 'admin');
    }
  }

  const adminsRaw = (process.env.ADMIN_EMAILS || '').trim();
  const wildcard = adminsRaw === '*';
  const admins = adminsRaw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return { ok: false, email: null, isAdmin: false };
  if (metaIsAdmin) return { ok: true, email, isAdmin: true };
  if (admins.length === 0 || wildcard) return { ok: true, email, isAdmin: true };

  if (!admins.includes(email.toLowerCase())) {
    return { ok: false, email, isAdmin: false };
  }

  return { ok: true, email, isAdmin: true };
}
