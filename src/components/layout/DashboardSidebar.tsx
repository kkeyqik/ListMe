'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  Plus, 
  Heart, 
  User, 
  Bell, 
  LogOut,
  X,
  Shield,
  Home
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './DashboardSidebar.module.css';

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  // Handle escape key, resize, and prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024 && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} className={styles.icon} /> },
    { label: 'My Listings', href: '/dashboard/listings', icon: <Building2 size={18} className={styles.icon} /> },
    { label: 'Add Listing', href: '/dashboard/listings/new', icon: <Plus size={18} className={styles.icon} /> },
    { label: 'Interests Received', href: '/dashboard/interests', icon: <Heart size={18} className={styles.icon} /> },
    { label: 'Profile', href: '/dashboard/profile', icon: <User size={18} className={styles.icon} /> },
    { label: 'Notifications', href: '/dashboard/notifications', icon: <Bell size={18} className={styles.icon} /> },
  ];

  const handleLogout = () => {
    signOut();
  };

  const sidebarClasses = [
    styles.sidebar,
    isOpen ? styles.sidebarOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  const backdropClasses = [
    styles.mobileBackdrop,
    isOpen ? styles.mobileBackdropOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  const getInitials = (name: string | null) => {
    if (!name) return 'JD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const displayName = profile?.name || 'User';
  const displayPhone = profile?.phone || 'No phone verified';
  const initials = getInitials(profile?.name || null);
  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className={backdropClasses} 
          onClick={onClose} 
          aria-hidden="true" 
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        id="dashboard-sidebar"
        className={sidebarClasses}
        aria-label="User Dashboard Navigation"
        {...(isOpen ? { role: 'dialog', 'aria-modal': true } : {})}
      >
        <div className={styles.logoContainer}>
          <Link href="/" onClick={onClose} className={styles.logo} aria-label="ListMe Home">
            <Home size={22} className={styles.logoIcon} />
            <span className="text-gradient font-bold">ListMe</span>
          </Link>
          <button 
            onClick={onClose} 
            className={styles.closeButton} 
            aria-label="Close sidebar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className={styles.navSection}>
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`${styles.navLink} ${active ? styles.activeNavLink : ''}`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer User Card */}
        <div className={styles.footer}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userPhone}>{displayPhone}</span>
            </div>
          </div>
          
          {isAdmin && (
            <Link href="/admin" className={styles.adminLink} onClick={onClose}>
              <Shield size={14} />
              <span>Go to Admin Portal</span>
            </Link>
          )}

          <button onClick={handleLogout} className={styles.logoutButton}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
