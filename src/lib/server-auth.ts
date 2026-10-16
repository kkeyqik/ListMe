import { headers } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isMockAuthEnabled } from '@/lib/mock-auth';
import { prisma } from '@/lib/prisma';

/** Phone-only accounts were given placeholder emails like phone_919876543210@listme.com. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !!email && /^phone_\d+@listme\.com$/i.test(email);
}

/** A real, confirmed email address on the Supabase user. */
export function hasVerifiedEmail(user: Pick<User, 'email' | 'email_confirmed_at'> | null): boolean {
  return !!user?.email && !!user.email_confirmed_at && !isPlaceholderEmail(user.email);
}

/**
 * The signed-in Supabase user for this request, or null.
 *
 * The Supabase session is the only session. Role and status are never taken
 * from it; they are read from the profiles table.
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  } catch (error) {
    unstable_rethrow(error);
    console.error('[getSessionUser] Error:', error);
    return null;
  }
}

/**
 * Returns the authenticated user's ID, or null.
 *
 * 1. Local development only (ENABLE_MOCK_AUTH): `x-mock-user-id` header, or
 *    the mock cookie handled inside createClient().
 * 2. The Supabase session.
 *
 * Suspended or banned accounts are treated as signed out, so an existing
 * session stops working as soon as an admin suspends the user.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    let userId: string | null = null;

    if (isMockAuthEnabled()) {
      try {
        const headerList = await headers();
        userId = headerList.get('x-mock-user-id');
      } catch {
        // Ignore if headers() is called outside request context
      }
    }

    if (!userId) {
      userId = (await getSessionUser())?.id ?? null;
    }

    if (!userId) return null;

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (profile && (profile.status === 'SUSPENDED' || profile.status === 'BANNED')) {
      return null;
    }

    return userId;
  } catch (error) {
    unstable_rethrow(error);
    console.error('[getAuthenticatedUserId] Error:', error);
    return null;
  }
}

/**
 * Whether the user may post listings and send enquiries: a confirmed email,
 * or (for older phone-only accounts) a verified phone.
 */
export async function isContactVerified(userId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { phoneVerified: true },
  });
  if (profile?.phoneVerified) return true;

  const sessionUser = await getSessionUser();
  if (sessionUser?.id === userId) return hasVerifiedEmail(sessionUser);

  if (isMockAuthEnabled()) return false;
  try {
    const { data } = await createAdminClient().auth.admin.getUserById(userId);
    return hasVerifiedEmail(data.user ?? null);
  } catch {
    return false;
  }
}

/**
 * Makes sure a profiles row exists for a Supabase user. The database trigger
 * in prisma/sql/auth-email-first.sql normally creates it; this covers the
 * rare case where the trigger could not.
 */
export async function ensureProfile(user: User) {
  const existing = await prisma.profile.findUnique({ where: { id: user.id } });
  if (existing) return existing;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const email = user.email?.toLowerCase() ?? null;
  const emailTaken = email
    ? await prisma.profile.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } })
    : null;

  return prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      name: str(meta.name) || str(meta.full_name) || email?.split('@')[0] || 'User',
      email: emailTaken ? null : email,
      avatarUrl: str(meta.avatar_url),
      city: str(meta.city),
      role: 'USER',
    },
  });
}

/**
 * Ends every Supabase session of a user and blocks new sign-ins while
 * suspended (`ban_duration`), or lifts the block when reactivated.
 */
export async function syncSupabaseBan(userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'): Promise<void> {
  if (isMockAuthEnabled() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const admin = createAdminClient();
    // ~100 years: Supabase has no "forever" value.
    const banDuration = status === 'ACTIVE' ? 'none' : '876000h';
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: banDuration });
    if (error) throw error;
  } catch (error) {
    console.error('[syncSupabaseBan] Failed to update Supabase ban for', userId, error);
  }
}
