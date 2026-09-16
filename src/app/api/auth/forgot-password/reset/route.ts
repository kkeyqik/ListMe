import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { verifyPasswordResetSessionToken, createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { logUserActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`reset-password:${ip}`, 5, 15 * 60 * 1000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, 5) }
    );
  }

  try {
    const { resetToken, newPassword, confirmPassword } = await request.json();

    if (!resetToken || !newPassword || !confirmPassword) {
      return NextResponse.json({ message: 'resetToken, newPassword, and confirmPassword are required' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: 'Passwords do not match' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ message: 'Password must not exceed 128 characters' }, { status: 400 });
    }

    // Verify the reset token (15-min signed token issued after OTP verification)
    const tokenPayload = verifyPasswordResetSessionToken(resetToken);
    if (!tokenPayload) {
      return NextResponse.json(
        { message: 'Your password reset session has expired. Please start the reset process again.' },
        { status: 401 }
      );
    }

    const { userId } = tokenPayload;

    // Fetch user profile
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, name: true, role: true, status: true },
    });

    if (!profile) {
      return NextResponse.json({ message: 'Account not found' }, { status: 404 });
    }

    if (profile.status === 'SUSPENDED' || profile.status === 'BANNED') {
      return NextResponse.json(
        { message: 'This account has been suspended. Please contact support.' },
        { status: 403 }
      );
    }

    if (!profile.email) {
      return NextResponse.json(
        { message: 'Cannot reset password for an account without an email address.' },
        { status: 400 }
      );
    }

    // Update password via Supabase Admin client
    const adminClient = createAdminClient();
    const { error: supabaseError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (supabaseError) {
      console.error('[reset-password] Supabase Admin updateUserById error:', supabaseError);
      return NextResponse.json(
        { message: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    // Auto-login: Issue a session cookie so user is immediately authenticated
    const sessionToken = createSessionToken(profile.id, profile.role);
    const cookieOptions = getSessionCookieOptions();

    const response = NextResponse.json({
      success: true,
      message: 'Password reset successfully. You are now logged in.',
      profile: {
        id: profile.id,
        name: profile.name,
        role: profile.role,
      },
    });

    // Set cookie on both cookieStore and response headers
    try {
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, sessionToken, cookieOptions as any);
    } catch {}
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, cookieOptions as any);

    // Log activity
    try {
      await logUserActivity({
        userId,
        action: 'PASSWORD_RESET',
        request,
        metadata: { ip, method: 'otp_verified' },
      });
    } catch {}

    return response;
  } catch (error: any) {
    console.error('[forgot-password/reset] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
