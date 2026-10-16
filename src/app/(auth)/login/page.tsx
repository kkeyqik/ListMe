'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { AuthFlow, type AuthView } from '@/components/auth/AuthFlow';
import { safeRedirectPath } from '@/lib/safe-redirect';
import styles from '../auth.module.css';

const testimonials = [
  {
    name: 'Priya Sharma',
    handle: '@priyasharma',
    initials: 'PS',
    text: 'Found my dream apartment in Bangalore within a week. The direct owner contact saved me lakhs in brokerage!',
  },
  {
    name: 'Rahul Verma',
    handle: '@rahulverma',
    initials: 'RV',
    text: 'Listed my property and got 12 genuine inquiries in 3 days. Clean design, powerful features.',
  },
  {
    name: 'Anita Desai',
    handle: '@anitadesai',
    initials: 'AD',
    text: "Best real estate platform I've used. Intuitive, reliable, and genuinely helpful for both buyers and sellers.",
  },
];

const STEP_TO_VIEW: Record<string, AuthView> = {
  signup: 'signup',
  forgot: 'forgot',
  phone: 'phone',
};

const KNOWN_ERRORS = ['suspended', 'link_expired', 'auth_failed'] as const;
type KnownError = (typeof KNOWN_ERRORS)[number];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();

  const redirectPath = safeRedirectPath(searchParams.get('redirect'));
  const initialView = STEP_TO_VIEW[searchParams.get('step') || ''] || 'signin';
  const errorParam = searchParams.get('error');
  const initialError = (KNOWN_ERRORS as readonly string[]).includes(errorParam || '')
    ? (errorParam as KnownError)
    : errorParam === 'no_code'
      ? 'auth_failed'
      : null;

  const handleSuccess = useCallback(async () => {
    let target = redirectPath;
    if (target === '/dashboard') {
      // Admins land on the admin panel by default.
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json();
        if (data.profile?.role === 'ADMIN' || data.profile?.role === 'SUPER_ADMIN') target = '/admin';
      } catch {
        // Fall back to the dashboard.
      }
    }
    router.replace(target);
    router.refresh();
  }, [redirectPath, router]);

  return (
    <div className={styles.splitContainer}>
      {/* ── Left Panel: Hero Image + Testimonials ── */}
      <div className={styles.heroPanel}>
        <Image
          src="/images/login-hero.png"
          alt="ListMe real estate platform"
          fill
          priority
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} />
        <Link href="/" className={styles.heroBrandLink}>
          <div className={styles.heroBrandRow}>
            <div className={styles.heroBrandIcon}>
              <Home size={20} />
            </div>
            <span className={styles.heroBrandName}>{settings.brandName}</span>
          </div>
        </Link>
        <div className={styles.heroContent}>
          <h2 className={styles.heroTagline}>
            Find your perfect home, directly from owners across India.
          </h2>
          <div className={styles.testimonials}>
            {testimonials.map((t) => (
              <div key={t.handle} className={styles.testimonialCard}>
                <div className={styles.testimonialHeader}>
                  <div className={styles.testimonialAvatar}>{t.initials}</div>
                  <div>
                    <div className={styles.testimonialName}>{t.name}</div>
                    <div className={styles.testimonialHandle}>{t.handle}</div>
                  </div>
                </div>
                <p className={styles.testimonialText}>{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Sign-in ── */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>
          <AuthFlow
            redirectPath={redirectPath}
            onSuccess={handleSuccess}
            initialView={initialView}
            initialEmail={searchParams.get('email') || ''}
            initialError={initialError}
            brandName={settings.brandName}
          />
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <React.Suspense fallback={
      <div className={styles.splitContainer}>
        <div className={styles.heroPanel}>
          <Image
            src="/images/login-hero.png"
            alt="ListMe real estate platform"
            fill
            priority
            className={styles.heroImage}
          />
          <div className={styles.heroOverlay} />
        </div>
        <div className={styles.formPanel}>
          <div className={styles.formInner}>
            <div className={styles.header}>
              <h1 className={styles.title}>Welcome</h1>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-secondary)' }}>
              Loading auth portal...
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </React.Suspense>
  );
}
