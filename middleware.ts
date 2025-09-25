import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect admin routes
  if (pathname.startsWith('/dashboard/admin')) {
    try {
      // Get the authorization header
      const authHeader = request.headers.get('authorization');
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      // Also check cookies for browser requests
      const cookieToken = request.cookies.get('sb-access-token')?.value;
      const accessToken = bearerToken || cookieToken;

      if (!accessToken) {
        // Redirect to sign in for browser requests
        if (request.headers.get('accept')?.includes('text/html')) {
          const signInUrl = new URL('/auth/signin', request.url);
          signInUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(signInUrl);
        }
        // Return 401 for API requests
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Verify token and check admin role
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get user from token
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

      if (userError || !user) {
        if (request.headers.get('accept')?.includes('text/html')) {
          const signInUrl = new URL('/auth/signin', request.url);
          signInUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(signInUrl);
        }
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      // Check if user has admin role
      let isAdmin = false;

      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        isAdmin = roleData?.role === 'admin';
      } catch {
        // Ignore role check errors and fall back to metadata/env
      }

      // Fallback to user metadata or environment variable
      if (!isAdmin) {
        isAdmin = Boolean(user.user_metadata?.is_admin) || (user.app_metadata?.role === 'admin');
      }

      // Check environment admin emails as final fallback
      if (!isAdmin && user.email) {
        const adminEmailsRaw = (process.env.ADMIN_EMAILS || '').trim();
        const wildcard = adminEmailsRaw === '*';
        const adminEmails = adminEmailsRaw
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        isAdmin = wildcard || adminEmails.includes(user.email.toLowerCase());
      }

      if (!isAdmin) {
        if (request.headers.get('accept')?.includes('text/html')) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      // Allow the request to proceed
      return NextResponse.next();

    } catch (error) {
      console.error('Middleware error:', error);
      if (request.headers.get('accept')?.includes('text/html')) {
        return NextResponse.redirect(new URL('/auth/signin', request.url));
      }
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/admin/:path*'
  ]
};