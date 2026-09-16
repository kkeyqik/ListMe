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
  MapPin,
  User,
  ChevronDown,
  MessageSquare,
  Eye,
  EyeOff,
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
  initialPhone?: string;
}

type AuthView = 'identifier' | 'credential' | 'otp' | 'email-otp' | 'signup' | 'fp-identifier' | 'fp-channel' | 'fp-otp' | 'fp-new-password' | 'fp-success';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  redirectPath,
  initialPhone,
}) => {
  const { signInWithGoogle, signInWithPassword, signInWithPhoneAndPassword, signInWithEmail, verifyEmailOtp, signInWithOtp, verifyOtp, refreshProfile, signUp } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const { settings } = useSettings();

  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<AuthView>('identifier');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('otp');
  const [identifier, setIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'phone'>('email');
  const [countryCode, setCountryCode] = useState('+91');
  const [isPhoneDetected, setIsPhoneDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [identifierError, setIdentifierError] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Signup form states
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');

  // Forgot Password flow states
  const [fpIdentifier, setFpIdentifier] = useState('');
  const [fpAccountInfo, setFpAccountInfo] = useState<{
    name: string;
    hasEmail: boolean;
    maskedEmail: string | null;
    hasPhone: boolean;
    maskedPhone: string | null;
    primaryChannel: 'sms' | 'email';
  } | null>(null);
  const [fpSelectedChannel, setFpSelectedChannel] = useState<'sms' | 'email'>('sms');
  const [fpOtp, setFpOtp] = useState('');
  const [fpResetToken, setFpResetToken] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpShowNewPassword, setFpShowNewPassword] = useState(false);
  const [fpShowConfirmPassword, setFpShowConfirmPassword] = useState(false);
  const [fpSentTarget, setFpSentTarget] = useState('');

  // Firebase auth state variables
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close country dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mount state for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when modal closes or prefill on open
  useEffect(() => {
    if (isOpen) {
      const prefillPhone = initialPhone || (typeof window !== 'undefined' ? window.sessionStorage.getItem('onboarding_phone') : '');
      const prefillEmail = typeof window !== 'undefined' ? window.sessionStorage.getItem('onboarding_email') : '';
      if (prefillPhone && prefillPhone.trim()) {
        const clean = prefillPhone.trim().replace('+91', '').trim();
        setIdentifier(clean);
        setIsPhoneDetected(true);
        setCountryCode('+91');
        setSignupPhone(clean);
        setLoginMethod('otp');
      } else if (prefillEmail && prefillEmail.trim()) {
        const cleanEmail = prefillEmail.trim();
        setIdentifier(cleanEmail);
        setIsPhoneDetected(false);
        setSignupEmail(cleanEmail);
        setLoginMethod('otp');
      }
    } else {
      setView('identifier');
      setLoginMethod('otp');
      setPhone('');
      setOtp('');
      setEmail('');
      setLoading(false);
      setTimer(0);
      setIdentifierError('');
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupPhone('');
    }
  }, [isOpen, initialPhone]);

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
          verifier.render().catch(() => {});
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

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (loginMethod === 'password') {
      let error;
      if (identifierType === 'email') {
        const res = await signInWithPassword(email, password);
        error = res.error;
      } else {
        const res = await signInWithPhoneAndPassword(phone, password);
        error = res.error;
      }

      if (error) {
        showToast('Failed', error.message || 'Invalid login credentials', 'error');
      } else {
        showToast('Welcome!', 'You are now logged in.', 'success');
        onClose();
        onSuccess?.();

        let role = 'USER';
        try {
          const profileRes = await fetch('/api/users/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            role = profileData?.profile?.role || profileData?.role || 'USER';
          }
        } catch {}

        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          window.location.href = '/admin';
        } else {
          window.location.href = redirectPath || '/dashboard';
        }
      }
      setLoading(false);
    } else {
      // Send OTP
      if (identifierType === 'email') {
        const res = await signInWithEmail(email);
        if (res.error) {
          showToast('Failed to send OTP', res.error.message || 'Something went wrong', 'error');
          setLoading(false);
        } else {
          setView('otp');
          setTimer(30);
          setLoading(false);
        }
      } else {
        // Firebase Phone OTP
        if (isFirebaseConfigured) {
          const auth = getFirebaseAuth();
          if (auth && recaptchaVerifier) {
            try {
              const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
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
    }
  };

  const handleModalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim()) {
      showToast('Error', 'Please enter your full name', 'error');
      return;
    }
    const cleanPhone = signupPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      showToast('Error', 'Please enter a valid 10-digit mobile number', 'error');
      return;
    }
    if (!signupEmail.trim() || !/\S+@\S+\.\S+/.test(signupEmail)) {
      showToast('Error', 'Please enter a valid email address', 'error');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      showToast('Error', 'Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    const formattedPhone = signupPhone.startsWith('+') ? signupPhone : `+91${cleanPhone.slice(-10)}`;
    const { error } = await signUp(signupName.trim(), formattedPhone, signupEmail.trim(), signupPassword);
    setLoading(false);

    if (error) {
      showToast('Registration Failed', typeof error === 'string' ? error : error.message || 'Something went wrong', 'error');
    } else {
      showToast('Welcome to ListMe!', 'Your account has been created successfully.', 'success');
      onClose();
      onSuccess?.();
      window.location.href = redirectPath || '/dashboard/listings/new';
    }
  };

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    if (identifierError) setIdentifierError('');
    const clean = val.trim();
    if (!clean) {
      setIsPhoneDetected(false);
      return;
    }

    const hasLettersOrAt = /[a-zA-Z@]/.test(clean);
    const startsWithPlusOrDigit = /^[+\d]/.test(clean);

    if (startsWithPlusOrDigit && !hasLettersOrAt) {
      setIsPhoneDetected(true);
      setLoginMethod('otp');
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

  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentifierError('');
    const val = identifier.trim();
    if (!val) {
      setIdentifierError('Please enter your email or phone number');
      return;
    }

    setLoading(true);
    let finalIdentifier = val;
    let type: 'email' | 'phone' = 'email';

    // Detect if it's a phone number
    if (/^[+\d]/.test(val) && !/[a-zA-Z@]/.test(val)) {
      type = 'phone';
      const cleanPhone = val.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        setIdentifierError('Please enter a valid 10-digit mobile number');
        setLoading(false);
        return;
      }
      finalIdentifier = countryCode + cleanPhone.slice(-10);
      setPhone(finalIdentifier);
    } else {
      setEmail(finalIdentifier);
    }
    
    setIdentifierType(type);

    // 1. Check user registration status across both phone and email
    let isRegistered = false;
    try {
      const checkRes = await fetch(`/api/auth/check-user?identifier=${encodeURIComponent(finalIdentifier)}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        isRegistered = Boolean(checkData.registered);
      } else {
        // Fallback: assume registered if check-user API fails so existing users aren't locked out
        isRegistered = true;
      }
    } catch (err) {
      console.warn('[handleIdentifierSubmit] check-user error:', err);
      isRegistered = true;
    }

    // 2. Auto-route unregistered users directly to the inline signup view
    if (!isRegistered) {
      if (type === 'phone') {
        const cleanPhone = val.replace(/\D/g, '').slice(-10);
        setSignupPhone(cleanPhone);
      } else {
        setSignupEmail(finalIdentifier);
      }
      showToast('Create an Account', 'No account found with this ' + (type === 'phone' ? 'number' : 'email') + '. Please create your account to proceed.', 'info');
      setView('signup');
      setLoading(false);
      return;
    }

    // 3. Registered user with Password Login
    if (loginMethod === 'password') {
      setView('credential');
      setLoading(false);
      return;
    }

    // 4. Registered user with OTP Login
    if (type === 'phone') {
      setLoginMethod('otp');

      if (isFirebaseConfigured) {
        const auth = getFirebaseAuth();
        if (auth && recaptchaVerifier) {
          try {
            const result = await signInWithPhoneNumber(auth, finalIdentifier, recaptchaVerifier);
            setConfirmationResult(result);
            setView('otp');
            setTimer(30);
          } catch (error: any) {
            console.error('Firebase AuthModal send SMS error:', error);
            showToast('OTP Unavailable', 'Please log in with your password instead.', 'info');
            setLoginMethod('password');
            setView('credential');
          }
        } else {
          showToast('OTP Unavailable', 'Please log in with your password.', 'info');
          setLoginMethod('password');
          setView('credential');
        }
      } else {
        // Mock / local development flow
        setView('otp');
        setTimer(30);
      }
    } else {
      // Email OTP flow
      try {
        const res = await signInWithEmail(finalIdentifier);
        if (!res.error) {
          setView('otp');
          setTimer(30);
        } else {
          showToast('Login Failed', res.error.message || 'Could not send verification email', 'error');
          setLoginMethod('password');
          setView('credential');
        }
      } catch (emailErr) {
        setLoginMethod('password');
        setView('credential');
      }
    }
    setLoading(false);
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    if (val.length === 6) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleVerifyOtp(fakeEvent, val);
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

    if (identifierType === 'email') {
      const res = await verifyEmailOtp(email, activeOtp);
      if (!res.error) {
        verifySuccess = true;
      } else {
        showToast('Failed', res.error.message || 'Incorrect OTP code', 'error');
      }
    } else if (isFirebaseConfigured && confirmationResult) {
      try {
        await confirmationResult.confirm(activeOtp);

        verifySuccess = true;

      } catch (error: any) {

        const msg = error.message?.includes('invalid-verification-code') ? 'Incorrect OTP. Please try again.' : error.message || 'Incorrect OTP code';

        showToast('Failed', msg, 'error');

      }
    } else if (process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH === 'true') {
      // Dev-only: Mock validation (gated behind build-time flag)
      if (activeOtp === '123456') {
        verifySuccess = true;
      } else {
        showToast('Failed', 'Incorrect simulated OTP. Use 123456.', 'error');
      }
    } else {
      // Firebase not configured and mock auth not enabled — fail hard
      showToast('Error', 'Phone verification service is not configured. Please contact support.', 'error');
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
          
          await refreshProfile();
          showToast('Welcome!', 'You are now logged in and verified.', 'success');
          onClose();
          onSuccess?.();
          
          const role = data?.profile?.role || 'USER';
          if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
            window.location.href = '/admin';
          } else {
            window.location.href = redirectPath || '/dashboard';
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
    if (identifierType === 'email') {
      const res = await signInWithEmail(email);
      if (!res.error) setTimer(30);
    } else {
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
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle(redirectPath);
    if (error) {
      showToast('Failed', error.message || 'Google login failed', 'error');
    }
  };

  // ── Forgot Password Handlers ──
  const handleFpLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpIdentifier.trim()) {
      showToast('Error', 'Please enter your email or mobile number', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: fpIdentifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.exists) {
        showToast('Account Not Found', data.message || 'No account found with this email or number.', 'error');
        return;
      }
      setFpAccountInfo(data);
      setFpSelectedChannel(data.primaryChannel);
      setView('fp-channel');
    } catch {
      showToast('Error', 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFpSendOtp = async (channelOverride?: 'sms' | 'email') => {
    const channel = channelOverride || fpSelectedChannel;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: fpIdentifier.trim(), channel }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Failed', data.message || 'Could not send OTP', 'error');
        return;
      }
      if (channel === 'sms' && isFirebaseConfigured && recaptchaVerifier && data.formattedPhone) {
        try {
          const auth = getFirebaseAuth();
          if (auth) {
            const confirmation = await signInWithPhoneNumber(auth, data.formattedPhone, recaptchaVerifier);
            setConfirmationResult(confirmation);
          }
        } catch (fbErr: any) {
          console.warn('[AuthModal FP] Firebase SMS fallback:', fbErr.message);
        }
      }
      setFpSentTarget(data.target || '');
      setFpSelectedChannel(channel);
      setFpOtp('');
      setView('fp-otp');
      setTimer(30);
    } catch {
      showToast('Error', 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFpVerifyOtp = async (otpVal?: string) => {
    const activeOtp = otpVal || fpOtp;
    if (!activeOtp || activeOtp.length !== 6) return;
    setLoading(true);
    try {
      if (fpSelectedChannel === 'sms' && confirmationResult) {
        try {
          await confirmationResult.confirm(activeOtp);
        } catch (fbErr: any) {
          showToast('Invalid Code', 'Incorrect OTP. Please try again.', 'error');
          setLoading(false);
          return;
        }
      }

      const res = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: fpIdentifier.trim(), channel: fpSelectedChannel, otp: activeOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Verification Failed', data.message || 'Incorrect code', 'error');
        return;
      }
      setFpResetToken(data.resetToken);
      setView('fp-new-password');
    } catch {
      showToast('Error', 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFpResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpNewPassword || fpNewPassword.length < 6) {
      showToast('Error', 'Password must be at least 6 characters', 'error');
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      showToast('Error', 'Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: fpResetToken, newPassword: fpNewPassword, confirmPassword: fpConfirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('Failed', data.message || 'Could not reset password', 'error');
        return;
      }
      await refreshProfile();
      setView('fp-success');
      showToast('Success!', 'Password reset successfully. You are now logged in.', 'success');
      setTimeout(() => {
        onClose();
        onSuccess?.();
        const role = data.profile?.role || 'USER';
        if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
          window.location.href = '/admin';
        } else {
          window.location.href = redirectPath || '/dashboard';
        }
      }, 2000);
    } catch {
      showToast('Error', 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
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
        {view === 'identifier' && (
          <div className={styles.content}>
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <ShieldCheck size={28} />
              </div>
              <h2 className={styles.title}>Welcome to ListMe</h2>
              <p className={styles.subtitle}>
                Login or{' '}
                <button
                  type="button"
                  onClick={() => {
                    setSignupPhone(identifier || phone || '');
                    setView('signup');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: 'inherit',
                    padding: 0
                  }}
                >
                  create an account
                </button>
              </p>
            </div>

            <form onSubmit={handleIdentifierSubmit} className={styles.form}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', background: 'var(--color-neutral-100)', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    background: loginMethod === 'password' ? '#ffffff' : 'transparent',
                    color: loginMethod === 'password' ? 'var(--color-primary)' : 'var(--color-neutral-600)',
                    boxShadow: loginMethod === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Password Login
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('otp')}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    background: loginMethod === 'otp' ? '#ffffff' : 'transparent',
                    color: loginMethod === 'otp' ? 'var(--color-primary)' : 'var(--color-neutral-600)',
                    boxShadow: loginMethod === 'otp' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  OTP Login
                </button>
              </div>

              <div>
                <label className={styles.inputLabel}>Email or Mobile Number</label>
                <div className={styles.customInputContainer}>
                  {isPhoneDetected && (
                    <>
                      <div className={styles.countryCodeSelector} ref={countryDropdownRef} style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className={styles.customCountryPane}
                          onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                          disabled={loading}
                        >
                          <span>{countryCode === '+91' ? '🇮🇳 +91' : '🇺🇸 +1'}</span>
                          <ChevronDown size={14} style={{ color: 'var(--color-neutral-500)', opacity: 0.8 }} />
                        </button>
                        {isCountryDropdownOpen && (
                          <div className={styles.customCountryDropdown}>
                            <button type="button" className={styles.customDropdownOption} onClick={() => { setCountryCode('+91'); setIsCountryDropdownOpen(false); }}>🇮🇳 +91</button>
                            <button type="button" className={styles.customDropdownOption} onClick={() => { setCountryCode('+1'); setIsCountryDropdownOpen(false); }}>🇺🇸 +1</button>
                          </div>
                        )}
                        <div className={styles.selectorDivider} />
                      </div>
                    </>
                  )}
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    placeholder="Enter email or 10-digit number"
                    className={styles.customInputField}
                    required
                    disabled={loading}
                  />
                </div>
                {identifierError && <p style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{identifierError}</p>}
              </div>
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rightIcon={<ArrowRight size={18} />}>
                {loginMethod === 'password' ? 'Continue with Password' : 'Send OTP'}
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

            {/* Sign Up Prompt */}
            <div style={{ textAlign: 'center', margin: '1.25rem 0 0.5rem', fontSize: '0.937rem' }}>
              <span style={{ color: 'var(--color-neutral-600)' }}>Don&apos;t have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setSignupPhone(identifier || phone || '');
                  setView('signup');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Sign Up / Create Account
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '0.25rem', fontSize: '0.85rem' }}>
              <button
                type="button"
                onClick={() => {
                  setFpIdentifier(identifier || phone || '');
                  setView('fp-identifier');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-neutral-500)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Forgot password?
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

        {/* ── CREDENTIAL VIEW ── */}
        {view === 'credential' && (
          <div className={styles.content}>
            <div className={styles.header}>
              <h2 className={styles.title}>Welcome Back</h2>
              <p className={styles.subtitle}>{identifierType === 'email' ? email : phone}</p>
            </div>

            <button type="button" onClick={() => setView('identifier')} style={{ background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', marginBottom: '20px', fontSize: '14px' }}>
              ← Change {identifierType === 'email' ? 'email' : 'number'}
            </button>

            <form onSubmit={handleCredentialSubmit} className={styles.form}>
              {loginMethod === 'password' && (
                <>
                  <Input
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setFpIdentifier(identifier || email || phone || '');
                        setView('fp-identifier');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-neutral-500)',
                        cursor: 'pointer',
                        fontSize: '0.825rem',
                        padding: 0,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              )}
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rightIcon={<ArrowRight size={18} />}>
                {loginMethod === 'password' ? 'Login' : 'Send OTP'}
              </Button>
              
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button type="button" onClick={() => setLoginMethod(loginMethod === 'password' ? 'otp' : 'password')} style={{ background: 'none', border: 'none', color: 'var(--color-primary-500)', cursor: 'pointer', fontWeight: 500 }}>
                  Login with {loginMethod === 'password' ? 'OTP' : 'Password'} instead
                </button>
              </div>

              <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.937rem' }}>
                <span style={{ color: 'var(--color-neutral-600)' }}>Don&apos;t have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setSignupPhone(phone || identifier || '');
                    setView('signup');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Create an account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── OTP VERIFICATION VIEW ── */}
        {view === 'otp' && (
          <div className={styles.content}>
            <div className={styles.headerContainer}>
              <div className={styles.blueLogoSquare}>
                <Home size={22} color="#ffffff" strokeWidth={2.5} />
              </div>
              <h2 className={styles.welcomeBackTitle}>Welcome back. Enter the OTP sent to your {identifierType}</h2>
              <div className={styles.phoneChangeRow}>
                <span className={styles.phoneDisplay}>{identifierType === 'email' ? email : `+91 ${phone}`}</span>
                <button
                  type="button"
                  className={styles.changeBtn}
                  onClick={() => { setView('identifier'); setOtp(''); }}
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
              <div style={{ marginTop: 12, textAlign: 'center', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('password');
                    setView('credential');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary-500)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Login with Password instead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SIGNUP VIEW ── */}
        {view === 'signup' && (
          <div className={styles.content}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setView('identifier')}
            >
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </button>

            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <ShieldCheck size={28} />
              </div>
              <h2 className={styles.title}>Create an Account</h2>
              <p className={styles.subtitle}>Join ListMe to post listings and connect directly with verified buyers & owners</p>
            </div>

            <form onSubmit={handleModalSignup} className={styles.form}>
              <Input
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                leftIcon={<User size={18} />}
                fullWidth
                required
              />

              <Input
                label="Mobile Number"
                type="tel"
                placeholder="10-digit mobile number"
                value={signupPhone}
                onChange={(e) => setSignupPhone(e.target.value)}
                leftIcon={<Phone size={18} />}
                fullWidth
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                leftIcon={<Mail size={18} />}
                fullWidth
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                fullWidth
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                rightIcon={<ArrowRight size={18} />}
              >
                Create Account & Continue
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

            {/* Login Prompt */}
            <div style={{ textAlign: 'center', margin: '0.5rem 0 0', fontSize: '0.937rem' }}>
              <span style={{ color: 'var(--color-neutral-600)' }}>Already have an account? </span>
              <button
                type="button"
                onClick={() => setView('identifier')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Log In
              </button>
            </div>

            {/* Terms */}
            <p className={styles.terms}>
              By signing up, you agree to our{' '}
              <a href="/terms">Terms of Service</a> &{' '}
              <a href="/privacy">Privacy Policy</a>
            </p>
          </div>
        )}

        {/* ── FORGOT PASSWORD: IDENTIFIER ── */}
        {view === 'fp-identifier' && (
          <div className={styles.content}>
            <div className={styles.header}>
              <h2 className={styles.title}>Forgot Password?</h2>
              <p className={styles.subtitle}>Enter your registered email or mobile number to reset your password.</p>
            </div>

            <button type="button" onClick={() => setView('identifier')} style={{ background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', marginBottom: '16px', fontSize: '14px' }}>
              ← Back to Login
            </button>

            <form onSubmit={handleFpLookup} className={styles.form}>
              <Input
                label="Email or Mobile Number"
                type="text"
                placeholder="Enter email or 10-digit number"
                value={fpIdentifier}
                onChange={(e) => setFpIdentifier(e.target.value)}
                fullWidth
                required
                disabled={loading}
              />
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rightIcon={<ArrowRight size={18} />}>
                Find My Account
              </Button>
            </form>
          </div>
        )}

        {/* ── FORGOT PASSWORD: DUAL CHANNEL SELECTION ── */}
        {view === 'fp-channel' && fpAccountInfo && (
          <div className={styles.content}>
            <div className={styles.header}>
              <h2 className={styles.title}>Choose Verification Method</h2>
              <p className={styles.subtitle}>
                Hi <strong>{fpAccountInfo.name}</strong>, select where you want to receive your OTP code:
              </p>
            </div>

            <div className={styles.channelGrid}>
              {/* SMS Card */}
              {fpAccountInfo.hasPhone && (
                <button
                  type="button"
                  className={`${styles.channelCard} ${fpSelectedChannel === 'sms' ? styles.channelCardSelected : ''}`}
                  onClick={() => setFpSelectedChannel('sms')}
                  disabled={loading}
                >
                  <div className={styles.channelIcon}>
                    <MessageSquare size={20} />
                  </div>
                  <div className={styles.channelInfo}>
                    <div className={styles.channelTitle}>SMS Verification</div>
                    <div className={styles.channelSub}>Send code to {fpAccountInfo.maskedPhone}</div>
                  </div>
                  <div className={`${styles.channelRadio} ${fpSelectedChannel === 'sms' ? styles.channelRadioSelected : ''}`} />
                </button>
              )}

              {/* Email Card */}
              {fpAccountInfo.hasEmail && (
                <button
                  type="button"
                  className={`${styles.channelCard} ${fpSelectedChannel === 'email' ? styles.channelCardSelected : ''}`}
                  onClick={() => setFpSelectedChannel('email')}
                  disabled={loading}
                >
                  <div className={styles.channelIcon}>
                    <Mail size={20} />
                  </div>
                  <div className={styles.channelInfo}>
                    <div className={styles.channelTitle}>Email Verification</div>
                    <div className={styles.channelSub}>Send code to {fpAccountInfo.maskedEmail}</div>
                  </div>
                  <div className={`${styles.channelRadio} ${fpSelectedChannel === 'email' ? styles.channelRadioSelected : ''}`} />
                </button>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              onClick={() => handleFpSendOtp()}
              rightIcon={<ArrowRight size={18} />}
            >
              Send OTP Code
            </Button>

            <button
              type="button"
              onClick={() => setView('fp-identifier')}
              style={{ background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: '14px', textAlign: 'center' }}
            >
              ← Use a different email or number
            </button>
          </div>
        )}

        {/* ── FORGOT PASSWORD: OTP ENTRY ── */}
        {view === 'fp-otp' && (
          <div className={styles.content}>
            <div className={styles.header}>
              <h2 className={styles.title}>Enter 6-Digit Code</h2>
              <p className={styles.subtitle}>
                We sent a 6-digit code {fpSelectedChannel === 'sms' ? 'via SMS' : 'via Email'} to{' '}
                <strong>{fpSentTarget}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <OtpInput
                value={fpOtp}
                onChange={(val) => {
                  setFpOtp(val);
                  if (val.length === 6) handleFpVerifyOtp(val);
                }}
                numInputs={6}
                disabled={loading}
                autoFocus
              />
            </div>

            {loading && (
              <p style={{ textAlign: 'center', color: 'var(--color-neutral-500)', fontSize: '0.875rem' }}>Verifying code...</p>
            )}

            <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
              {timer > 0 ? (
                <span style={{ color: 'var(--color-neutral-500)' }}>Resend code in {timer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleFpSendOtp()}
                  disabled={loading}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Resend Code
                </button>
              )}
            </div>

            {fpAccountInfo && (
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleFpSendOtp(fpSelectedChannel === 'sms' ? 'email' : 'sms')}
                  disabled={loading || (fpSelectedChannel === 'sms' ? !fpAccountInfo.hasEmail : !fpAccountInfo.hasPhone)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: '0.825rem' }}
                >
                  Send via {fpSelectedChannel === 'sms' ? 'Email' : 'SMS'} instead
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setView('fp-channel')}
              style={{ background: 'none', border: 'none', color: 'var(--color-neutral-500)', cursor: 'pointer', fontSize: '14px', textAlign: 'center' }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* ── FORGOT PASSWORD: NEW PASSWORD ── */}
        {view === 'fp-new-password' && (
          <div className={styles.content}>
            <div className={styles.header}>
              <h2 className={styles.title}>Set New Password</h2>
              <p className={styles.subtitle}>Enter and confirm your new secure password.</p>
            </div>

            <form onSubmit={handleFpResetPassword} className={styles.form}>
              <div style={{ position: 'relative' }}>
                <Input
                  label="New Password"
                  type={fpShowNewPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={fpNewPassword}
                  onChange={(e) => setFpNewPassword(e.target.value)}
                  fullWidth
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setFpShowNewPassword(!fpShowNewPassword)}
                  style={{ position: 'absolute', right: 12, top: 36, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-500)', padding: 4 }}
                >
                  {fpShowNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <Input
                  label="Confirm Password"
                  type={fpShowConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={fpConfirmPassword}
                  onChange={(e) => setFpConfirmPassword(e.target.value)}
                  fullWidth
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setFpShowConfirmPassword(!fpShowConfirmPassword)}
                  style={{ position: 'absolute', right: 12, top: 36, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-500)', padding: 4 }}
                >
                  {fpShowConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                rightIcon={<CheckCircle size={18} />}
                disabled={fpNewPassword.length < 6 || fpNewPassword !== fpConfirmPassword}
              >
                Reset Password & Login
              </Button>
            </form>
          </div>
        )}

        {/* ── FORGOT PASSWORD: SUCCESS ── */}
        {view === 'fp-success' && (
          <div className={styles.content} style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={40} />
            </div>
            <h2 className={styles.title}>Password Reset!</h2>
            <p className={styles.subtitle}>Your password has been changed. You are now logged in and being redirected...</p>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default AuthModal;
