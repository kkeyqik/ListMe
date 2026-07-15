'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (title: string, message: string, type: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Internal Toast Card Component
const ToastCard: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const { id, title, message, type, duration = 5000 } = toast;

  useEffect(() => {
    if (duration === Infinity) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const icons = {
    success: <CheckCircle size={20} className={styles.icon} />,
    error: <XCircle size={20} className={styles.icon} />,
    warning: <AlertTriangle size={20} className={styles.icon} />,
    info: <Info size={20} className={styles.icon} />,
  };

  return (
    <div className={`${styles.toast} ${styles[type]}`} role="alert" aria-live="assertive">
      <div className={styles.icon}>{icons[type]}</div>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.message}>{message}</div>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className={styles.closeButton}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const showToast = useCallback(
    (title: string, message: string, type: ToastType, duration = 5000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type, duration }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {mounted &&
        toasts.length > 0 &&
        createPortal(
          <div className={styles.toastContainer}>
            {toasts.map((toast) => (
              <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};
