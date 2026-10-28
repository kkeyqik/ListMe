import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { createPasswordResetSessionToken } from '@/lib/session';
import { validateEmail } from '@/lib/validation';
import { logUserActivity } from '@/lib/activity-logger';
import { verifyFirebasePhoneToken } from '@/lib/firebase/verify-id-token';
import { isMockAuthEnabled } from '@/lib/mock-auth';

const MAX_ATTEMPTS = 5;

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
    const { identifier, channel, otp, firebaseIdToken } = await request.json();

    if (!identifier || !channel || !otp) {
      return NextResponse.json({ message: 'identifier, channel, and otp are required' }, { status: 400 });
    }

    if (typeof otp !== 'string' || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ message: 'OTP must be exactly 6 digits' }, { status: 400 });
    }

    if (channel !== 'sms' && channel !== 'email') {
      return NextResponse.json({ message: 'Channel must be either "sms" or "email"' }, { status: 400 });
    }

    const channelUpper = channel.toUpperCase();
    const now = new Date();
    const trimmed = identifier.trim();

    // 1. Resolve profile by identifier (phone or email)
    let profile = null;
    const emailValidation = validateEmail(trimmed);
    if (emailValidation.valid) {
      profile = await prisma.profile.findFirst({
        where: { email: { equals: trimmed, mode: 'insensitive' } },
        select: { id: true, email: true, phone: true },
      });
    } else {
      const cleanDigits = trimmed.replace(/\D/g, '').slice(-10);
      if (cleanDigits.length === 10) {
        profile = await prisma.profile.findFirst({
          where: {
            OR: [
              { phone: cleanDigits },
              { phone: `+91${cleanDigits}` },
              { phone: `91${cleanDigits}` },
            ],
          },
          select: { id: true, email: true, phone: true },
        });
      }
    }

    // 2. Find active, unexpired token for this user and channel
    let matchingToken = null;
    if (profile) {
      matchingToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: profile.id,
          channel: channelUpper,
          usedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!matchingToken) {
      return NextResponse.json(
        { message: 'OTP has expired or does not exist. Please request a new code.' },
        { status: 400 }
      );
    }

    // Claim an attempt atomically before checking the code, so concurrent
    // requests cannot get past the 5-attempt cap.
    const claimed = await prisma.passwordResetToken.updateMany({
      where: { id: matchingToken.id, attempts: { lt: MAX_ATTEMPTS }, usedAt: null },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) {
      await prisma.passwordResetToken.deleteMany({ where: { id: matchingToken.id, usedAt: null } });
      return NextResponse.json(
        { message: 'Too many incorrect attempts. Please request a new OTP code.' },
        { status: 400 }
      );
    }
    const attemptsUsed = matchingToken.attempts + 1;

    // Verify OTP — via Firebase token (for SMS) or SHA-256 hash comparison
    let isVerified = false;

    if (firebaseIdToken && channelUpper === 'SMS') {
      const verifiedPhone = await verifyFirebasePhoneToken(firebaseIdToken);
      const tokenPhone = matchingToken.target.replace(/\D/g, '').slice(-10);
      if (verifiedPhone && tokenPhone && verifiedPhone.slice(-10) === tokenPhone) {
        isVerified = true;
      }
    }

    // The server never delivers the SMS-channel code itself (Firebase sends the
    // SMS), so outside local mock mode an SMS reset is proven only by a
    // Firebase ID token for the account's number.
    const acceptStoredCode = channelUpper === 'EMAIL' || isMockAuthEnabled();

    if (!isVerified && acceptStoredCode) {
      const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
      const inputBuf = Buffer.from(inputHash, 'hex');
      const tokenBuf = Buffer.from(matchingToken.tokenHash, 'hex');
      if (inputBuf.length === tokenBuf.length && crypto.timingSafeEqual(inputBuf, tokenBuf)) {
        isVerified = true;
      }
    }

    if (!isVerified) {
      const remaining = Math.max(0, MAX_ATTEMPTS - attemptsUsed);
      return NextResponse.json(
        { message: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
        { status: 400 }
      );
    }

    // Mark token as used (only once, even under concurrent requests)
    const consumed = await prisma.passwordResetToken.updateMany({
      where: { id: matchingToken.id, usedAt: null },
      data: { usedAt: now },
    });
    if (consumed.count === 0) {
      return NextResponse.json(
        { message: 'OTP has expired or does not exist. Please request a new code.' },
        { status: 400 }
      );
    }

    // Issue a signed 15-minute reset token tied to this token id
    const resetToken = createPasswordResetSessionToken(matchingToken.userId, matchingToken.id);

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
