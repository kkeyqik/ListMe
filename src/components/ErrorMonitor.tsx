'use client';

import { useEffect } from 'react';

// Client-side throttling so an error thrown in a loop (render loop, interval, retrying
// fetch) can't flood /api/log-error: each distinct error is sent once per page load,
// and at most MAX_REPORTS_PER_PAGE errors are sent in total.
const MAX_REPORTS_PER_PAGE = 10;
const reportedKeys = new Set<string>();
let reportCount = 0;

function sendErrorLog(payload: { message: string; stack: string | null; source: string; metadata?: Record<string, unknown> }) {
  const key = `${payload.source}|${payload.message}|${(payload.stack || '').slice(0, 200)}`;
  if (reportedKeys.has(key) || reportCount >= MAX_REPORTS_PER_PAGE) return;
  reportedKeys.add(key);
  reportCount += 1;

  try {
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, url: window.location.href }),
      keepalive: true,
    }).catch(() => {});
  } catch (err) {
    console.warn('Failed to send error log:', err);
  }
}

export function ErrorMonitor() {
  useEffect(() => {
    // 1. Capture unhandled JavaScript errors
    const handleError = (event: ErrorEvent) => {
      sendErrorLog({
        message: event.message || 'Window JavaScript Error',
        stack: event.error?.stack || null,
        source: 'frontend_window_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    // 2. Capture unhandled Promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason?.message || 'Unhandled Promise Rejection';
      sendErrorLog({
        message,
        stack: reason?.stack || null,
        source: 'frontend_promise_rejection',
      });
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
