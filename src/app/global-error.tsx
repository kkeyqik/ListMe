'use client';

import { useEffect } from 'react';

// Replaces the root layout when it crashes, so it can't rely on globals.css or shared components.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', background: '#F8FAFC', color: '#0A1128' }}>
        <title>Something went wrong | ListMe</title>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ maxWidth: '440px', width: '100%', background: '#fff', borderRadius: '16px', padding: '2.5rem 2rem', textAlign: 'center', boxShadow: '0 4px 24px rgba(10,17,40,0.08)' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.75rem' }}>Something went wrong</h1>
            <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, margin: '0 0 2rem' }}>
              ListMe hit an unexpected problem. Please try again, or reload the home page.
            </p>
            <button
              onClick={() => unstable_retry()}
              style={{ width: '100%', padding: '0.85rem', border: 0, borderRadius: '10px', background: '#0A1128', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem' }}
            >
              Try again
            </button>
            {/* A full page load on purpose: the root layout just crashed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ display: 'block', padding: '0.85rem', borderRadius: '10px', border: '1px solid #CBD5E1', color: '#0A1128', textDecoration: 'none', fontWeight: 600 }}>
              Go to Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
