'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Phone, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast, Button, Input, Card } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import styles from '../auth.module.css';

function LoginContent() {
  const { user, profile, loading: authLoading, signInWithOtp, verifyOtp, loginMockUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
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

  // Read phone from searchParams or secure sessionStorage on mount/searchParams changes
  useEffect(() => {
    const queryPhone = searchParams.get('phone');
    if (queryPhone) {
      setPhone(queryPhone);
    } else if (typeof window !== 'undefined') {
      const storedPhone = window.sessionStorage.getItem('onboarding_phone');
      if (storedPhone) {
        setPhone(storedPhone);
        window.sessionStorage.removeItem('onboarding_phone'); // Clean up consumed phone data immediately
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
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      showToast('Error', 'Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    setLoading(true);

    if (phone === '7777777777') {
      showToast('OTP Sent (Bypassed)', 'Bypassed SMS verification for admin number. Use OTP 123456.', 'success');
      setStep('otp');
      setTimer(30);
      setLoading(false);
      return;
    }

    const { error } = await signInWithOtp(phone);
    setLoading(false);

    if (error) {
      showToast('Failed to send OTP', error.message || 'Something went wrong', 'error');
    } else {
      showToast('OTP Sent', 'Verification code has been sent to your phone', 'success');
      setStep('otp');
      setTimer(30); // 30-second cooldown
    }
  };

  // OTP verification handler
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      showToast('Error', 'Please enter a valid 6-digit code', 'error');
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(phone, otp);
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

  return (
    <div className={styles.container}>
      <Card padding="lg" className={styles.authCard}>
        {/* Logo and header */}
        <div className={styles.header}>
          <Link href="/" className={`${styles.logo} text-gradient`}>
            ListMe
          </Link>
          <h2 className={styles.title}>
            {step === 'phone' ? 'Welcome Back' : 'Verify Phone'}
          </h2>
          <p className={styles.subtitle}>
            {step === 'phone' 
              ? 'Enter your phone number to sign in or create an account.'
              : `Enter the 6-digit verification code sent to +91 ${phone}`
            }
          </p>
        </div>

        {step === 'otp' && (
          <button 
            type="button" 
            onClick={() => setStep('phone')} 
            className={styles.backButton}
          >
            <ArrowLeft size={16} />
            Back to phone number
          </button>
        )}

        {step === 'phone' ? (
          /* Phone Entry Step */
          <form onSubmit={handlePhoneSubmit} className={styles.form}>
            <Input
              label="Mobile Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210"
              leftIcon={<Phone size={18} />}
              helperText="OTP will be sent to this number"
              required
              disabled={loading}
              fullWidth
            />
            <Button 
              type="submit" 
              variant="primary" 
              loading={loading}
              rightIcon={<ArrowRight size={18} />}
              fullWidth
            >
              Get OTP
            </Button>
          </form>
        ) : (
          /* OTP Verification Step */
          <form onSubmit={handleOtpSubmit} className={styles.form}>
            <Input
              label="One-Time Password (OTP)"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              leftIcon={<ShieldCheck size={18} />}
              maxLength={6}
              required
              disabled={loading}
              fullWidth
            />
            
            <div className={styles.resendContainer}>
              <span>Didn't receive code?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={timer > 0 || loading}
                className={styles.resendButton}
              >
                {timer > 0 ? `Resend OTP (${timer}s)` : 'Resend OTP'}
              </button>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              loading={loading}
              fullWidth
            >
              Verify & Sign In
            </Button>
          </form>
        )}

        <div className={styles.footer}>
          {step === 'phone' && (
            <p>
              New to ListMe?{' '}
              <Link href="/signup" className={styles.link}>
                Create an account
              </Link>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function Login() {
  return (
    <React.Suspense fallback={
      <div className={styles.container}>
        <Card padding="lg" className={styles.authCard}>
          <div className={styles.header}>
            <span className={`${styles.logo} text-gradient`}>ListMe</span>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-secondary)' }}>
            Loading auth portal...
          </div>
        </Card>
      </div>
    }>
      <LoginContent />
    </React.Suspense>
  );
}
