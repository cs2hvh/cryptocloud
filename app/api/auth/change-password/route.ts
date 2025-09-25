import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return Response.json({
        ok: false,
        error: 'Current password and new password are required'
      }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json({
        ok: false,
        error: 'New password must be at least 8 characters long'
      }, { status: 400 });
    }

    const supabase = createServerSupabase();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json({
        ok: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (signInError) {
      return Response.json({
        ok: false,
        error: 'Current password is incorrect'
      }, { status: 400 });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return Response.json({
        ok: false,
        error: updateError.message
      }, { status: 400 });
    }

    return Response.json({
      ok: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    return Response.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}