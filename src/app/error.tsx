'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button, Card } from '@/components/ui';

// No Header/Footer here: if one of them is what crashed, rendering it again would crash this page too.
export default function Error({
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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem 1.5rem' }}>
      <Card padding="lg" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-secondary-fade)',
            color: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}
        >
          <AlertTriangle size={36} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 900, color: 'var(--color-neutral-900)', marginBottom: '0.75rem' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '0.937rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
          This page hit an unexpected problem. Please try again, or head back to the home page.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button onClick={() => unstable_retry()} variant="primary" fullWidth leftIcon={<RotateCcw size={16} />}>
            Try again
          </Button>
          <Button href="/" variant="outline" fullWidth>
            Go to Home
          </Button>
        </div>
      </Card>
    </main>
  );
}
