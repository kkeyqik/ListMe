import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { createPasswordResetSessionToken } from '@/lib/session';
import { logUserActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`verify-otp:${ip}`, 10, 15 * 60 * 1000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: 'Too many attempts. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, 10) }
    );
  }

  try {
    const { identifier, channel, otp } = await request.json();

    if (!identifier || !channel || !otp) {
      return NextResponse.json({ message: 'identifier, channel, and otp are required' }, { status: 400 });
    }

    if (typeof otp !== 'string' || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ message: 'OTP must be exactly 6 digits' }, { status: 400 });
    }

    const channelUpper = channel.toUpperCase();

    // Find active tokens for this channel/identifier
    const now = new Date();
    const activeTokens = await prisma.passwordResetToken.findMany({
      where: {
        channel: channelUpper,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeTokens.length === 0) {
      return NextResponse.json(
        { message: 'OTP has expired or does not exist. Please request a new code.' },
        { status: 400 }
      );
    }

    // Find the token that matches the target identifier
    const trimmed = identifier.trim();
    const cleanDigits = trimmed.replace(/\D/g, '').slice(-10);

    const matchingToken = activeTokens.find((token) => {
      if (channelUpper === 'EMAIL') {
        return token.target.toLowerCase() === trimmed.toLowerCase();
      } else {
        // SMS - match by last 10 digits
        const tokenDigits = token.target.replace(/\D/g, '').slice(-10);
        return tokenDigits === cleanDigits;
      }
    });

    if (!matchingToken) {
      return NextResponse.json(
        { message: 'OTP has expired or does not exist. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check max attempts
    if (matchingToken.attempts >= 5) {
      await prisma.passwordResetToken.delete({ where: { id: matchingToken.id } });
      return NextResponse.json(
        { message: 'Too many incorrect attempts. Please request a new OTP code.' },
        { status: 400 }
      );
    }

    // Verify OTP hash
    const inputHash = crypto.createHash('sha256').update(otp).digest('hex');

    if (inputHash !== matchingToken.tokenHash) {
      // Increment attempts
      await prisma.passwordResetToken.update({
        where: { id: matchingToken.id },
        data: { attempts: matchingToken.attempts + 1 },
      });
      const remaining = 4 - matchingToken.attempts;
      return NextResponse.json(
        { message: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
        { status: 400 }
      );
    }

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: matchingToken.id },
      data: { usedAt: now },
    });

    // Issue a signed 15-minute reset token
    const resetToken = createPasswordResetSessionToken(matchingToken.userId);

    // Log activity
    try {
      await logUserActivity({
        userId: matchingToken.userId,
        action: 'VERIFY_RESET_OTP',
        request,
        metadata: { channel, ip },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      resetToken,
      message: 'OTP verified successfully',
    });
  } catch (error: any) {
    console.error('[forgot-password/verify-otp] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
