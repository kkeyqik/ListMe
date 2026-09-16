'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Building2, Users, BarChart3, MoreHorizontal } from 'lucide-react';
import styles from './AdminMobileBottomNav.module.css';

interface AdminMobileBottomNavProps {
  onMoreClick?: () => void;
  isMoreActive?: boolean;
}

export const AdminMobileBottomNav: React.FC<AdminMobileBottomNavProps> = ({ 
  onMoreClick,
  isMoreActive = false
}) => {
  const pathname = usePathname();

  const isDashboardActive = pathname === '/admin';
  const isListingsActive = pathname?.startsWith('/admin/listings') || pathname?.startsWith('/admin/pincodes');
  const isUsersActive = pathname?.startsWith('/admin/users') || pathname?.startsWith('/admin/roles');
  const isReportsActive = pathname?.startsWith('/admin/activity') || pathname?.startsWith('/admin/seo') || pathname?.startsWith('/admin/interests');
  const isMoreTabActive = isMoreActive || pathname?.startsWith('/admin/settings');

  return (
    <nav className={styles.bottomNav} aria-label="Admin Mobile Bottom Navigation">
      <Link
        href="/admin"
        className={`${styles.navItem} ${isDashboardActive ? styles.active : ''}`}
        aria-current={isDashboardActive ? 'page' : undefined}
      >
        <LayoutGrid className={styles.icon} />
        <span className={styles.label}>Dashboard</span>
      </Link>

      <Link
        href="/admin/listings"
        className={`${styles.navItem} ${isListingsActive ? styles.active : ''}`}
        aria-current={isListingsActive ? 'page' : undefined}
      >
        <Building2 className={styles.icon} />
        <span className={styles.label}>Listings</span>
      </Link>

      <Link
        href="/admin/users"
        className={`${styles.navItem} ${isUsersActive ? styles.active : ''}`}
        aria-current={isUsersActive ? 'page' : undefined}
      >
        <Users className={styles.icon} />
        <span className={styles.label}>Users</span>
      </Link>

      <Link
        href="/admin/activity"
        className={`${styles.navItem} ${isReportsActive ? styles.active : ''}`}
        aria-current={isReportsActive ? 'page' : undefined}
      >
        <BarChart3 className={styles.icon} />
        <span className={styles.label}>Reports</span>
      </Link>

      <button
        type="button"
        onClick={onMoreClick}
        className={`${styles.navItem} ${isMoreTabActive ? styles.active : ''}`}
        aria-label="Open admin menu options"
        aria-expanded={isMoreActive}
        aria-controls="admin-sidebar"
      >
        <MoreHorizontal className={styles.icon} />
        <span className={styles.label}>More</span>
      </button>
    </nav>
  );
};

export default AdminMobileBottomNav;
