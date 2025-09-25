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
// - Role assignments live in public.user_roles (role = 'admin').
// - ADMIN_EMAILS env still provides a fallback for bootstrap and development.
export async function requireAdmin(req: NextRequest): Promise<AdminGate> {
  const bearer = getBearer(req);
  let email: string | null = null;
  let userId: string | null = null;
  let metaIsAdmin = false;

  if (bearer) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      const authClient = createClient(url, anon, {
        auth: { persistSession: false },
        global: { headers: { Authorization: 'Bearer ' + bearer } as any },
      } as any);
      const { data: userData } = await authClient.auth.getUser();
      const user = userData?.user as any;
      email = user?.email ?? null;
      userId = user?.id ?? null;
      metaIsAdmin = Boolean(user?.user_metadata?.is_admin) || (user?.app_metadata?.role === 'admin');
    }
  }

  if (!email || !userId) return { ok: false, email: email ?? null, isAdmin: false };

  let roleIsAdmin = false;
  try {
    // Use service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (supabaseUrl && supabaseServiceKey) {
      const service = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roleRow } = await service
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      roleIsAdmin = roleRow?.role === 'admin';
    }
  } catch {
    // ignore and fall back to env/metadata
  }

  if (roleIsAdmin || metaIsAdmin) {
    return { ok: true, email, isAdmin: true };
  }

  const adminsRaw = (process.env.ADMIN_EMAILS || '').trim();
  const wildcard = adminsRaw === '*';
  const admins = adminsRaw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (admins.length === 0 || wildcard) return { ok: true, email, isAdmin: true };

  if (!admins.includes(email.toLowerCase())) {
    return { ok: false, email, isAdmin: false };
  }

  return { ok: true, email, isAdmin: true };
}

