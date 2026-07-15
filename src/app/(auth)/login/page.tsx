'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, ArrowRight, Home, Mail, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast, Button, Input, OtpInput } from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import { createClient } from '@/lib/supabase/client';
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

function LoginContent() {
  const { user, profile, loading: authLoading, signInWithOtp, verifyOtp, signInWithGoogle, signInWithEmail, verifyEmailOtp, loginMockUser, refreshProfile, signUp } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [isPhoneDetected, setIsPhoneDetected] = useState(false);
  const [step, setStep] = useState<'main' | 'otp' | 'email' | 'email-otp' | 'signup' | 'signup-otp'>('main');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      const role = profile?.role || 'USER';
      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push(redirectPath);
      }
    }
  }, [user, profile, authLoading, redirectPath, router]);

  // Read phone from searchParams or secure sessionStorage on mount
  useEffect(() => {
    const queryPhone = searchParams.get('phone');
    if (queryPhone) {
      setPhone(queryPhone);
    } else if (typeof window !== 'undefined') {
      const storedPhone = window.sessionStorage.getItem('onboarding_phone');
      if (storedPhone) {
        setPhone(storedPhone);
        window.sessionStorage.removeItem('onboarding_phone');
      }
    }
  }, [searchParams]);

  // Handle timer countdown
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timer]);

  // Phone submission handler
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

  // Unified email/phone submission handler
  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = identifier.trim();
    if (!val) {
      showToast('Error', 'Please enter your email or phone number', 'error');
      return;
    }

    // Determine if email or phone number
    if (val.includes('@')) {
      // Validate email format
      if (!/\S+@\S+\.\S+/.test(val)) {
        showToast('Error', 'Please enter a valid email address', 'error');
        return;
      }
      setEmail(val);
      setLoading(true);
      const { error } = await signInWithEmail(val);
      setLoading(false);

      if (error) {
        showToast('Failed to send code', error.message || 'Could not send verification code', 'error');
      } else {
        showToast('Code Sent', 'Check your inbox for a 6-digit OTP code', 'success');
        setStep('email-otp');
      }
    } else {
      // Clean digits from phone number
      const cleanPhone = val.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        showToast('Error', 'Please enter a valid email or 10-digit mobile number', 'error');
        return;
      }
      // Keep only the last 10 digits
      const localNum = cleanPhone.slice(-10);
      const formattedPhone = countryCode + localNum;
      setPhone(formattedPhone); // Store full phone with country code for verifyOtp
      setLoading(true);

      if (localNum === '7777777777' || localNum === '9999999999' || localNum === '8888888888') {
        showToast('OTP Sent (Bypassed)', 'Test number detected. Use OTP 123456.', 'success');
        setStep('otp');
        setTimer(30);
        setLoading(false);
        return;
      }

      const { error } = await signInWithOtp(formattedPhone);
      setLoading(false);

      if (error) {
        showToast('Failed to send OTP', error.message || 'Something went wrong', 'error');
      } else {
        showToast('OTP Sent', `Verification code has been sent to ${formattedPhone}`, 'success');
        setStep('otp');
        setTimer(30);
      }
    }
  };

  // OTP verification handler
  const handleOtpSubmit = async (e: React.FormEvent, otpVal?: string) => {
    e.preventDefault();
    const activeOtp = otpVal || otp;
    if (!activeOtp || activeOtp.length !== 6) {
      showToast('Error', 'Please enter a valid 6-digit code', 'error');
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(phone, activeOtp);
    setLoading(false);

    if (error) {
      showToast('Verification Failed', error.message || 'Incorrect OTP. Try again.', 'error');
    } else {
      showToast('Login Successful', 'Welcome back to ListMe!', 'success');

      let userId: string | null = null;
      let profileData: any = null;
      const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder');
      if (isPlaceholder && typeof document !== 'undefined') {
        const match = document.cookie.match(/sb-mock-user-id=([^;]+)/);
        userId = match ? match[1] : null;
      } else {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
      }

      let role = 'USER';
      if (userId) {
        try {
          const response = await fetch(`/api/users/${userId}`);
          if (response.ok) {
            const data = await response.json();
            profileData = data.profile;
            role = profileData?.role || 'USER';
          }
        } catch (err) {
          console.error('Error fetching user profile role:', err);
        }
      }

      if (isPlaceholder && userId && profileData) {
        loginMockUser(userId, profileData);
      }

      if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else {
        router.push(redirectPath);
      }
    }
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    if (val.length === 6) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleOtpSubmit(fakeEvent, val);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    const { error } = await signInWithOtp(phone);
    setLoading(false);

    if (error) {
      showToast('Failed to resend OTP', error.message || 'Something went wrong', 'error');
    } else {
      showToast('OTP Resent', 'A new verification code has been sent to your phone', 'success');
      setTimer(30);
    }
  };

  // Google login
  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle(redirectPath);
    if (error) {
      showToast('Failed', error.message || 'Google login failed', 'error');
    }
  };

  // Email login
  const handleSendEmailOtp = async (e: React.FormEvent) => {
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
      showToast('Code Sent', 'Check your inbox for a 6-digit OTP code', 'success');
      setStep('email-otp');
    }
  };

  // Email OTP verify
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
      router.push(redirectPath);
    }
  };

  const handleEmailOtpChange = (val: string) => {
    setOtp(val);
    if (val.length === 6) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleVerifyEmailOtp(fakeEvent, val);
    }
  };

  // ── Signup Handlers ──
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Error', 'Please enter your name', 'error');
      return;
    }
    if (!phone || phone.length < 10) {
      showToast('Error', 'Please enter a valid 10-digit mobile number', 'error');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      showToast('Error', 'Please enter a valid email address', 'error');
      return;
    }

    setLoading(true);

    if (phone === '7777777777' || phone === '9999999999' || phone === '8888888888') {
      showToast('OTP Sent (Bypassed)', 'Test number detected. Use OTP 123456.', 'success');
      setStep('signup-otp');
      setTimer(30);
      setLoading(false);
      return;
    }

    const { error } = await signUp(name, phone, email);
    setLoading(false);

    if (error) {
      showToast('Registration Failed', typeof error === 'string' ? error : error.message || 'Something went wrong', 'error');
    } else {
      showToast('OTP Sent', 'Verification code has been sent to your phone', 'success');
      setStep('signup-otp');
      setTimer(30);
    }
  };

  const handleSignupOtpSubmit = async (e: React.FormEvent, otpVal?: string) => {
    e.preventDefault();
    const activeOtp = otpVal || otp;
    if (!activeOtp || activeOtp.length !== 6) {
      showToast('Error', 'Please enter a valid 6-digit code', 'error');
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(phone, activeOtp);
    setLoading(false);

    if (error) {
      showToast('Verification Failed', error.message || 'Incorrect OTP. Try again.', 'error');
    } else {
      showToast('Account Created', 'Welcome to ListMe! Your account has been set up successfully.', 'success');
      router.push('/dashboard');
    }
  };

  const handleSignupOtpChange = (val: string) => {
    setOtp(val);
    if (val.length === 6) {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSignupOtpSubmit(fakeEvent, val);
    }
  };

  const handleResendSignupOtp = async () => {
    if (timer > 0) return;
    setLoading(true);
    const { error } = await signUp(name, phone, email);
    setLoading(false);

    if (error) {
      showToast('Failed to resend OTP', typeof error === 'string' ? error : error.message || 'Something went wrong', 'error');
    } else {
      showToast('OTP Resent', 'A new verification code has been sent to your phone', 'success');
      setTimer(30);
    }
  };

  const switchToSignup = () => {
    setStep('signup');
    setOtp('');
  };

  const switchToLogin = () => {
    setStep('main');
    setOtp('');
    setName('');
  };

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
        <div className={styles.heroContent}>
          <div className={styles.heroBrandRow}>
            <div className={styles.heroBrandIcon}>
              <Home size={20} />
            </div>
            <span className={styles.heroBrandName}>{settings.brandName}</span>
          </div>
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

      {/* ── Right Panel: Login Form ── */}
      <div className={styles.formPanel}>
        <div className={styles.formInner}>

          {/* ── MAIN VIEW: Unified Email/Phone + Social ── */}
          {step === 'main' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Welcome</h1>
                <p className={styles.subtitle}>
                  Access your account and continue your journey with us
                </p>
              </div>

              <form onSubmit={handleIdentifierSubmit} className={styles.form}>
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
                  loading={loading}
                  rightIcon={<ArrowRight size={18} />}
                  fullWidth
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

              <div className={styles.footer}>
                <p>
                  New to {settings.brandName}?{' '}
                  <button
                    type="button"
                    onClick={switchToSignup}
                    className={styles.link}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                  >
                    Create Account
                  </button>
                </p>
              </div>

              <p className={styles.terms}>
                By continuing, you agree to our{' '}
                <a href="/terms">Terms of Service</a> &{' '}
                <a href="/privacy">Privacy Policy</a>
              </p>
            </>
          )}

          {/* ── OTP VIEW ── */}
          {step === 'otp' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Verify Phone</h1>
                <p className={styles.subtitle}>
                  Enter the 6-digit code sent to +91 {phone}
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setStep('main'); setOtp(''); }}
                className={styles.backButton}
              >
                ← Change number
              </button>

              <form onSubmit={(e) => handleOtpSubmit(e)} className={styles.form}>
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
                  Verify & Sign In
                </Button>
              </form>

              <div className={styles.resendContainer}>
                {timer > 0 ? (
                  <span>Resend OTP in {timer}s</span>
                ) : (
                  <>
                    <span>Didn&apos;t receive code?</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      className={styles.resendButton}
                    >
                      Resend OTP
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── EMAIL VIEW ── */}
          {step === 'email' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Login with Email</h1>
                <p className={styles.subtitle}>
                  We&apos;ll send a 6-digit verification code to your inbox
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setStep('main'); setEmail(''); }}
                className={styles.backButton}
              >
                ← Back to login
              </button>

              <form onSubmit={handleSendEmailOtp} className={styles.form}>
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
            </>
          )}

          {/* ── EMAIL OTP VIEW ── */}
          {step === 'email-otp' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Verify Email</h1>
                <p className={styles.subtitle}>
                  Enter the 6-digit code sent to {email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); }}
                className={styles.backButton}
              >
                ← Change email
              </button>

              <form onSubmit={(e) => handleVerifyEmailOtp(e)} className={styles.form}>
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
                  Verify & Sign In
                </Button>
              </form>

              <div className={styles.resendContainer}>
                <button
                  type="button"
                  onClick={(e) => handleSendEmailOtp(e)}
                  disabled={loading}
                  className={styles.resendButton}
                >
                  Resend Code
                </button>
              </div>
            </>
          )}

          {/* ── SIGNUP VIEW ── */}
          {step === 'signup' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Create Account</h1>
                <p className={styles.subtitle}>
                  Join {settings.brandName} today. Post listings for free and connect directly with buyers.
                </p>
              </div>

              <form onSubmit={handleSignupSubmit} className={styles.form}>
                <Input
                  label="Full Name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  leftIcon={<User size={18} />}
                  required
                  disabled={loading}
                  fullWidth
                />
                <Input
                  label="Mobile Number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit number"
                  leftIcon={<Phone size={18} />}
                  required
                  disabled={loading}
                  fullWidth
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  leftIcon={<Mail size={18} />}
                  required
                  disabled={loading}
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  rightIcon={<ArrowRight size={18} />}
                  fullWidth
                >
                  Sign Up
                </Button>
              </form>

              <div className={styles.footer}>
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className={styles.link}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
                  >
                    Log In
                  </button>
                </p>
              </div>

              <p className={styles.terms}>
                By continuing, you agree to our{' '}
                <a href="/terms">Terms of Service</a> &{' '}
                <a href="/privacy">Privacy Policy</a>
              </p>
            </>
          )}

          {/* ── SIGNUP OTP VIEW ── */}
          {step === 'signup-otp' && (
            <>
              <div className={styles.header}>
                <h1 className={styles.title}>Verify Phone</h1>
                <p className={styles.subtitle}>
                  Enter the 6-digit code sent to +91 {phone}
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setStep('signup'); setOtp(''); }}
                className={styles.backButton}
              >
                ← Back to registration
              </button>

              <form onSubmit={(e) => handleSignupOtpSubmit(e)} className={styles.form}>
                <OtpInput
                  value={otp}
                  onChange={handleSignupOtpChange}
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
                  Verify & Complete Signup
                </Button>
              </form>

              <div className={styles.resendContainer}>
                {timer > 0 ? (
                  <span>Resend OTP in {timer}s</span>
                ) : (
                  <>
                    <span>Didn&apos;t receive code?</span>
                    <button
                      type="button"
                      onClick={handleResendSignupOtp}
                      disabled={loading}
                      className={styles.resendButton}
                    >
                      Resend OTP
                    </button>
                  </>
                )}
              </div>
            </>
          )}

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
