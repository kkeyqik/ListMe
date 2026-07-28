'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Heart, Menu } from 'lucide-react';
import styles from './MobileBottomNav.module.css';

interface MobileBottomNavProps {
  onMenuClick?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className={styles.bottomNav}>
      <Link href="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
        <Home className={styles.icon} />
        <span className={styles.label}>Home</span>
      </Link>
      
      <Link href="/listings" className={`${styles.navItem} ${isActive('/listings') ? styles.active : ''}`}>
        <Search className={styles.icon} />
        <span className={styles.label}>Search</span>
      </Link>
      
      <Link href="/post-property" className={`${styles.navItem} ${styles.centerItem}`}>
        <PlusCircle className={styles.icon} style={{ fill: 'var(--color-primary)', color: 'white' }} />
        <span className={styles.label}>Sell/Rent</span>
        <span className={styles.freeBadge}>FREE</span>
      </Link>
      
      <Link href="/dashboard/shortlisted" className={`${styles.navItem} ${isActive('/dashboard/shortlisted') ? styles.active : ''}`}>
        <Heart className={styles.icon} />
        <span className={styles.label}>Activity</span>
      </Link>
      
      <button onClick={onMenuClick} className={styles.navItem}>
        <Menu className={styles.icon} />
        <span className={styles.label}>Menu</span>
      </button>
    </nav>
  );
};
