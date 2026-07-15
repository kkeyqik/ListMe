'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  Building,
  Home,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast, Button, Input, OtpInput } from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase/client';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import styles from './AuthModal.module.css';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectPath?: string;
}

type AuthView = 'main' | 'otp' | 'email' | 'email-otp' | 'email-sent';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  redirectPath,
}) => {
  const { signInWithGoogle, signInWithEmail, verifyEmailOtp, refreshProfile, loginMockUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { settings } = useSettings();

  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<AuthView>('main');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isPhoneDetected, setIsPhoneDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  // Firebase auth state variables
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Mount state for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setView('main');
      setPhone('');
      setOtp('');
      setEmail('');
      setLoading(false);
      setTimer(0);
    }
  }, [isOpen]);

  // Escape key + body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Resend timer
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer((p) => p - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer]);

  // Initialize Recaptcha Verifier when view opens
  useEffect(() => {
    if (!isOpen) return;

    if (isFirebaseConfigured) {
      try {
        const auth = getFirebaseAuth();
        if (auth) {
          // Clear any stale recaptcha containers
          const container = document.getElementById('recaptcha-container-auth');
          if (container) {
            container.innerHTML = '';
          }

          const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-auth', {
            size: 'invisible',
            callback: () => {
              // Recaptcha resolved
            },
          });
          setRecaptchaVerifier(verifier);
        }
      } catch (err) {
        console.error('Failed to initialize recaptcha verifier in AuthModal:', err);
      }
    }
  }, [isOpen]);

  // Backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // ─── Handlers ────────────────────────────────

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    const clean = val.trim();
    if (!clean) {
      setIsPhoneDetected(false);
      return;
    }

    const hasLettersOrAt = /[a-zA-Z@]/.test(clean);
    const startsWithPlusOrDigit = /^[+\d]/.test(clean);

    if (startsWithPlusOrDigit && !hasLettersOrAt) {
      setIsPhoneDetected(true);
      // Auto-detect and switch selected country code
      if (clean.startsWith('+91')) {
        setCountryCode('+91');
      } else if (clean.startsWith('+1')) {
        setCountryCode('+1');
      } else if (clean.startsWith('91') && clean.length > 10) {
        setCountryCode('+91');
      } else if (clean.startsWith('1') && clean.length > 10) {
        setCountryCode('+1');
      }
    } else {
      setIsPhoneDetected(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = identifier.trim();
    if (!val) {
      showToast('Error', 'Please enter your email or phone number', 'error');
      return;
    }

    setLoading(true);

    // Check if the user is registered
    try {
      const response = await fetch(`/api/auth/check-user?identifier=${encodeURIComponent(val)}`);
      if (response.ok) {
        const data = await response.json();
        if (!data.registered) {
          showToast('Welcome!', 'Redirecting you to complete your profile registration...', 'info');
          onClose();
          
          let queryParam = '';
          if (val.includes('@')) {
            queryParam = `email=${encodeURIComponent(val)}`;
          } else {
            const cleanPhone = val.replace(/\D/g, '').slice(-10);
            queryParam = `phone=${encodeURIComponent(cleanPhone)}&countryCode=${encodeURIComponent(countryCode)}`;
          }
          
          router.push(`/login?step=signup&${queryParam}`);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error('Error checking user registration status:', err);
    }

    if (val.includes('@')) {
      // Email Flow
      if (!/\S+@\S+\.\S+/.test(val)) {
        showToast('Error', 'Please enter a valid email address', 'error');
        return;
      }
      setEmail(val);
      setLoading(true);

      // Track OTP request in DB
      fetch('/api/auth/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_OTP_EMAIL',
          metadata: { email: val },
        }),
      }).catch((e) => console.warn('Activity logging error:', e));

      const { error } = await signInWithEmail(val);
      setLoading(false);
      if (error) {
        showToast('Failed to send code', error.message || 'Could not send verification code', 'error');
      } else {
        setView('email-otp');
      }
    } else {
      // Phone Flow
      const cleanPhone = val.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        showToast('Error', 'Please enter a valid email or 10-digit mobile number', 'error');
        return;
      }
      const formattedPhoneNum = cleanPhone.slice(-10);
      const formattedPhone = countryCode + formattedPhoneNum;
      setPhone(formattedPhone); // Store full phone with country code for sync & verification
      setLoading(true);

      // Track OTP request in DB
      fetch('/api/auth/log-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_OTP_PHONE',
          metadata: { phone: formattedPhone, countryCode },
        }),
      }).catch((e) => console.warn('Activity logging error:', e));

      const testPhones = ['7777777777', '9999999999', '8888888888'];
      if (testPhones.includes(formattedPhoneNum)) {
        setView('otp');
        setTimer(30);
        setLoading(false);
        return;
      }

      if (isFirebaseConfigured) {
        const auth = getFirebaseAuth();
        if (auth && recaptchaVerifier) {
          try {
            const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
            setConfirmationResult(result);
            setView('otp');
            setTimer(30);
          } catch (error: any) {
            console.error('Firebase AuthModal send SMS error:', error);
            showToast('Failed to send OTP', error.message || 'OTP delivery error', 'error');
          }
        } else {
          showToast('Error', 'Firebase Auth system is not ready', 'error');
        }
      } else {
        // Mock / Simulated Flow for Development
        setView('otp');
        setTimer(30);
      }

      setLoading(false);
    }
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    if (val.length === 6) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleVerifyOtp(fakeEvent, val);
    }
  };

  const handleEmailOtpChange = (val: string) => {
    setOtp(val);
    if (val.length === 6) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleVerifyEmailOtp(fakeEvent, val);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent, otpVal?: string) => {
    e.preventDefault();
    const activeOtp = otpVal || otp;
    if (!activeOtp || activeOtp.length !== 6) {
      showToast('Error', 'Please enter the 6-digit code', 'error');
      return;
    }

    setLoading(true);
    let verifySuccess = false;

    if (isFirebaseConfigured && confirmationResult) {
      try {
        await confirmationResult.confirm(activeOtp);
        verifySuccess = true;
      } catch (error: any) {
        showToast('Failed', error.message || 'Incorrect OTP code', 'error');
      }
    } else {
      // Mock validation
      if (activeOtp === '123456') {
        verifySuccess = true;
      } else {
        showToast('Failed', 'Incorrect simulated OTP. Use 123456.', 'error');
      }
    }

    if (verifySuccess) {
      // Sync auth status with our backend database session handler
      try {
        const res = await fetch('/api/auth/firebase-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone.startsWith('+') ? phone : `+91${phone}`,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const isPlaceholder = 
            process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') ||
            process.env.NEXT_PUBLIC_SUPABASE_URL === undefined ||
            process.env.NEXT_PUBLIC_SUPABASE_URL === '';
          if (isPlaceholder && data?.profile) {
            loginMockUser(data.profile.id, data.profile);
          }
          await refreshProfile();
          showToast('Welcome!', 'You are now logged in and verified.', 'success');
          onClose();
          onSuccess?.();
          
          const role = data?.profile?.role || 'USER';
          if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            router.push('/admin');
          } else {
            router.push(redirectPath || '/dashboard');
          }
        } else {
          const errData = await res.json();
          showToast('Failed to start session', errData.message || 'Database sync error', 'error');
        }
      } catch (err) {
        console.error('Failed to authenticate session in postgres:', err);
        showToast('Error', 'Verification session sync failed', 'error');
      }
    }

    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    if (isFirebaseConfigured) {
      const auth = getFirebaseAuth();
      if (auth && recaptchaVerifier) {
        try {
          const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
          setConfirmationResult(result);
          setTimer(30);
        } catch (error: any) {
          showToast('Failed to resend OTP', error.message || 'Telephony error', 'error');
        }
      }
    } else {
      setTimer(30);
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle(redirectPath);
    if (error) {
      showToast('Failed', error.message || 'Google login failed', 'error');
    }
  };

  const handleSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Error', 'Please enter a valid email address', 'error');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email);
    setLoading(false);
    if (error) {
      showToast('Failed', error.message || 'Could not send verification code', 'error');
    } else {
      setView('email-otp');
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent, otpVal?: string) => {
    e.preventDefault();
    const activeOtp = otpVal || otp;
    if (!activeOtp || activeOtp.length !== 6) {
      showToast('Error', 'Please enter the 6-digit code', 'error');
      return;
    }
    setLoading(true);
    const { error } = await verifyEmailOtp(email, activeOtp);
    setLoading(false);
    if (error) {
      showToast('Failed', error.message || 'Incorrect OTP code', 'error');
    } else {
      showToast('Welcome!', 'You are now logged in.', 'success');
      onClose();
      onSuccess?.();
      
      // Auto redirect based on role
      try {
        const res = await fetch('/api/users/profile');
        if (res.ok) {
          const data = await res.json();
          const role = data?.profile?.role || 'USER';
          if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            router.push('/admin');
            return;
          }
        }
      } catch (err) {
        console.warn('Could not determine role for redirect:', err);
      }
      
      router.push(redirectPath || '/dashboard');
    }
  };

  // ─── Render ──────────────────────────────────

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-label="Login">
        {/* Invisible Recaptcha container for Firebase Web SDK */}
        <div id="recaptcha-container-auth" style={{ display: 'none' }} />

        {/* Close Button */}
        <button onClick={onClose} className={styles.closeBtn} aria-label="Close login">
          <X size={20} />
        </button>

        {/* ── MAIN VIEW: Unified Email/Phone + Social ── */}
        {view === 'main' && (
          <div className={styles.content}>
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <ShieldCheck size={28} />
              </div>
              <h2 className={styles.title}>Welcome to ListMe</h2>
              <p className={styles.subtitle}>Login or create an account</p>
            </div>

            {/* Unified Email/Phone Form */}
            <form onSubmit={handleSendOtp} className={styles.form}>
              <div>
                <label className={styles.inputLabel}>Email or Mobile Number</label>
                <div className={styles.customInputContainer}>
                  {isPhoneDetected && (
                    <div className={styles.countryCodeSelector}>
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className={styles.countrySelect}
                        disabled={loading}
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                      </select>
                      <div className={styles.selectorDivider} />
                    </div>
                  )}
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    placeholder="Enter your email or phone number"
                    className={styles.customInputField}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                rightIcon={<ArrowRight size={18} />}
              >
                Continue
              </Button>
            </form>

            {/* Divider */}
            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>or</span>
              <span className={styles.dividerLine} />
            </div>

            {/* Social Buttons */}
            <div className={styles.socialButtons}>
              <button
                type="button"
                className={styles.googleBtn}
                onClick={handleGoogleLogin}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Terms */}
            <p className={styles.terms}>
              By continuing, you agree to our{' '}
              <a href="/terms">Terms of Service</a> &{' '}
              <a href="/privacy">Privacy Policy</a>
            </p>
          </div>
        )}

        {/* ── OTP VERIFICATION VIEW ── */}
        {view === 'otp' && (
          <div className={styles.content}>
            <div className={styles.headerContainer}>
              <div className={styles.blueLogoSquare}>
                <Home size={22} color="#ffffff" strokeWidth={2.5} />
              </div>
              <h2 className={styles.welcomeBackTitle}>Welcome back. Enter the OTP sent to your phone number</h2>
              <div className={styles.phoneChangeRow}>
                <span className={styles.phoneDisplay}>+91 {phone}</span>
                <button
                  type="button"
                  className={styles.changeBtn}
                  onClick={() => { setView('main'); setOtp(''); }}
                >
                  Change
                </button>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className={styles.form}>
              <OtpInput
                value={otp}
                onChange={handleOtpChange}
                numInputs={6}
                disabled={loading}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                Verify & Continue
              </Button>
            </form>

            <div className={styles.otpFooter}>
              {timer > 0 ? (
                <span className={styles.resendTimerText}>Resend OTP in {timer}s</span>
              ) : (
                <button
                  type="button"
                  className={styles.resendTextBtn}
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── EMAIL MAGIC LINK VIEW ── */}
        {view === 'email' && (
          <div className={styles.content}>
            <div className={styles.header}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => { setView('main'); setEmail(''); }}
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
              <h2 className={styles.title}>Login with Email</h2>
              <p className={styles.subtitle}>
                We'll send a magic login link to your inbox
              </p>
            </div>

            <form onSubmit={handleSendEmailLink} className={styles.form}>
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail size={18} />}
                fullWidth
                required
                autoFocus
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                rightIcon={<ArrowRight size={18} />}
              >
                Send Verification Code
              </Button>
            </form>
          </div>
        )}

        {/* ── EMAIL OTP VERIFICATION VIEW ── */}
        {view === 'email-otp' && (
          <div className={styles.content}>
            <div className={styles.headerContainer}>
              <div className={styles.blueLogoSquare}>
                <Home size={22} color="#ffffff" strokeWidth={2.5} />
              </div>
              <h2 className={styles.welcomeBackTitle}>Welcome back. Enter the OTP sent to your email address</h2>
              <div className={styles.phoneChangeRow}>
                <span className={styles.phoneDisplay}>{email}</span>
                <button
                  type="button"
                  className={styles.changeBtn}
                  onClick={() => { setView('email'); setOtp(''); }}
                >
                  Change
                </button>
              </div>
            </div>

            <form onSubmit={handleVerifyEmailOtp} className={styles.form}>
              <OtpInput
                value={otp}
                onChange={handleEmailOtpChange}
                numInputs={6}
                disabled={loading}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                Verify & Continue
              </Button>
            </form>

            <div className={styles.otpFooter}>
              <button
                type="button"
                className={styles.resendTextBtn}
                onClick={handleSendEmailLink}
                disabled={loading}
              >
                Resend Code
              </button>
            </div>
          </div>
        )}

        {/* ── EMAIL SENT CONFIRMATION VIEW ── */}
        {view === 'email-sent' && (
          <div className={styles.content}>
            <div className={styles.successBlock}>
              <div className={styles.successIcon}>
                <CheckCircle size={40} />
              </div>
              <h2 className={styles.title}>Check Your Inbox</h2>
              <p className={styles.subtitle}>
                We've sent a login link to <strong>{email}</strong>. Click the link in the email to sign in.
              </p>
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default AuthModal;
