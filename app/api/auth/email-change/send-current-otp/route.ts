import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// In-memory storage for OTP codes (in production, use Redis or database)
const otpStorage = new Map<string, { code: string, expires: number, newEmail: string }>();

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
    const { newEmail } = await req.json();

    if (!newEmail) {
      return Response.json({
        ok: false,
        error: 'New email address is required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return Response.json({
        ok: false,
        error: 'Invalid email format'
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

    // Check if new email is already in use
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === newEmail.toLowerCase());

    if (emailExists) {
      return Response.json({
        ok: false,
        error: 'Email address is already in use'
      }, { status: 400 });
    }

    // Generate OTP for current email
    const otp = generateOTP();
    const expires = Date.now() + (10 * 60 * 1000); // 10 minutes

    // Store OTP
    otpStorage.set(user.id, { code: otp, expires, newEmail });

    // Send OTP to current email
    await sendEmail(
      user.email!,
      'Email Change Verification - Unserver',
      `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this email change, please ignore this message.`
    );

    return Response.json({
      ok: true,
      message: 'Verification code sent to your current email address'
    });

  } catch (error) {
    console.error('Send current OTP error:', error);
    return Response.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}