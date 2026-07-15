'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Phone, Mail, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast, Button, Input, Card } from '@/components/ui';
import styles from '../auth.module.css';

export default function Signup() {
  const { signUp, verifyOtp } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Form submission handler (details step)
  const handleDetailsSubmit = async (e: React.FormEvent) => {
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
    const { error } = await signUp(name, phone, email);
    setLoading(false);

    if (error) {
      showToast('Registration Failed', typeof error === 'string' ? error : error.message || 'Something went wrong', 'error');
    } else {
      showToast('OTP Sent', 'Verification code has been sent to your phone', 'success');
      setStep('otp');
      setTimer(30);
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
      showToast('Account Created', 'Welcome to ListMe! Your account has been set up successfully.', 'success');
      router.push('/dashboard');
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
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

  return (
    <div className={styles.container}>
      <Card padding="lg" className={styles.authCard}>
        {/* Logo and header */}
        <div className={styles.header}>
          <Link href="/" className={`${styles.logo} text-gradient`}>
            ListMe
          </Link>
          <h2 className={styles.title}>
            {step === 'details' ? 'Create Account' : 'Verify Phone'}
          </h2>
          <p className={styles.subtitle}>
            {step === 'details'
              ? 'Join ListMe today. Post listings for free and connect directly with buyers.'
              : `Enter the 6-digit verification code sent to +91 ${phone}`}
          </p>
        </div>

        {step === 'otp' && (
          <button
            type="button"
            onClick={() => setStep('details')}
            className={styles.backButton}
          >
            <ArrowLeft size={16} />
            Back to registration details
          </button>
        )}

        {step === 'details' ? (
          /* Registration Details Step */
          <form onSubmit={handleDetailsSubmit} className={styles.form}>
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
              placeholder="98765 43210"
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
              placeholder="john@example.com"
              leftIcon={<Mail size={18} />}
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
              Sign Up
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

            <Button type="submit" variant="primary" loading={loading} fullWidth>
              Verify & Complete Signup
            </Button>
          </form>
        )}

        <div className={styles.footer}>
          {step === 'details' && (
            <p>
              Already have an account?{' '}
              <Link href="/login" className={styles.link}>
                Log In
              </Link>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
