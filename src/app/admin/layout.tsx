'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Home, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from '@/components/layout';
import { AdminMobileBottomNav } from '@/components/layout/AdminMobileBottomNav';
import { hasAdminAccess, requiredAccessForAdminPath } from '@/lib/admin-permissions';
import styles from '../dashboard/layout.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = 
    profile?.role === 'ADMIN' || 
    profile?.role === 'SUPER_ADMIN';

  // Mirrors the server checks (proxy + API routes): pages for modules this
  // admin has no permission for are not rendered.
  const requiredAccess = requiredAccessForAdminPath(pathname || '/admin');
  const hasPageAccess = isAdmin && (!requiredAccess || hasAdminAccess(profile, requiredAccess));

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

  // Two-step verification lasts 12 hours. The proxy checks it on page loads;
  // this catches it expiring while an admin page stays open (admin APIs then
  // answer 403 `mfa_required`) and sends the admin to /admin-verify.
  useEffect(() => {
    if (loading || !user || !isAdmin) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/auth/mfa/status', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { verified?: boolean };
        if (!cancelled && data.verified === false) {
          const back = window.location.pathname + window.location.search;
          window.location.replace(`/admin-verify?redirect=${encodeURIComponent(back)}`);
        }
      } catch {
        // Network blip: the next check or the API's 403 will catch it.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const interval = window.setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loading, user, isAdmin]);

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
              {profile?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN'}
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
          {loading || !user || !isAdmin ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
              <div className={styles.spinner} role="status" aria-label="loading" />
            </div>
          ) : !hasPageAccess ? (
            <div role="alert" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <h2>No access</h2>
              <p>Your admin account does not have permission for this section. Ask a Super Admin to grant it in Role Manager.</p>
              <Link href="/admin">Back to overview</Link>
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
