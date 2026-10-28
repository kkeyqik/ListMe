import type { Metadata } from 'next';
import { safeRedirectPath } from '@/lib/safe-redirect';
import AdminVerifyClient from './AdminVerifyClient';

export const metadata: Metadata = {
  title: 'Two-step verification | ListMe Admin',
  robots: { index: false, follow: false },
};

/** Where to go after verifying: a same-site path, never this page itself. */
function resolveTarget(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const target = safeRedirectPath(value, '/admin');
  return target.startsWith('/admin-verify') ? '/admin' : target;
}

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  return <AdminVerifyClient redirectTo={resolveTarget(params.redirect)} />;
}
