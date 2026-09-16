import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { createPasswordResetSessionToken } from '@/lib/session';
import { validateEmail } from '@/lib/validation';
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
    const { identifier, channel, otp, firebaseIdToken } = await request.json();

    if (!identifier || !channel || !otp) {
      return NextResponse.json({ message: 'identifier, channel, and otp are required' }, { status: 400 });
    }

    if (typeof otp !== 'string' || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ message: 'OTP must be exactly 6 digits' }, { status: 400 });
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

    // Fallback: direct target match if profile lookup was inconclusive
    if (!matchingToken) {
      const cleanDigits = trimmed.replace(/\D/g, '').slice(-10);
      matchingToken = await prisma.passwordResetToken.findFirst({
        where: {
          channel: channelUpper,
          usedAt: null,
          expiresAt: { gt: now },
          OR: channelUpper === 'EMAIL'
            ? [{ target: { equals: trimmed, mode: 'insensitive' } }]
            : [{ target: { contains: cleanDigits } }],
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

    // Check max attempts
    if (matchingToken.attempts >= 5) {
      await prisma.passwordResetToken.delete({ where: { id: matchingToken.id } });
      return NextResponse.json(
        { message: 'Too many incorrect attempts. Please request a new OTP code.' },
        { status: 400 }
      );
    }

    // Verify OTP — via Firebase token (for SMS) or SHA-256 hash comparison
    let isVerified = false;

    if (firebaseIdToken && channelUpper === 'SMS') {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (apiKey) {
        try {
          const googleRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken: firebaseIdToken }),
            }
          );
          if (googleRes.ok) {
            const googleData = await googleRes.json();
            const verifiedPhone = googleData.users?.[0]?.phoneNumber?.replace(/\D/g, '').slice(-10);
            const tokenPhone = matchingToken.target.replace(/\D/g, '').slice(-10);
            if (verifiedPhone && tokenPhone && verifiedPhone === tokenPhone) {
              isVerified = true;
            }
          }
        } catch (fbErr) {
          console.warn('[verify-otp] Firebase token verification error:', fbErr);
        }
      }
    }

    if (!isVerified) {
      const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
      const inputBuf = Buffer.from(inputHash, 'hex');
      const tokenBuf = Buffer.from(matchingToken.tokenHash, 'hex');
      if (inputBuf.length === tokenBuf.length && crypto.timingSafeEqual(inputBuf, tokenBuf)) {
        isVerified = true;
      }
    }

    if (!isVerified) {
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
