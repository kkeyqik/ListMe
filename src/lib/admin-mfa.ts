import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireSecret } from '@/lib/mock-auth';
import { MFA_COOKIE_NAME, verifyMfaCookieToken } from '@/lib/mfa-cookie';

/**
 * Admin two-step verification (TOTP) storage.
 *
 * Lives in Profile.roleMetadata.mfa (no schema change):
 *   {
 *     secretEnc,          // AES-256-GCM encrypted base32 TOTP secret (active)
 *     enabledAt,          // ISO date of enrollment
 *     lastStep,           // last accepted TOTP time step (replay protection)
 *     backupCodes,        // HMAC-SHA256 hashes of unused backup codes
 *     pendingSecretEnc,   // set-up started but not confirmed yet
 *     pendingCreatedAt,
 *   }
 *
 * roleMetadata also carries `permissions`, so every write here is a
 * read-modify-write that keeps the other keys. Never send `mfa` to a
 * browser: API responses use publicRoleMetadata()/toPublicProfile().
 */

export interface MfaData {
  secretEnc?: string;
  enabledAt?: string;
  lastStep?: number;
  backupCodes?: string[];
  pendingSecretEnc?: string;
  pendingCreatedAt?: string;
}

// ---------------------------------------------------------------------------
// Keys and encryption
// ---------------------------------------------------------------------------

let cachedKeys: { secret: string; enc: Buffer; hash: Buffer } | null = null;

function keys() {
  const secret = requireSecret('SESSION_SECRET', 'dev-secret-do-not-use-in-production');
  if (cachedKeys && cachedKeys.secret === secret) return cachedKeys;
  const derive = (info: string) =>
    Buffer.from(crypto.hkdfSync('sha256', secret, Buffer.alloc(0), info, 32));
  cachedKeys = {
    secret,
    enc: derive('listme-admin-mfa'),
    hash: derive('listme-admin-mfa-backup-codes'),
  };
  return cachedKeys;
}

/** Encrypts the base32 secret, bound to the profile id (AAD). */
export function encryptMfaSecret(secretBase32: string, userId: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keys().enc, iv);
  cipher.setAAD(Buffer.from(userId, 'utf8'));
  const ct = Buffer.concat([cipher.update(secretBase32, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${Buffer.concat([iv, tag, ct]).toString('base64url')}`;
}

export function decryptMfaSecret(enc: string, userId: string): string | null {
  try {
    if (!enc.startsWith('v1:')) return null;
    const raw = Buffer.from(enc.slice(3), 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', keys().enc, iv);
    decipher.setAAD(Buffer.from(userId, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Backup codes
// ---------------------------------------------------------------------------

/** No 0/o, 1/l/i to avoid misreading. 31 symbols, 8 chars = ~39 bits each. */
const BACKUP_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const BACKUP_CODE_COUNT = 8;
export const BACKUP_CODE_RE = /^[a-z0-9]{4}-?[a-z0-9]{4}$/i;

export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let s = '';
    for (let j = 0; j < 8; j++) s += BACKUP_ALPHABET[crypto.randomInt(BACKUP_ALPHABET.length)];
    codes.push(`${s.slice(0, 4)}-${s.slice(4)}`);
  }
  return codes;
}

export function normalizeBackupCode(code: string): string {
  return code.toLowerCase().replace(/[\s-]/g, '');
}

export function hashBackupCode(code: string): string {
  return crypto.createHmac('sha256', keys().hash).update(normalizeBackupCode(code)).digest('hex');
}

// ---------------------------------------------------------------------------
// roleMetadata helpers
// ---------------------------------------------------------------------------

export function metaObject(roleMetadata: unknown): Record<string, unknown> {
  return roleMetadata && typeof roleMetadata === 'object' && !Array.isArray(roleMetadata)
    ? (roleMetadata as Record<string, unknown>)
    : {};
}

export function readMfa(roleMetadata: unknown): MfaData {
  const mfa = metaObject(roleMetadata).mfa;
  return mfa && typeof mfa === 'object' && !Array.isArray(mfa) ? (mfa as MfaData) : {};
}

export function isMfaEnrolled(roleMetadata: unknown): boolean {
  return typeof readMfa(roleMetadata).secretEnc === 'string';
}

/** roleMetadata without the `mfa` key — the only form a browser may see. */
export function publicRoleMetadata(roleMetadata: unknown): unknown {
  if (!roleMetadata || typeof roleMetadata !== 'object' || Array.isArray(roleMetadata)) {
    return roleMetadata ?? null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { mfa, ...rest } = roleMetadata as Record<string, unknown>;
  return rest;
}

/** Profile-like object with roleMetadata.mfa removed and an `mfaEnabled` flag added. */
export function toPublicProfile<T extends { roleMetadata?: unknown }>(
  profile: T,
): Omit<T, 'roleMetadata'> & { roleMetadata: unknown; mfaEnabled: boolean } {
  return {
    ...profile,
    roleMetadata: publicRoleMetadata(profile.roleMetadata),
    mfaEnabled: isMfaEnrolled(profile.roleMetadata),
  };
}

/**
 * Compare-and-swap write of roleMetadata.mfa: only applies if the profile has
 * not changed since it was read (updatedAt matches), so two concurrent
 * requests cannot both spend the same code. `next` of null removes the key.
 *
 * @returns true if written, false if the profile changed in between.
 */
export async function writeMfa(
  userId: string,
  readAt: { roleMetadata: unknown; updatedAt: Date },
  next: MfaData | null,
): Promise<boolean> {
  const meta = { ...metaObject(readAt.roleMetadata) };
  if (next) meta.mfa = next;
  else delete meta.mfa;
  const result = await prisma.profile.updateMany({
    where: { id: userId, updatedAt: readAt.updatedAt },
    data: { roleMetadata: meta as Prisma.InputJsonValue },
  });
  return result.count === 1;
}

/**
 * Signed-in ADMIN/SUPER_ADMIN for the /api/auth/mfa routes. These routes do
 * NOT use requireAdminModule (it requires two-step verification itself).
 */
export async function loadMfaAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      roleMetadata: true,
      updatedAt: true,
    },
  });
  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') || profile.status !== 'ACTIVE') {
    return null;
  }
  return profile;
}

// ---------------------------------------------------------------------------
// Verified-state cookie (request scope)
// ---------------------------------------------------------------------------

/** 403 body that admin pages recognise and answer by sending the user to /admin-verify. */
export function mfaRequiredResponse() {
  return NextResponse.json(
    { message: 'Two-step verification required', code: 'mfa_required' },
    { status: 403 },
  );
}

/** True if this request carries a valid "two-step passed" cookie for userId. */
export async function hasVerifiedMfaCookie(userId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return verifyMfaCookieToken(cookieStore.get(MFA_COOKIE_NAME)?.value, userId);
  } catch {
    return false;
  }
}
