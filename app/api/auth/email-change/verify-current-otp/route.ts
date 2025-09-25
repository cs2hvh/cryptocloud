import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// In-memory storage for OTP codes (in production, use Redis or database)
const otpStorage = new Map<string, { code: string, expires: number, newEmail: string }>();
const newEmailOtpStorage = new Map<string, { code: string, expires: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Mock email sending function
async function sendEmail(to: string, subject: string, body: string) {
  // In production, integrate with email service like SendGrid, AWS SES, etc.
  console.log(`Email sent to ${to}:`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { newEmail, otp } = await req.json();

    if (!newEmail || !otp) {
      return Response.json({
        ok: false,
        error: 'New email and OTP are required'
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

    // Verify current email OTP
    const storedOtp = otpStorage.get(user.id);
    if (!storedOtp) {
      return Response.json({
        ok: false,
        error: 'No verification process found. Please start over.'
      }, { status: 400 });
    }

    if (Date.now() > storedOtp.expires) {
      otpStorage.delete(user.id);
      return Response.json({
        ok: false,
        error: 'Verification code has expired. Please start over.'
      }, { status: 400 });
    }

    if (storedOtp.code !== otp || storedOtp.newEmail !== newEmail) {
      return Response.json({
        ok: false,
        error: 'Invalid verification code'
      }, { status: 400 });
    }

    // Generate OTP for new email
    const newEmailOtp = generateOTP();
    const newEmailExpires = Date.now() + (10 * 60 * 1000); // 10 minutes

    // Store new email OTP
    newEmailOtpStorage.set(user.id, { code: newEmailOtp, expires: newEmailExpires });

    // Send OTP to new email
    await sendEmail(
      newEmail,
      'Email Change Verification - Unserver',
      `Your verification code is: ${newEmailOtp}\n\nThis code will expire in 10 minutes.\n\nPlease enter this code to complete your email change.`
    );

    return Response.json({
      ok: true,
      message: 'Verification code sent to your new email address'
    });

  } catch (error) {
    console.error('Verify current OTP error:', error);
    return Response.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}