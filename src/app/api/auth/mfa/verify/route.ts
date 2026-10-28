import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { rateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/request-ip';
import { verifyTotp } from '@/lib/totp';
import { logAdminActivity } from '@/lib/activity-logger';
import { MFA_COOKIE_NAME, createMfaCookieToken, getMfaCookieOptions } from '@/lib/mfa-cookie';
import {
  BACKUP_CODE_RE,
  decryptMfaSecret,
  generateBackupCodes,
  hashBackupCode,
  loadMfaAdmin,
  readMfa,
  writeMfa,
} from '@/lib/admin-mfa';

const INVALID = 'Invalid code. Please try again.';

function invalid() {
  return NextResponse.json({ message: INVALID }, { status: 400 });
}

function safeHashEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * POST /api/auth/mfa/verify  { code }
 *
 * - Pending set-up: a correct 6-digit code activates two-step verification
 *   and returns 8 single-use backup codes ONCE (only hashes are stored).
 * - Enrolled: accepts a 6-digit authenticator code or a backup code
 *   (xxxx-xxxx). A used backup code is removed.
 * On success sets the 12-hour `listme-admin-mfa` cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userLimit = rateLimit(`mfa-verify:${userId}`, 5, 10 * 60 * 1000);
    const ipLimit = rateLimit(`mfa-verify-ip:${getClientIp(request)}`, 20, 10 * 60 * 1000);
    if (!userLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many attempts. Please wait a few minutes and try again.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(userLimit.retryAfter, ipLimit.retryAfter)) } },
      );
    }

    const admin = await loadMfaAdmin(userId);
    if (!admin) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return invalid();
    }
    const rawCode = (body as { code?: unknown } | null)?.code;
    if (typeof rawCode !== 'string' || rawCode.length > 20) return invalid();
    const code = rawCode.trim().replace(/\s/g, '');

    const mfa = readMfa(admin.roleMetadata);
    let backupCodes: string[] | undefined;
    let usedBackupCode = false;
    let activated = false;

    if (mfa.secretEnc) {
      // Enrolled: authenticator code or backup code.
      if (/^\d{6}$/.test(code)) {
        const secret = decryptMfaSecret(mfa.secretEnc, userId);
        if (!secret) {
          console.error('[mfa/verify] Could not decrypt TOTP secret (SESSION_SECRET changed?)');
          return invalid();
        }
        const step = verifyTotp(secret, code, mfa.lastStep);
        if (step === null) return invalid();
        const ok = await writeMfa(userId, admin, { ...mfa, lastStep: step });
        if (!ok) return invalid();
      } else if (BACKUP_CODE_RE.test(code)) {
        const hash = hashBackupCode(code);
        const stored = Array.isArray(mfa.backupCodes) ? mfa.backupCodes : [];
        let found = -1;
        stored.forEach((h, i) => {
          if (found === -1 && typeof h === 'string' && safeHashEqual(h, hash)) found = i;
        });
        if (found === -1) return invalid();
        const remaining = stored.filter((_, i) => i !== found);
        const ok = await writeMfa(userId, admin, { ...mfa, backupCodes: remaining });
        if (!ok) return invalid();
        usedBackupCode = true;
        await logAdminActivity({
          adminId: userId,
          action: `${admin.name || 'Admin'} signed in with a two-step backup code (${remaining.length} left)`,
          entityType: 'ADMIN_MFA',
          entityId: userId,
          metadata: { event: 'backup_code_used', remaining: remaining.length, ip: getClientIp(request) },
        });
      } else {
        return invalid();
      }
    } else if (mfa.pendingSecretEnc) {
      // Confirming a new set-up: authenticator code only.
      if (!/^\d{6}$/.test(code)) return invalid();
      const secret = decryptMfaSecret(mfa.pendingSecretEnc, userId);
      if (!secret) return invalid();
      const step = verifyTotp(secret, code, null);
      if (step === null) return invalid();

      backupCodes = generateBackupCodes();
      const ok = await writeMfa(userId, admin, {
        secretEnc: mfa.pendingSecretEnc,
        enabledAt: new Date().toISOString(),
        lastStep: step,
        backupCodes: backupCodes.map(hashBackupCode),
      });
      if (!ok) return invalid();
      activated = true;
      await logAdminActivity({
        adminId: userId,
        action: `${admin.name || 'Admin'} turned on two-step verification`,
        entityType: 'ADMIN_MFA',
        entityId: userId,
        metadata: { event: 'enrolled', ip: getClientIp(request) },
      });
    } else {
      return NextResponse.json(
        { message: 'Set up two-step verification first' },
        { status: 400 },
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        ...(activated ? { backupCodes } : {}),
        ...(usedBackupCode ? { usedBackupCode: true } : {}),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(MFA_COOKIE_NAME, createMfaCookieToken(userId), getMfaCookieOptions());
    return response;
  } catch (error) {
    console.error('[POST /api/auth/mfa/verify] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
