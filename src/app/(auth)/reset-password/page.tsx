'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthFlow } from '@/components/auth/AuthFlow';
import styles from '../auth.module.css';

/**
 * Landing page for the password-reset link in the email. The link has
 * already signed the user in (via /callback); here they choose a new password.
 */
export default function ResetPasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  return (
    <div className={styles.centeredPage}>
      <div className={styles.formPanel}>
        <div className={styles.formInner}>
        {loading ? (
          <div className={styles.subtitle} role="status">Loading…</div>
        ) : user ? (
          <AuthFlow initialView="new-password" onSuccess={() => router.replace('/dashboard')} />
        ) : (
          <div className={styles.header}>
            <h1 className={styles.title}>Reset link expired</h1>
            <p className={styles.subtitle}>
              This reset link has expired or was already used.{' '}
              <Link href="/login?step=forgot" className={styles.link}>
                Request a new code
              </Link>
              .
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
