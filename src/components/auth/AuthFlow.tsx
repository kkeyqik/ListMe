'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, MailCheck, Phone, ShieldAlert, User } from 'lucide-react';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { useAuth, MIN_PASSWORD_LENGTH, type EmailCodePurpose } from '@/context/AuthContext';
import { Button, Input, OtpInput } from '@/components/ui';
import styles from './AuthFlow.module.css';

export type AuthView = 'signin' | 'signup' | 'code' | 'forgot' | 'new-password' | 'phone' | 'phone-code';

export interface AuthFlowProps {
  /** Where to send the user after signing in (also used by emailed links). */
  redirectPath?: string;
  /** Called once the user is signed in (or has set a new password). */
  onSuccess: () => void;
  initialView?: AuthView;
  initialEmail?: string;
  /** Problem to show above the form, e.g. from `?error=` on /login. */
  initialError?: 'suspended' | 'link_expired' | 'auth_failed' | null;
  brandName?: string;
  /** Smaller heading, for the modal. */
  compact?: boolean;
}

const RESEND_SECONDS = 60;

/** Phone sign-in is offered only when Firebase is configured (inlined at build time). */
const PHONE_SIGN_IN_ENABLED = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const TITLES: Record<AuthView, string> = {
  signin: 'Welcome back',
  signup: 'Create your account',
  code: 'Check your email',
  forgot: 'Reset your password',
  'new-password': 'Choose a new password',
  phone: 'Sign in with phone',
  'phone-code': 'Enter the SMS code',
};

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The whole email-first sign-in experience, shared by /login and the
 * sign-in modal: Google, email + password, email code, sign-up, password
 * reset, and phone sign-in for older phone-only accounts.
 */
