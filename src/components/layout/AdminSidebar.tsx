'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  MapPin, 
  Users, 
  Heart, 
  Settings, 
  ArrowLeft,
  LogOut,
  X,
  FileText,
  User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import styles from './AdminSidebar.module.css';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const navItems = [
    { label: 'Overview', href: '/admin', icon: <LayoutDashboard size={16} className={styles.icon} /> },
    { label: 'All Listings', href: '/admin/listings', icon: <Building2 size={16} className={styles.icon} /> },
    { label: 'By Pincode', href: '/admin/pincodes', icon: <MapPin size={16} className={styles.icon} /> },
    { label: 'Users', href: '/admin/users', icon: <Users size={16} className={styles.icon} /> },
    { label: 'Interest Tracking', href: '/admin/interests', icon: <Heart size={16} className={styles.icon} /> },
    { label: 'Activity Log', href: '/admin/activity', icon: <FileText size={16} className={styles.icon} /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings size={16} className={styles.icon} /> },
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

  const getInitials = (name: string | null) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const displayName = profile?.name || 'Admin User';
  const displayRole = profile?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin';
  const initials = getInitials(profile?.name || null);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className={styles.mobileBackdrop} 
          onClick={onClose} 
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside className={sidebarClasses}>
        {/* Logo and Close Button */}
        <div className={styles.logoContainer}>
          <div className={styles.logoWrapper}>
            <Link href="/" className="logo text-gradient font-bold text-xl">
              ListMe
            </Link>
            <span className={styles.adminBadge}>Admin</span>
          </div>
          <button 
            onClick={onClose} 
            className={styles.closeButton} 
            aria-label="Close admin menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className={styles.navSection}>
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
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

        {/* Footer User Info */}
        <div className={styles.footer}>
          <div className={styles.adminCard}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.adminInfo}>
              <span className={styles.adminName}>{displayName}</span>
              <span className={styles.adminRole}>{displayRole}</span>
            </div>
          </div>
          
          <Link href="/dashboard" className={styles.backLink} onClick={onClose} style={{ borderStyle: 'solid', borderColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}>
            <User size={12} />
            Go to User Dashboard
          </Link>

          <Link href="/" className={styles.backLink} onClick={onClose}>
            <ArrowLeft size={12} />
            Back to Public Site
          </Link>

          <button onClick={handleLogout} className={styles.logoutButton}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
