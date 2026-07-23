'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DashboardSidebar } from '@/components/layout';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Client-side authentication check
  useEffect(() => {
    if (!loading && !user) {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [user, loading, router]);

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar Navigation */}
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Mobile Top Bar */}
        <div className={styles.mobileTopBar}>
          <Link href="/" className={`${styles.logo} text-gradient`}>
            ListMe
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className={styles.menuButton}
            aria-label="Open navigation menu"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Dynamic page contents */}
        <main className={styles.pageContainer}>
          {loading || !user ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
              <div className={styles.spinner} role="status" aria-label="loading" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
