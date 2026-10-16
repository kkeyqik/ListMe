import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { createClient } from '@/lib/supabase/server';
import { isMockAuthEnabled } from '@/lib/mock-auth';
import { prisma } from '@/lib/prisma';
import AdminShell from './AdminShell';

/**
 * Admin pages render only for ADMIN and SUPER_ADMIN, checked against the
 * database on every request, and only after two-factor sign-in (aal2).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Always render per request: the answer depends on who is signed in.
  await connection();
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect('/login?redirect=/admin');

  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  if (profile?.role !== 'ADMIN' && profile?.role !== 'SUPER_ADMIN') redirect('/dashboard');

  // Admins must also have confirmed this sign-in with their authenticator app.
  if (!isMockAuthEnabled()) {
    const supabase = await createClient();
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== 'aal2') redirect('/mfa?redirect=/admin');
  }

  return <AdminShell>{children}</AdminShell>;
}
