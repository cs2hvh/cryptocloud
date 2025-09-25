import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// In-memory storage for OTP codes (in production, use Redis or database)
const otpStorage = new Map<string, { code: string, expires: number, newEmail: string }>();
const newEmailOtpStorage = new Map<string, { code: string, expires: number }>();

export async function POST(req: NextRequest) {
  try {
    const { newEmail, currentEmailOtp, newEmailOtp } = await req.json();

    if (!newEmail || !currentEmailOtp || !newEmailOtp) {
      return Response.json({
        ok: false,
        error: 'All verification codes are required'
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

    // Verify current email OTP is still valid
    const storedCurrentOtp = otpStorage.get(user.id);
    if (!storedCurrentOtp) {
      return Response.json({
        ok: false,
        error: 'Verification session expired. Please start over.'
      }, { status: 400 });
    }

    if (Date.now() > storedCurrentOtp.expires) {
      otpStorage.delete(user.id);
      newEmailOtpStorage.delete(user.id);
      return Response.json({
        ok: false,
        error: 'Verification session expired. Please start over.'
      }, { status: 400 });
    }

    if (storedCurrentOtp.code !== currentEmailOtp || storedCurrentOtp.newEmail !== newEmail) {
      return Response.json({
        ok: false,
        error: 'Invalid current email verification'
      }, { status: 400 });
    }

    // Verify new email OTP
    const storedNewOtp = newEmailOtpStorage.get(user.id);
    if (!storedNewOtp) {
      return Response.json({
        ok: false,
        error: 'New email verification not found. Please start over.'
      }, { status: 400 });
    }

    if (Date.now() > storedNewOtp.expires) {
      otpStorage.delete(user.id);
      newEmailOtpStorage.delete(user.id);
      return Response.json({
        ok: false,
        error: 'New email verification expired. Please start over.'
      }, { status: 400 });
    }

    if (storedNewOtp.code !== newEmailOtp) {
      return Response.json({
        ok: false,
        error: 'Invalid new email verification code'
      }, { status: 400 });
    }

    // Update user email
    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (updateError) {
      return Response.json({
        ok: false,
        error: updateError.message
      }, { status: 400 });
    }

    // Clean up stored OTPs
    otpStorage.delete(user.id);
    newEmailOtpStorage.delete(user.id);

    return Response.json({
      ok: true,
      message: 'Email address updated successfully'
    });

  } catch (error) {
    console.error('Complete email change error:', error);
    return Response.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}