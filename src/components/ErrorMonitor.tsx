'use client';

import { useEffect } from 'react';

export function ErrorMonitor() {
  useEffect(() => {
    // 1. Capture unhandled JavaScript errors
    const handleError = (event: ErrorEvent) => {
      try {
        fetch('/api/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: event.message || 'Window JavaScript Error',
            stack: event.error?.stack || null,
            source: 'frontend_window_error',
            url: window.location.href,
            metadata: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            },
          }),
        }).catch(() => {});
      } catch (err) {
        console.warn('Failed to send error log:', err);
      }
    };

    // 2. Capture unhandled Promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      try {
        const reason = event.reason;
        const message =
          typeof reason === 'string'
            ? reason
            : reason?.message || 'Unhandled Promise Rejection';
        const stack = reason?.stack || null;

        fetch('/api/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            stack,
            source: 'frontend_promise_rejection',
            url: window.location.href,
          }),
        }).catch(() => {});
      } catch (err) {
        console.warn('Failed to send promise rejection log:', err);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
