'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Home, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from '@/components/layout';
import { AdminMobileBottomNav } from '@/components/layout/AdminMobileBottomNav';
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
    profile?.role === 'SUPER_ADMIN';

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

  return (
    <div className={styles.dashboardLayout}>
      {/* Admin Sidebar Navigation */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Mobile Top Bar matching reference design */}
        <div className={styles.mobileTopBar}>
          <div className={styles.headerLeft}>
            <button
              onClick={() => setSidebarOpen(true)}
              className={styles.menuButton}
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
            >
              <Menu size={24} />
            </button>
            <Link href="/" className={styles.adminMobileLogo} aria-label="ListMe Home">
              <Home className={styles.adminMobileLogoIcon} size={24} />
              <span className={styles.adminMobileLogoText}>ListMe</span>
            </Link>
          </div>
          <div className={styles.adminControls}>
            <span className={styles.adminBadge}>
              ADMIN
            </span>
            <Link
              href="/dashboard/profile"
              className={styles.profileButton}
              aria-label="Admin Profile"
              title="Admin Profile"
            >
              <User size={20} />
            </Link>
          </div>
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

        {/* Dedicated Admin Mobile Bottom Navigation */}
        <AdminMobileBottomNav 
          onMoreClick={() => setSidebarOpen(true)} 
          isMoreActive={sidebarOpen} 
        />
      </div>
    </div>
  );
}
