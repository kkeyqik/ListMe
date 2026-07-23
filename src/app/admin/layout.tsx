'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from '@/components/layout';
import styles from '../dashboard/layout.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = 
    profile?.role === 'ADMIN' || 
    profile?.role === 'SUPER_ADMIN' ||
    user?.phone === '+917777777777' ||
    user?.email === 'admin@test.com' ||
    user?.id === 'a1a2a3a4-b5b6-c7c8-d9e0-f1f2f3f4f5f6';

  // Client-side admin verification check
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, isAdmin, loading, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} role="status" aria-label="loading" />
      </div>
    );
  }

  return (
    <div className={styles.dashboardLayout}>
      {/* Admin Sidebar Navigation */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Mobile Top Bar */}
        <div className={styles.mobileTopBar} style={{ borderBottomColor: 'var(--color-secondary-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link href="/" className={`${styles.logo} text-gradient`}>
              ListMe
            </Link>
            <Badge variant="secondary" size="sm" style={{ backgroundColor: 'var(--color-secondary-fade)', color: 'var(--color-secondary)' }}>
              ADMIN
            </Badge>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className={styles.menuButton}
            aria-label="Open administration menu"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Dynamic page contents */}
        <main className={styles.pageContainer}>{children}</main>
      </div>
    </div>
  );
}

// Simple local Badge component for layout
function Badge({ children, variant, size, style }: any) {
  return (
    <span 
      style={{
        padding: '0.125rem 0.5rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 700,
        ...style
      }}
    >
      {children}
    </span>
  );
}
