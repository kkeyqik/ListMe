'use client';

import React from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { Button, Card } from '@/components/ui';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8rem 1.5rem 5rem' }}>
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
            <ShieldAlert size={36} />
          </div>
          
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 900, color: 'var(--color-neutral-900)', marginBottom: '0.75rem' }}>
            Page Not Found
          </h1>
          <p style={{ fontSize: '0.937rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
            The property listing or site page you are searching for may have been deactivated, sold, or moved to a different location.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Button href="/listings" variant="primary" fullWidth rightIcon={<ArrowRight size={16} />}>
              Search Property Listings
            </Button>
            <Button href="/dashboard" variant="outline" fullWidth>
              Go to my Dashboard
            </Button>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
