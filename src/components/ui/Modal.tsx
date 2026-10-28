'use client';

import React, { useEffect, useState, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';
import { useBodyScrollLock, useDialogFocus } from '@/lib/use-dialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Set mounted on client
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Ref-counted scroll lock, focus trap/restore, and Escape (top-most dialog only)
  useBodyScrollLock(isOpen && mounted);
  useDialogFocus(isOpen && mounted, modalRef, onClose);

  // Click outside listener
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen || !mounted) return null;

  const modalClasses = [styles.modal, styles[size]].join(' ');

  return createPortal(
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
