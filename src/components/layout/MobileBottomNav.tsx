'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Heart, Menu } from 'lucide-react';
import styles from './MobileBottomNav.module.css';
import { useMobileMenu } from '@/context/MobileMenuContext';

interface MobileBottomNavProps {
  onMenuClick?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const pathname = usePathname();
  const { isMenuOpen, openMenu } = useMobileMenu();

  // Hide the consumer bottom nav on all admin portal routes and post-property page (which has its own top header hamburger menu)
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/post-property')) {
    return null;
  }

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/' && pathname === '/') return true;
    if (path === '/listings' && (pathname.startsWith('/listings') || pathname.startsWith('/property/'))) return true;
    if (path === '/post-property' && (pathname.startsWith('/post-property') || pathname === '/dashboard/listings/new')) return true;
    if (path === '/dashboard/interests' && pathname.startsWith('/dashboard') && pathname !== '/dashboard/listings/new') return true;
    return false;
  };

  return (
    <nav className={styles.bottomNav} aria-label="Mobile Bottom Navigation">
      <Link 
        href="/" 
        className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}
        aria-current={isActive('/') ? 'page' : undefined}
      >
        <Home className={styles.icon} />
        <span className={styles.label}>Home</span>
      </Link>
      
      <Link 
        href="/listings" 
        className={`${styles.navItem} ${isActive('/listings') ? styles.active : ''}`}
        aria-current={isActive('/listings') ? 'page' : undefined}
      >
        <Search className={styles.icon} />
        <span className={styles.label}>Search</span>
      </Link>
      
      <Link 
        href="/post-property" 
        className={`${styles.navItem} ${styles.centerItem} ${isActive('/post-property') ? styles.active : ''}`}
        aria-current={isActive('/post-property') ? 'page' : undefined}
      >
        <PlusCircle className={styles.icon} style={{ fill: 'var(--color-primary)', color: 'white' }} />
        <span className={styles.label}>Sell/Rent</span>
        <span className={styles.freeBadge}>FREE</span>
      </Link>
      
      <Link 
        href="/dashboard/interests" 
        className={`${styles.navItem} ${isActive('/dashboard/interests') ? styles.active : ''}`}
        aria-current={isActive('/dashboard/interests') ? 'page' : undefined}
      >
        <Heart className={styles.icon} />
        <span className={styles.label}>Activity</span>
      </Link>
      
      <button 
        type="button"
        onClick={openMenu} 
        className={`${styles.navItem} ${isMenuOpen ? styles.active : ''}`}
        aria-label="Open mobile category menu"
        aria-expanded={isMenuOpen}
        aria-haspopup="dialog"
      >
        <Menu className={styles.icon} />
        <span className={styles.label}>Menu</span>
      </button>
    </nav>
  );
};
