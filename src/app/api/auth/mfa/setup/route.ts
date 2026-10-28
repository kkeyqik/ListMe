import { NextResponse, type NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { rateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';
import { buildOtpauthUri, generateTotpSecret } from '@/lib/totp';
import { encryptMfaSecret, isMfaEnrolled, loadMfaAdmin, readMfa, writeMfa } from '@/lib/admin-mfa';

/**
 * POST /api/auth/mfa/setup
 *
 * Starts authenticator-app enrollment for an admin who has none yet. Stores
 * a pending (encrypted) secret that only becomes active after a correct code
 * is sent to /api/auth/mfa/verify. Returns the QR code and the secret for
 * manual entry. Calling it again replaces the pending secret.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const limit = rateLimit(`mfa-setup:${userId}`, 10, 10 * 60 * 1000);
    const ipLimit = rateLimit(`mfa-setup-ip:${getClientIp(request)}`, 20, 10 * 60 * 1000);
    if (!limit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(limit.retryAfter, ipLimit.retryAfter)) } },
      );
    }

    const admin = await loadMfaAdmin(userId);
    if (!admin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (isMfaEnrolled(admin.roleMetadata)) {
      return NextResponse.json(
        { message: 'Two-step verification is already set up' },
        { status: 409 },
      );
    }

    const secret = generateTotpSecret();
    const current = readMfa(admin.roleMetadata);
    const written = await writeMfa(userId, admin, {
      ...current,
      pendingSecretEnc: encryptMfaSecret(secret, userId),
      pendingCreatedAt: new Date().toISOString(),
    });
    if (!written) {
      return NextResponse.json({ message: 'Please try again' }, { status: 409 });
    }

    const accountName = admin.phone || admin.email || admin.name || 'admin';
    const otpauthUri = buildOtpauthUri(secret, accountName);
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, { errorCorrectionLevel: 'M', margin: 1, width: 240 });

    return NextResponse.json(
      { otpauthUri, secret, qrDataUrl },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[POST /api/auth/mfa/setup] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
