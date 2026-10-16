'use client';

import React, { useEffect, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Modal, OtpInput } from '@/components/ui';
import styles from './EmailVerificationModal.module.css';

const RESEND_SECONDS = 60;

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Accepted for drop-in use where the phone modal was; not used. */
  initialPhone?: string;
}

/**
 * Confirms the signed-in user's email with a 6-digit code. Posting a listing
 * and contacting owners need a confirmed email (or, for older accounts, a
 * verified phone).
 */
export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { profile, user, sendEmailCode, verifyEmailCode } = useAuth();
  const email = user?.email || profile?.email || '';

  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setSent(false);
      setCode('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = async () => {
    setBusy(true);
    setError(null);
    const result = await sendEmailCode(email, 'login');
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setSent(true);
    setResendIn(RESEND_SECONDS);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    const result = await verifyEmailCode(email, code, 'login');
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    onClose();
    onSuccess();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm your email" size="sm">
      <div className={styles.content}>
        {!email ? (
          <p className={styles.description}>
            Your account has no email address yet. Add one from your profile, then try again.
          </p>
        ) : !sent ? (
          <>
            <p className={styles.description}>
              To keep listings and enquiries genuine, confirm your email first. We&apos;ll send a 6-digit code to{' '}
              <strong>{email}</strong>.
            </p>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <Button type="button" variant="primary" size="lg" fullWidth loading={busy} leftIcon={<MailCheck size={18} />} onClick={send}>
              Send code
            </Button>
          </>
        ) : (
          <form className={styles.content} onSubmit={verify}>
            <p className={styles.description}>
              Enter the code we sent to <strong>{email}</strong>, or open the link in the email.
            </p>
            <div className={styles.otpWrap}>
              <OtpInput value={code} onChange={setCode} disabled={busy} error={!!error} />
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} disabled={code.length !== 6}>
              Confirm email
            </Button>
            <div className={styles.resendRow}>
              {resendIn > 0 ? (
                <span>New code in {resendIn}s</span>
              ) : (
                <button type="button" className={styles.linkButton} onClick={send} disabled={busy}>
                  Send a new code
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default EmailVerificationModal;
