'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

type Stage =
  | 'loading'
  | 'intro' // not enrolled yet
  | 'setup' // QR shown, waiting for first code
  | 'backup' // enrolled just now, show backup codes once
  | 'verify' // enrolled, enter code
  | 'error';

interface SetupData {
  secret: string;
  qrDataUrl: string;
}

function goTo(path: string) {
  // Full navigation so the proxy sees the new cookie.
  window.location.replace(path);
}

export default function AdminVerifyClient({ redirectTo }: { redirectTo: string }) {
  const { signOut } = useAuth();
  const [stage, setStage] = useState<Stage>('loading');
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/mfa/status', { cache: 'no-store' });
      if (res.status === 401) {
        goTo('/login?redirect=/admin-verify');
        return;
      }
      if (res.status === 403) {
        goTo('/dashboard');
        return;
      }
      if (!res.ok) throw new Error('status');
      const data = (await res.json()) as { enrolled: boolean; verified: boolean };
      if (data.verified) {
        goTo(redirectTo);
        return;
      }
      setStage(data.enrolled ? 'verify' : 'intro');
    } catch {
      setError('Could not load your account. Please refresh the page.');
      setStage('error');
    }
  }, [redirectTo]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data?.message?.includes('already')) {
        setStage('verify');
        return;
      }
      if (!res.ok) {
        setError(data?.message || 'Could not start set-up. Please try again.');
        return;
      }
      setSetup({ secret: data.secret, qrDataUrl: data.qrDataUrl });
      setCode('');
      setStage('setup');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const value = code.trim();
    if (!value) {
      setError('Enter the code');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || 'Invalid code. Please try again.');
        setCode('');
        return;
      }
      if (Array.isArray(data.backupCodes) && data.backupCodes.length > 0) {
        setBackupCodes(data.backupCodes);
        setStage('backup');
        return;
      }
      goTo(redirectTo);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the codes are still on screen.
    }
  };

  const codeInput = (
    <form onSubmit={submitCode} className={styles.form} noValidate>
      <Input
        label={useBackup ? 'Backup code' : '6-digit code from your authenticator app'}
        value={code}
        onChange={(e) => {
          const v = useBackup ? e.target.value.slice(0, 9) : e.target.value.replace(/\D/g, '').slice(0, 6);
          setCode(v);
          if (error) setError('');
        }}
        inputMode={useBackup ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={useBackup ? 'xxxx-xxxx' : '123456'}
        error={error || undefined}
        fullWidth
        autoFocus
        className={styles.codeInput}
      />
      <Button type="submit" fullWidth loading={busy} disabled={busy}>
        Verify
      </Button>
    </form>
  );

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap} aria-hidden="true">
          <ShieldCheck size={28} />
        </div>

        {stage === 'loading' && (
          <div className={styles.center}>
            <div className={styles.spinner} role="status" aria-label="Loading" />
          </div>
        )}

        {stage === 'error' && (
          <>
            <h1 className={styles.title}>Two-step verification</h1>
            <p className={styles.text} role="alert">{error}</p>
            <Button fullWidth onClick={() => window.location.reload()}>Try again</Button>
          </>
        )}

        {stage === 'intro' && (
          <>
            <h1 className={styles.title}>Set up two-step verification</h1>
            <p className={styles.text}>
              Admin accounts need a second check when signing in. You will use an authenticator app
              (Google Authenticator, Microsoft Authenticator, Authy or similar) on your phone to get a
              6-digit code.
            </p>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <Button fullWidth onClick={startSetup} loading={busy} disabled={busy}>
              Set up now
            </Button>
          </>
        )}

        {stage === 'setup' && setup && (
          <>
            <h1 className={styles.title}>Scan this QR code</h1>
            <ol className={styles.steps}>
              <li>Open your authenticator app and add a new account.</li>
              <li>Scan the QR code, or type the key below.</li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated on the server */}
            <img src={setup.qrDataUrl} alt="QR code for your authenticator app" className={styles.qr} width={200} height={200} />
            <p className={styles.label}>Can&apos;t scan? Enter this key:</p>
            <code className={styles.secret}>{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
            {codeInput}
          </>
        )}

        {stage === 'backup' && (
          <>
            <h1 className={styles.title}>Save your backup codes</h1>
            <p className={styles.text}>
              If you lose your phone, each of these codes lets you sign in once. Keep them somewhere
              safe. They will not be shown again.
            </p>
            <ul className={styles.backupList}>
              {backupCodes.map((c) => (
                <li key={c}><code>{c}</code></li>
              ))}
            </ul>
            <div className={styles.actions}>
              <Button
                variant="outline"
                fullWidth
                onClick={copyBackupCodes}
                leftIcon={copied ? <Check size={16} /> : <Copy size={16} />}
              >
                {copied ? 'Copied' : 'Copy codes'}
              </Button>
              <Button fullWidth onClick={() => goTo(redirectTo)}>
                I&apos;ve saved these
              </Button>
            </div>
          </>
        )}

        {stage === 'verify' && (
          <>
            <h1 className={styles.title}>Two-step verification</h1>
            <p className={styles.text}>
              {useBackup
                ? 'Enter one of your backup codes. Each code works only once.'
                : 'Open your authenticator app and enter the 6-digit code for ListMe.'}
            </p>
            {codeInput}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setUseBackup((v) => !v);
                setCode('');
                setError('');
              }}
            >
              {useBackup ? 'Use authenticator app instead' : 'Use a backup code'}
            </button>
          </>
        )}

        <div className={styles.footer}>
          <Link href="/dashboard">Go to my dashboard</Link>
          <span aria-hidden="true">·</span>
          <button type="button" className={styles.linkButton} onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