export function AuthFlow({
  redirectPath = '/dashboard',
  onSuccess,
  initialView = 'signin',
  initialEmail = '',
  initialError = null,
  brandName = 'ListMe',
  compact = false,
}: AuthFlowProps) {
  const auth = useAuth();
  const recaptchaId = `recaptcha-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;

  const [view, setView] = useState<AuthView>(initialView);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [codePurpose, setCodePurpose] = useState<EmailCodePurpose>('login');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  const go = (next: AuthView) => {
    setError(null);
    setInfo(null);
    setCode('');
    setPassword('');
    setShowPassword(false);
    setView(next);
  };

  const cleanEmail = email.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(cleanEmail);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      console.error('[AuthFlow]', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (purpose: EmailCodePurpose) =>
    run(async () => {
      if (!emailValid) {
        setError('Enter a valid email address.');
        return;
      }
      const result = await auth.sendEmailCode(cleanEmail, purpose, { name: name.trim() || undefined, redirectPath });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      setCodePurpose(purpose);
      setCode('');
      setInfo(result.message ?? null);
      setResendIn(RESEND_SECONDS);
      setView('code');
    });

  const handleGoogle = () =>
    run(async () => {
      const { error: err } = await auth.signInWithGoogle(redirectPath);
      if (err) setError(err.message);
    });

  const handlePasswordSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!emailValid) {
        setError('Enter a valid email address.');
        return;
      }
      if (!password) {
        setError('Enter your password, or get a sign-in code by email.');
        return;
      }
      const { error: err } = await auth.signInWithPassword(cleanEmail, password);
      if (err) {
        setError(err.message);
        return;
      }
      onSuccess();
    });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (name.trim().length < 2) {
        setError('Enter your full name.');
        return;
      }
      if (!emailValid) {
        setError('Enter a valid email address.');
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      const result = await auth.signUpWithPassword(name, cleanEmail, password, redirectPath);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (result.needsConfirmation) {
        setCodePurpose('signup');
        setCode('');
        setInfo("We've sent a 6-digit code and a link to confirm your email.");
        setResendIn(RESEND_SECONDS);
        setView('code');
        return;
      }
      onSuccess();
    });
  };

  const handleVerifyCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    run(async () => {
      if (code.length !== 6) {
        setError('Enter the 6-digit code from the email.');
        return;
      }
      const { error: err } = await auth.verifyEmailCode(cleanEmail, code, codePurpose);
      if (err) {
        setError(err.message);
        return;
      }
      if (codePurpose === 'recovery') {
        go('new-password');
        return;
      }
      onSuccess();
    });
  };

  const handleNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      const { error: err } = await auth.updatePassword(password);
      if (err) {
        setError(err.message);
        return;
      }
      onSuccess();
    });
  };

  const handleSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const digits = phone.replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) {
        setError('Enter your 10-digit mobile number.');
        return;
      }
      const [{ getFirebaseAuth }, { RecaptchaVerifier: Verifier, signInWithPhoneNumber }] = await Promise.all([
        import('@/lib/firebase/client'),
        import('firebase/auth'),
      ]);
      const firebaseAuth = getFirebaseAuth();
      if (!firebaseAuth) {
        setError('Phone sign-in is not available right now. Sign in with your email instead.');
        return;
      }
      if (!recaptchaRef.current) {
        recaptchaRef.current = new Verifier(firebaseAuth, recaptchaId, { size: 'invisible' });
      }
      try {
        confirmationRef.current = await signInWithPhoneNumber(firebaseAuth, `+91${digits}`, recaptchaRef.current);
      } catch (err) {
        console.error('[AuthFlow] SMS send failed', err);
        recaptchaRef.current?.clear();
        recaptchaRef.current = null;
        setError('Could not send the SMS. Check the number and try again in a minute.');
        return;
      }
      setCode('');
      setResendIn(RESEND_SECONDS);
      setView('phone-code');
    });
  };

  const handleVerifySms = (e?: React.FormEvent) => {
    e?.preventDefault();
    run(async () => {
      if (code.length !== 6 || !confirmationRef.current) {
        setError('Enter the 6-digit code from the SMS.');
        return;
      }
      let idToken: string;
      try {
        const credential = await confirmationRef.current.confirm(code);
        idToken = await credential.user.getIdToken();
      } catch {
        setError('That code is wrong or has expired. Request a new one.');
        return;
      }
      const { error: err } = await auth.signInWithPhoneToken(idToken);
      if (err) {
        setError(err.message);
        return;
      }
      onSuccess();
    });
  };

  const passwordToggle = (
    <button
      type="button"
      className={styles.passwordToggle}
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  const subtitle: Partial<Record<AuthView, React.ReactNode>> = {
    signin: `Sign in to ${brandName} with Google or your email.`,
    signup: 'Free forever. No brokerage, no spam.',
    code: (
      <>
        {info || "We've sent a 6-digit code."} Sent to <strong>{cleanEmail}</strong>.
      </>
    ),
    forgot: "Enter your account email and we'll send you a reset code.",
    'new-password': `At least ${MIN_PASSWORD_LENGTH} characters. This signs you out on your other devices.`,
    phone: 'For accounts created with a mobile number before we moved to email.',
    'phone-code': `We've sent a code by SMS to +91 ${phone.replace(/\D/g, '').slice(-10)}.`,
  };

  const back = (to: AuthView, label = 'Back') => (
    <button type="button" className={styles.backButton} onClick={() => go(to)} disabled={busy}>
      <ArrowLeft size={16} /> {label}
    </button>
  );

  return (
    <div className={`${styles.flow} ${compact ? styles.compact : ''}`}>
      <div id={recaptchaId} className={styles.recaptcha} />

      {view !== 'signin' && view !== 'signup' && view !== 'new-password' &&
        back(view === 'phone-code' ? 'phone' : view === 'code' && codePurpose === 'signup' ? 'signup' : 'signin')}

      <div className={styles.header}>
        <h1 className={styles.title}>{TITLES[view]}</h1>
        <p className={styles.subtitle}>{subtitle[view]}</p>
      </div>

      {initialError === 'suspended' && view === 'signin' && (
        <div className={styles.noticeError} role="alert">
          <ShieldAlert size={20} className={styles.noticeIcon} />
          <div>
            <p className={styles.noticeTitle}>Account suspended</p>
            <p className={styles.noticeText}>
              This account can&apos;t sign in. <Link href="/contact">Contact support</Link> if you think this is a mistake.
            </p>
          </div>
        </div>
      )}
      {(initialError === 'link_expired' || initialError === 'auth_failed') && view === 'signin' && !error && (
        <div className={styles.noticeError} role="alert">
          <ShieldAlert size={20} className={styles.noticeIcon} />
          <p className={styles.noticeText}>That sign-in link has expired or was already used. Sign in again below.</p>
        </div>
      )}
      {error && (
        <div className={styles.noticeError} role="alert">
          <ShieldAlert size={20} className={styles.noticeIcon} />
          <p className={styles.noticeText}>{error}</p>
        </div>
      )}

      {(view === 'signin' || view === 'signup') && (
        <>
          <button type="button" className={styles.googleBtn} onClick={handleGoogle} disabled={busy}>
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>
          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>or use your email</span>
            <span className={styles.dividerLine} />
          </div>
        </>
      )}

      {view === 'signin' && (
        <form className={styles.form} onSubmit={handlePasswordSignIn} noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={18} />}
            placeholder="you@example.com"
            disabled={busy}
            fullWidth
            required
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={18} />}
            rightIcon={passwordToggle}
            placeholder="Your password"
            disabled={busy}
            fullWidth
          />
          <div className={styles.textLinks}>
            <button type="button" className={styles.linkButton} onClick={() => sendCode('login')} disabled={busy}>
              Email me a code instead
            </button>
            <button type="button" className={styles.mutedLink} onClick={() => go('forgot')} disabled={busy}>
              Forgot password?
            </button>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} rightIcon={<ArrowRight size={18} />}>
            Sign in
          </Button>
        </form>
      )}

      {view === 'signup' && (
        <form className={styles.form} onSubmit={handleSignUp} noValidate>
          <Input
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User size={18} />}
            placeholder="Your name"
            disabled={busy}
            fullWidth
            required
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={18} />}
            placeholder="you@example.com"
            disabled={busy}
            fullWidth
            required
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={18} />}
            rightIcon={passwordToggle}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            disabled={busy}
            fullWidth
            required
          />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} rightIcon={<ArrowRight size={18} />}>
            Create account
          </Button>
          <p className={styles.hint}>We&apos;ll email you a code to confirm your address.</p>
        </form>
      )}

      {view === 'code' && (
        <form className={styles.form} onSubmit={handleVerifyCode}>
          <div className={styles.noticeInfo}>
            <MailCheck size={20} className={styles.noticeIcon} />
            <p className={styles.noticeText}>Type the code below, or open the link in the email on this device.</p>
          </div>
          <div className={styles.otpWrap}>
            <OtpInput value={code} onChange={setCode} disabled={busy} error={!!error} />
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} disabled={code.length !== 6}>
            {codePurpose === 'recovery' ? 'Continue' : 'Verify and sign in'}
          </Button>
          <div className={styles.resendRow}>
            {resendIn > 0 ? (
              <span>You can request a new code in {resendIn}s</span>
            ) : (
              <>
                <span>No email? Check spam, or</span>
                <button type="button" className={styles.linkButton} onClick={() => sendCode(codePurpose)} disabled={busy}>
                  send a new code
                </button>
              </>
            )}
          </div>
        </form>
      )}

      {view === 'forgot' && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            sendCode('recovery');
          }}
          noValidate
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={18} />}
            placeholder="you@example.com"
            disabled={busy}
            fullWidth
            required
          />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} rightIcon={<ArrowRight size={18} />}>
            Send reset code
          </Button>
        </form>
      )}

      {view === 'new-password' && (
        <form className={styles.form} onSubmit={handleNewPassword} noValidate>
          <Input
            label="New password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={18} />}
            rightIcon={passwordToggle}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            disabled={busy}
            fullWidth
            required
          />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}>
            Save password
          </Button>
        </form>
      )}

      {view === 'phone' && (
        <form className={styles.form} onSubmit={handleSendSms} noValidate>
          <Input
            label="Mobile number"
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d\s+]/g, ''))}
            leftIcon={<Phone size={18} />}
            placeholder="10-digit mobile number"
            disabled={busy}
            fullWidth
            required
          />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} rightIcon={<ArrowRight size={18} />}>
            Send SMS code
          </Button>
          <p className={styles.hint}>New here? Create your account with email instead.</p>
        </form>
      )}

      {view === 'phone-code' && (
        <form className={styles.form} onSubmit={handleVerifySms}>
          <div className={styles.otpWrap}>
            <OtpInput value={code} onChange={setCode} disabled={busy} error={!!error} />
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} disabled={code.length !== 6}>
            Verify and sign in
          </Button>
          <div className={styles.resendRow}>
            {resendIn > 0 ? (
              <span>You can request a new code in {resendIn}s</span>
            ) : (
              <button type="button" className={styles.linkButton} onClick={() => go('phone')} disabled={busy}>
                Send a new code
              </button>
            )}
          </div>
        </form>
      )}

      {view === 'signin' && (
        <>
          <p className={styles.footer}>
            New to {brandName}?{' '}
            <button type="button" className={styles.linkButton} onClick={() => go('signup')}>
              Create an account
            </button>
          </p>
          {PHONE_SIGN_IN_ENABLED && (
            <p className={styles.footer}>
              <button type="button" className={styles.mutedLink} onClick={() => go('phone')}>
                Signed up with a mobile number? Sign in with phone
              </button>
            </p>
          )}
        </>
      )}

      {view === 'signup' && (
        <p className={styles.footer}>
          Already have an account?{' '}
          <button type="button" className={styles.linkButton} onClick={() => go('signin')}>
            Sign in
          </button>
        </p>
      )}
    </div>
  );
}

export default AuthFlow;
