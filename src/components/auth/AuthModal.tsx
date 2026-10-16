'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import { AuthFlow } from './AuthFlow';
import styles from './AuthModal.module.css';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectPath?: string;
  /** Kept for existing callers; sign-in is email-first, so it is not used. */
  initialPhone?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, redirectPath }) => {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [initialEmail, setInitialEmail] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    try {
      setInitialEmail(window.sessionStorage.getItem('onboarding_email')?.trim() || '');
    } catch {
      setInitialEmail('');
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleSuccess = async () => {
    showToast('Welcome!', 'You are now signed in.', 'success');
    onClose();
    onSuccess?.();

    let target = redirectPath || '/dashboard';
    if (!redirectPath) {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await res.json();
        if (data.profile?.role === 'ADMIN' || data.profile?.role === 'SUPER_ADMIN') target = '/admin';
      } catch {
        // Fall back to the dashboard.
      }
    }
    window.location.href = target;
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-label="Sign in">
        <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close sign-in">
          <X size={20} />
        </button>
        <div className={styles.content}>
          <AuthFlow
            key={initialEmail}
            compact
            redirectPath={redirectPath || '/dashboard'}
            onSuccess={handleSuccess}
            initialEmail={initialEmail}
            brandName={settings.brandName}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AuthModal;
