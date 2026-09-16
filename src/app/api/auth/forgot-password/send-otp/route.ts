import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { validatePhone, validateEmail } from '@/lib/validation';
import { sendEmail } from '@/lib/email';
import { logUserActivity } from '@/lib/activity-logger';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 5))}@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  const last4 = digits.slice(-4);
  const prefix = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : '+91 ';
  return `${prefix}••••• ••${last4}`;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitResult = rateLimit(`send-otp:${ip}`, 5, 15 * 60 * 1000);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { message: 'Too many OTP requests. Please wait a few minutes before trying again.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult, 5) }
    );
  }

  try {
    const { identifier, channel } = await request.json();

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ message: 'Identifier is required' }, { status: 400 });
    }

    if (channel !== 'sms' && channel !== 'email') {
      return NextResponse.json({ message: 'Channel must be either "sms" or "email"' }, { status: 400 });
    }

    const trimmed = identifier.trim();
    let profile = null;

    // Lookup user by email or phone
    const emailValidation = validateEmail(trimmed);
    if (emailValidation.valid) {
      profile = await prisma.profile.findFirst({
        where: { email: { equals: trimmed, mode: 'insensitive' } },
        select: { id: true, name: true, email: true, phone: true },
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
          select: { id: true, name: true, email: true, phone: true },
        });
      }
    }

    if (!profile) {
      return NextResponse.json(
        { message: 'No registered account found with this email or mobile number.' },
        { status: 404 }
      );
    }

    // Verify channel availability on account
    let target = '';
    let maskedTarget = '';

    if (channel === 'email') {
      if (!profile.email) {
        return NextResponse.json(
          { message: 'No email address is linked to this account. Please select SMS verification instead.' },
          { status: 400 }
        );
      }
      target = profile.email;
      maskedTarget = maskEmail(profile.email);
    } else {
      if (!profile.phone) {
        return NextResponse.json(
          { message: 'No mobile number is linked to this account. Please select Email verification instead.' },
          { status: 400 }
        );
      }
      target = profile.phone;
      maskedTarget = maskPhone(profile.phone);
    }

    // Generate cryptographically secure 6-digit OTP
    const isMockEnabled = process.env.ENABLE_MOCK_AUTH === 'true' || process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true';
    const otp = isMockEnabled ? '123456' : crypto.randomInt(100000, 1000000).toString();
    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Invalidate previous active tokens for this user and channel
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: profile.id,
        channel: channel.toUpperCase(),
        usedAt: null,
      },
    });

    // Save token to database with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: {
        userId: profile.id,
        channel: channel.toUpperCase(),
        target,
        tokenHash,
        expiresAt,
      },
    });

    // Dispatch OTP based on channel
    if (channel === 'email') {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - ListMe</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 24px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <div style="background: #0A1128; padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">ListMe</h1>
      <p style="color: #94A3B8; margin: 4px 0 0; font-size: 13px;">Direct Owner Real Estate Platform</p>
    </div>
    <div style="padding: 32px 28px;">
      <h2 style="color: #0F172A; margin: 0 0 12px; font-size: 18px; font-weight: 600;">Password Reset Verification</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${profile.name || 'there'},<br><br>
        We received a request to reset the password for your ListMe account. Use the 6-digit verification code below to proceed:
      </p>
      <div style="background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 12px; padding: 18px; text-align: center; margin: 0 0 24px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; color: #0A1128; letter-spacing: 8px; display: inline-block;">${otp}</span>
      </div>
      <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 0 0 16px;">
        ⏱️ This code will expire in <strong>10 minutes</strong>. Never share this code with anyone. ListMe staff will never ask for your verification code.
      </p>
      <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 0; border-top: 1px solid #E2E8F0; padding-top: 16px;">
        If you did not request a password reset, you can safely ignore this email. Your account remains secure.
      </p>
    </div>
  </div>
</body>
</html>
      `;

      await sendEmail({
        to: target,
        subject: 'Your ListMe Password Reset Code',
        text: `Hi ${profile.name || 'User'},\n\nYour 6-digit verification code to reset your ListMe password is: ${otp}\n\nThis code is valid for 10 minutes. If you did not request this, please ignore this email.\n\n- The ListMe Team`,
        html: emailHtml,
        metadata: { type: 'PASSWORD_RESET_OTP', channel: 'email', userId: profile.id },
      });
    } else {
      // SMS channel — never log plain text OTPs in production
      if (process.env.NODE_ENV !== 'production' || isMockEnabled) {
        console.log(`[Password Reset SMS OTP] Generated for ${target}: ${otp}`);
      }
    }

    // Log user activity
    try {
      await logUserActivity({
        userId: profile.id,
        action: 'REQUEST_PASSWORD_RESET',
        request,
        metadata: { channel, target: maskedTarget, ip },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      channel,
      target: maskedTarget,
      formattedPhone: channel === 'sms' ? target : undefined,
      message: `Verification code sent via ${channel === 'sms' ? 'SMS' : 'Email'} to ${maskedTarget}`,
    });
  } catch (error: any) {
    console.error('[forgot-password/send-otp] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
