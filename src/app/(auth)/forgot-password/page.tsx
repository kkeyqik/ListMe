'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, Mail, Phone, ArrowRight, ArrowLeft, CheckCircle, Eye, EyeOff, MessageSquare } from 'lucide-react';
import { Button, Input, OtpInput } from '@/components/ui';
import { useToast } from '@/components/ui';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import styles from '../auth.module.css';
import fpStyles from './ForgotPassword.module.css';

type Step = 'identifier' | 'channel' | 'otp' | 'new-password' | 'success';

interface AccountInfo {
  name: string;
  hasEmail: boolean;
  maskedEmail: string | null;
  hasPhone: boolean;
  maskedPhone: string | null;
  primaryChannel: 'sms' | 'email';
}

const testimonials = [
  { name: 'Priya Sharma', handle: '@priyasharma', initials: 'PS', text: 'Found my dream apartment in Bangalore within a week. Direct owner contact saved me lakhs in brokerage!' },
  { name: 'Rahul Verma', handle: '@rahulverma', initials: 'RV', text: 'Listed my property and got 12 genuine inquiries in 3 days. Clean design, powerful features.' },
  { name: 'Anita Desai', handle: '@anitadesai', initials: 'AD', text: "Best real estate platform I've used. Intuitive, reliable, and genuinely helpful." },
];

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'sms' | 'email'>('sms');
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [sentTarget, setSentTarget] = useState('');
  const [firebaseConfirmation, setFirebaseConfirmation] = useState<any>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isFirebaseConfigured) {
      try {
        const auth = getFirebaseAuth();
        if (auth) {
          const container = document.getElementById('fp-recaptcha-container');
          if (container) container.innerHTML = '';
          const verifier = new RecaptchaVerifier(auth, 'fp-recaptcha-container', {
            size: 'invisible',
            callback: () => {},
          });
          verifier.render().catch(() => {});
          setRecaptchaVerifier(verifier);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    const prefill = searchParams.get('prefill') || searchParams.get('identifier');
    if (prefill) {
      setIdentifier(prefill);
    }
  }, [searchParams]);

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer((p) => p - 1), 1000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timer]);

  // Step 1: Lookup account
  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      showToast('Error', 'Please enter your email or mobile number', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.exists) {
        showToast('Account Not Found', data.message || 'No account found with this email or number.', 'error');
        return;
      }
      setAccountInfo(data);
      setSelectedChannel(data.primaryChannel);
      setStep('channel');
    } catch {
      showToast('Error', 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Send OTP via selected channel
  const handleSendOtp = async (channelOverride?: 'sms' | 'email') => {
    const channel = channelOverride || selectedChannel;
    setLoading(true);
    try {
      // For SMS via Firebase, handle client-side dispatch
      if (channel === 'sms' && isFirebaseConfigured && recaptchaVerifier) {
        const accountPhone = accountInfo?.maskedPhone || '';
        // We do server-side lookup to get the raw phone, then Firebase sends SMS
        const res = await fetch('/api/auth/forgot-password/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim(), channel }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast('Failed', data.message || 'Could not send OTP', 'error');
          setLoading(false);
          return;
        }
        // If Firebase-configured, also initiate Firebase phone auth for SMS
        if (data.formattedPhone) {
          try {
            const auth = getFirebaseAuth();
            if (auth && recaptchaVerifier) {
              const confirmation = await signInWithPhoneNumber(auth, data.formattedPhone, recaptchaVerifier);
              setFirebaseConfirmation(confirmation);
            }
          } catch (fbErr: any) {
            console.warn('[FP] Firebase SMS fallback failed:', fbErr.message);
          }
        }
        setSentTarget(data.target || accountInfo?.maskedPhone || '');
        setSelectedChannel(channel);
        setOtp('');
        setStep('otp');
        setTimer(30);
      } else {
        // Email OTP or SMS without Firebase
        const res = await fetch('/api/auth/forgot-password/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim(), channel }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast('Failed', data.message || 'Could not send OTP', 'error');
          return;
        }
        setSentTarget(data.target || '');
        setSelectedChannel(channel);
        setOtp('');
        setStep('otp');
        setTimer(30);
      }
    } catch {
      showToast('Error', 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP
  const handleVerifyOtp = async (otpVal?: string) => {
    const activeOtp = otpVal || otp;
    if (!activeOtp || activeOtp.length !== 6) return;
    setLoading(true);
    try {
      let firebaseIdToken: string | undefined = undefined;
      // If Firebase SMS, verify via Firebase confirmation first
      if (selectedChannel === 'sms' && firebaseConfirmation) {
        try {
          const userCredential = await firebaseConfirmation.confirm(activeOtp);
          firebaseIdToken = await userCredential.user.getIdToken();
        } catch (fbErr: any) {
          showToast('Invalid Code', 'Incorrect OTP. Please try again.', 'error');
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          channel: selectedChannel,
          otp: activeOtp,
          firebaseIdToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Verification Failed', data.message || 'Incorrect code', 'error');
        return;
      }
      setResetToken(data.resetToken);
      setStep('new-password');
    } catch {
      showToast('Error', 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    if (val.length === 6) handleVerifyOtp(val);
  };

  // Step 4: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('Error', 'Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Error', 'Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Failed', data.message || 'Could not reset password', 'error');
        return;
      }
      setStep('success');
      setTimeout(() => {
        const role = data.profile?.role || 'USER';
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          window.location.href = '/admin';
        } else {
          const redirectParam = searchParams.get('redirect');
          const dest = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/dashboard';
          window.location.href = dest;
        }
      }, 2500);
    } catch {
      showToast('Error', 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordStrong = newPassword.length >= 6;

  return (
    <div className={styles.splitContainer}>
      <div id="fp-recaptcha-container" style={{ display: 'none' }} />

      {/* Left Hero Panel */}
      <div className={styles.heroPanel}>
        <Image src="/images/login-hero.png" alt="ListMe" fill priority className={styles.heroImage} />
        <div className={styles.heroOverlay} />
        <Link href="/" className={styles.heroBrandLink}>
          <div className={styles.heroBrandRow}>
            <div className={styles.heroBrandIcon}><Home size={20} /></div>
            <span className={styles.heroBrandName}>ListMe</span>
          </div>
        </Link>
        <div className={styles.heroContent}>
          <h2 className={styles.heroTagline}>Secure password reset, right from your account.</h2>
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

      {/* Right Form Panel */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>

          {/* ── STEP 1: Identifier ── */}
          {step === 'identifier' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Forgot Password?</h1>
                <p className={styles.subtitle}>Enter your registered email or mobile number to get started.</p>
              </div>
              <form onSubmit={handleIdentifierSubmit} className={styles.form}>
                <Input
                  label="Email or Mobile Number"
                  type="text"
                  placeholder="Enter email or 10-digit number"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  fullWidth
                  required
                  disabled={loading}
                />
                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rightIcon={<ArrowRight size={18} />}>
                  Find My Account
                </Button>
              </form>
              <div style={{ textAlign: 'center' }}>
                <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none' }}>
                  ← Back to Login
                </Link>
              </div>
            </>
          )}

          {/* ── STEP 2: Channel Selection ── */}
          {step === 'channel' && accountInfo && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>How to verify?</h1>
                <p className={styles.subtitle}>
                  Hi <strong>{accountInfo.name}</strong>, choose how you&apos;d like to receive your verification code.
                </p>
              </div>

              <div className={fpStyles.channelGrid} role="radiogroup" aria-label="Verification method">
                {/* SMS Card */}
                {accountInfo.hasPhone && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedChannel === 'sms'}
                    className={`${fpStyles.channelCard} ${selectedChannel === 'sms' ? fpStyles.channelCardSelected : ''}`}
                    onClick={() => setSelectedChannel('sms')}
                    disabled={loading}
                  >
                    <div className={fpStyles.channelIcon}>
                      <MessageSquare size={22} />
                    </div>
                    <div className={fpStyles.channelInfo}>
                      <div className={fpStyles.channelTitle}>SMS Verification</div>
                      <div className={fpStyles.channelSub}>Send code to {accountInfo.maskedPhone}</div>
                    </div>
                    <div className={`${fpStyles.channelRadio} ${selectedChannel === 'sms' ? fpStyles.channelRadioSelected : ''}`} />
                  </button>
                )}

                {/* Email Card */}
                {accountInfo.hasEmail && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedChannel === 'email'}
                    className={`${fpStyles.channelCard} ${selectedChannel === 'email' ? fpStyles.channelCardSelected : ''}`}
                    onClick={() => setSelectedChannel('email')}
                    disabled={loading}
                  >
                    <div className={fpStyles.channelIcon}>
                      <Mail size={22} />
                    </div>
                    <div className={fpStyles.channelInfo}>
                      <div className={fpStyles.channelTitle}>Email Verification</div>
                      <div className={fpStyles.channelSub}>Send code to {accountInfo.maskedEmail}</div>
                    </div>
                    <div className={`${fpStyles.channelRadio} ${selectedChannel === 'email' ? fpStyles.channelRadioSelected : ''}`} />
                  </button>
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onClick={() => handleSendOtp()}
                rightIcon={<ArrowRight size={18} />}
              >
                Send Verification Code
              </Button>

              <button
                type="button"
                onClick={() => setStep('identifier')}
                style={{ background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'center', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ← Use a different email or number
              </button>
            </>
          )}

          {/* ── STEP 3: OTP Verification ── */}
          {step === 'otp' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Enter Verification Code</h1>
                <p className={styles.subtitle}>
                  We sent a 6-digit code {selectedChannel === 'sms' ? 'via SMS' : 'via Email'} to{' '}
                  <strong>{sentTarget}</strong>. It expires in 10 minutes.
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                  <OtpInput value={otp} onChange={handleOtpChange} numInputs={6} disabled={loading} autoFocus />
                </div>

                {loading && (
                  <p style={{ textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: '0.875rem' }}>Verifying...</p>
                )}

                <div style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '12px' }}>
                  {timer > 0 ? (
                    <span style={{ color: 'var(--color-neutral-500)', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>Resend in {timer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={loading}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600, minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
                    >
                      Resend Code
                    </button>
                  )}
                </div>
              </form>

              {/* Switch channel — only shown if both email and phone are present on account */}
              {accountInfo && accountInfo.hasEmail && accountInfo.hasPhone && (
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleSendOtp(selectedChannel === 'sms' ? 'email' : 'sms')}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: '0.85rem', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    Send via {selectedChannel === 'sms' ? 'Email' : 'SMS'} instead
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep('channel')}
                style={{ background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'center', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ← Back
              </button>
            </>
          )}

          {/* ── STEP 4: New Password ── */}
          {step === 'new-password' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Set New Password</h1>
                <p className={styles.subtitle}>Create a strong, unique password for your account.</p>
              </div>

              <form onSubmit={handleResetPassword} className={styles.form}>
                <div style={{ position: 'relative' }}>
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    style={{ position: 'absolute', right: 4, top: 26, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-500)', padding: 0 }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    style={{ position: 'absolute', right: 4, top: 26, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-500)', padding: 0 }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Requirements checklist */}
                <div className={fpStyles.requirementsList}>
                  <div className={`${fpStyles.requirement} ${passwordStrong ? fpStyles.requirementMet : ''}`}>
                    <span className={fpStyles.requirementDot} />
                    At least 6 characters
                  </div>
                  <div className={`${fpStyles.requirement} ${passwordsMatch ? fpStyles.requirementMet : ''}`}>
                    <span className={fpStyles.requirementDot} />
                    Passwords match
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  rightIcon={<CheckCircle size={18} />}
                  disabled={!passwordStrong || !passwordsMatch}
                >
                  Reset Password &amp; Login
                </Button>
              </form>
            </>
          )}

          {/* ── STEP 5: Success ── */}
          {step === 'success' && (
            <div className={fpStyles.successContainer}>
              <div className={fpStyles.successIcon}>
                <CheckCircle size={48} strokeWidth={1.5} />
              </div>
              <h1 className={styles.title} style={{ textAlign: 'center' }}>Password Reset!</h1>
              <p className={styles.subtitle} style={{ textAlign: 'center' }}>
                Your password has been updated. You are now logged in and will be redirected shortly.
              </p>
              <div className={fpStyles.redirectNote}>Redirecting to your dashboard...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--color-neutral-900)' }} />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
