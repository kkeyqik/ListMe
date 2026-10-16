'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button, OtpInput } from '@/components/ui';
import { safeRedirectPath } from '@/lib/safe-redirect';
import authStyles from '../auth.module.css';
import styles from './mfa.module.css';

type Stage = 'loading' | 'enroll' | 'verify';

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/**
 * Two-factor sign-in with an authenticator app (Google Authenticator, Authy,
 * 1Password...). Required for admin accounts: the first visit sets it up,
 * later sign-ins ask for the current 6-digit code.
 */
function MfaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const redirectPath = safeRedirectPath(searchParams.get('redirect'), '/admin');

  const [stage, setStage] = useState<Stage>('loading');
  const [factorId, setFactorId] = useState('');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(() => {
    router.replace(redirectPath);
    router.refresh();
  }, [router, redirectPath]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(`/mfa?redirect=${redirectPath}`)}`);
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === 'aal2') {
        finish();
        return;
      }

      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        if (active) setError('Could not load your security settings. Refresh the page to try again.');
        return;
      }

      const verified = factors.totp.find((f) => f.status === 'verified');
      if (verified) {
        if (!active) return;
        setFactorId(verified.id);
        setStage('verify');
        return;
      }

      // Clear half-finished setups from earlier visits, then start a new one.
      for (const factor of factors.all.filter((f) => f.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `ListMe ${new Date().toISOString().slice(0, 10)}`,
      });
      if (!active) return;
      if (enrollError || !enrolled) {
        setError('Could not start the setup. Refresh the page to try again.');
        return;
      }
      setFactorId(enrolled.id);
      setEnrollment({ factorId: enrolled.id, qrCode: enrolled.totp.qr_code, secret: enrolled.totp.secret });
      setStage('enroll');
    };
    load();
    return () => {
      active = false;
    };
  }, [supabase, router, redirectPath, finish]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || !factorId) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (verifyError) {
      setCode('');
      setError(
        /rate|too many/i.test(verifyError.message)
          ? 'Too many attempts. Wait a minute and try again.'
          : 'That code is wrong or has expired. Use the current code from your app.'
      );
      return;
    }
    finish();
  };

  return (
    <div className={authStyles.centeredPage}>
      <div className={authStyles.formPanel}>
        <div className={authStyles.formInner}>
          <div className={authStyles.header}>
            <h1 className={authStyles.title}>
              {stage === 'enroll' ? 'Set up two-step sign-in' : 'Two-step sign-in'}
            </h1>
            <p className={authStyles.subtitle}>
              {stage === 'enroll'
                ? 'Admin accounts need an authenticator app as a second step. This takes about a minute.'
                : 'Enter the 6-digit code from your authenticator app.'}
            </p>
          </div>

          {stage === 'loading' && !error && (
            <p className={authStyles.subtitle} role="status">Loading…</p>
          )}

          {stage !== 'loading' && (
            <form className={styles.content} onSubmit={verify}>
              {stage === 'enroll' && enrollment && (
                <>
                  <ol className={styles.steps}>
                    <li>Open Google Authenticator, Microsoft Authenticator or Authy on your phone.</li>
                    <li>Scan this QR code, or type the key below into the app.</li>
                    <li>Enter the 6-digit code the app shows.</li>
                  </ol>
                  <div className={styles.qrBox}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL from Supabase */}
                    <img src={enrollment.qrCode} alt="QR code for your authenticator app" />
                  </div>
                  <div className={styles.secret} aria-label="Setup key">{enrollment.secret}</div>
                </>
              )}
              <div className={styles.otpWrap}>
                <OtpInput value={code} onChange={setCode} disabled={busy} error={!!error} />
              </div>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={busy}
                disabled={code.length !== 6}
                leftIcon={<ShieldCheck size={18} />}
              >
                {stage === 'enroll' ? 'Turn on and continue' : 'Verify'}
              </Button>
            </form>
          )}

          {error && stage === 'loading' && <p className={styles.error} role="alert">{error}</p>}

          <button type="button" className={styles.signOut} onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MfaPage() {
  return (
    <React.Suspense fallback={null}>
      <MfaContent />
    </React.Suspense>
  );
}
