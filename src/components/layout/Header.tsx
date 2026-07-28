'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  User,
  Search,
  Eye,
  ChevronRight,
  Landmark,
  Lightbulb,
  Newspaper,
  Info,
  HelpCircle,
  Download,
  LogOut,
} from 'lucide-react';
import { Button } from '../ui';
import styles from './Header.module.css';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { MobileBottomNav } from './MobileBottomNav';

export const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [postPropDrawerOpen, setPostPropDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const pathname = usePathname();

  const getHeaderLinks = (isAdmin: boolean) => [
    { label: 'Post Property', href: '/post-property', badge: 'FREE' },
    { label: isAdmin ? 'Admin Portal' : 'My Dashboard', href: isAdmin ? '/admin' : '/dashboard' },
    { label: 'Manage Listings', href: '/dashboard/listings' },
    { label: 'View Responses', href: '/dashboard/responses' },
    { label: 'Manage Profile', href: '/dashboard/profile' },
    { label: 'Change Password', href: '/dashboard/settings' },
  ];

  const getActivityLinks = () => [
    { label: 'Recent Searches', href: '/dashboard/searches' },
    { label: 'Contacted properties', href: '/dashboard/contacted' },
    { label: 'Shortlisted properties', href: '/dashboard/shortlisted' },
    { label: 'Viewed properties', href: '/dashboard/viewed' },
  ];


  const isPostPropertyRoute = pathname === '/post-property';

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close drawers on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setPostPropDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when a drawer is open
  useEffect(() => {
    if (postPropDrawerOpen || mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [postPropDrawerOpen, mobileMenuOpen]);

  const navLinks = [
    { label: 'Buy', href: '/listings?type=sale' },
    { label: 'Rent', href: '/listings?type=rent' },
    { label: 'Post Property', href: '/post-property' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href.split('?')[0])) return true;
    return false;
  };

  const isHome = pathname === '/';

  // ─── POST PROPERTY HEADER ────────────────────────────────
  if (isPostPropertyRoute) {
    return (
      <div className={styles.ppHeaderWrapper}>
        <header className={`${styles.ppHeader} ${scrolled ? styles.ppHeaderScrolled : ''}`}>
          {/* Logo */}
          <Link href="/" className={styles.ppLogo}>
            <Home className={styles.ppLogoIcon} size={28} />
            <span className={styles.ppLogoText}>ListMe</span>
          </Link>

          {/* Right Controls */}
          <div className={styles.ppRightControls}>
            {/* Login Dropdown Trigger */}
            <div className={styles.ppLoginTrigger}>
              <button
                className={styles.ppIconButton}
                aria-label="Login menu"
                aria-haspopup="true"
              >
                {user ? (
                  profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name || 'User avatar'}
                      className={styles.ppIconButtonImg}
                    />
                  ) : profile?.name ? (
                    <span className={styles.ppIconButtonInitials}>
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User size={22} />
                  )
                ) : (
                  <User size={22} />
                )}
              </button>

              {/* Hover Dropdown */}
              <div className={styles.ppLoginDropdown} role="menu">
                {user ? (
                  <>
                    <div className={styles.ppDropdownName}>{profile?.name || 'User'}</div>
                    {getHeaderLinks(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN').map((link, idx) => (
                      <Link
                        key={`main-${idx}`}
                        href={link.href}
                        className={styles.ppDropdownItem}
                        role="menuitem"
                      >
                        <div className={styles.ppDropdownItemContent}>
                          <span className={styles.ppDropdownLabel} style={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                            {link.label}
                            {link.badge && <span className={styles.freeBadge}>{link.badge}</span>}
                          </span>
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={() => signOut()}
                      className={styles.ppDropdownItem}
                      role="menuitem"
                      style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    >
                      <div className={styles.ppDropdownItemContent}>
                        <span className={styles.ppDropdownLabel} style={{ fontWeight: 500 }}>Logout</span>
                      </div>
                    </button>

                    <div className={styles.ppDropdownDivider} />

                    <div className={styles.ppDropdownSectionTitle}>My Activity</div>
                    {getActivityLinks().map((link, idx) => (
                      <Link
                        key={`activity-${idx}`}
                        href={link.href}
                        className={styles.ppDropdownItem}
                        role="menuitem"
                      >
                        <div className={styles.ppDropdownItemContent}>
                          <span className={styles.ppDropdownLabel} style={{ fontWeight: 500 }}>{link.label}</span>
                        </div>
                      </Link>
                    ))}
                  </>
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className={styles.ppDropdownItem}
                    role="menuitem"
                    style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <User size={16} />
                    <span>Login / Register</span>
                  </button>
                )}


              </div>
            </div>

            {/* Hamburger Button */}
            <button
              className={styles.ppIconButton}
              onClick={() => setPostPropDrawerOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </header>

        {/* ── Full-height Side Drawer ── */}
        {postPropDrawerOpen && (
          <>
            <div
              className={styles.ppDrawerOverlay}
              onClick={() => setPostPropDrawerOpen(false)}
            />
            <aside
              className={styles.ppDrawer}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {/* Drawer Header */}
              <div className={styles.ppDrawerHeader}>
                {user ? (
                  <Link
                    href={(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') ? '/admin' : '/dashboard'}
                    className={styles.ppDrawerLoginLink}
                    onClick={() => setPostPropDrawerOpen(false)}
                  >
                    <User size={24} />
                    <span>{(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') ? 'ADMIN PORTAL' : 'DASHBOARD'}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setPostPropDrawerOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className={styles.ppDrawerLoginLink}
                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <User size={24} />
                    <span>LOGIN / REGISTER</span>
                  </button>
                )}
                <button
                  onClick={() => setPostPropDrawerOpen(false)}
                  className={styles.ppDrawerClose}
                  aria-label="Close navigation menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Drawer Body */}
              <nav className={styles.ppDrawerBody}>
                {/* Post Property */}
                <Link
                  href="/post-property"
                  className={styles.ppDrawerPostBtn}
                  onClick={() => setPostPropDrawerOpen(false)}
                >
                  <span>Post Property</span>
                  <span className={styles.ppDrawerFreeBadge}>FREE</span>
                </Link>

                <div className={styles.ppDrawerDivider} />

                {/* Explore our Services */}
                <span className={styles.ppDrawerSectionTitle}>Explore our Services</span>

                <div className={styles.ppDrawerSubList}>
                  <Link href="/listings?type=sale" className={styles.ppDrawerSubLink} onClick={() => setPostPropDrawerOpen(false)}>
                    <ChevronRight size={16} />
                    <span>For Buyers</span>
                  </Link>
                  <Link href="/listings?type=rent" className={styles.ppDrawerSubLink} onClick={() => setPostPropDrawerOpen(false)}>
                    <ChevronRight size={16} />
                    <span>For Tenants</span>
                  </Link>
                  <Link href="/post-property" className={styles.ppDrawerSubLink} onClick={() => setPostPropDrawerOpen(false)}>
                    <ChevronRight size={16} />
                    <span>For Owners</span>
                  </Link>
                  <Link href="/post-property" className={styles.ppDrawerSubLink} onClick={() => setPostPropDrawerOpen(false)}>
                    <ChevronRight size={16} />
                    <span>For Dealers / Builders</span>
                  </Link>
                </div>

                <div className={styles.ppDrawerDivider} />

                {/* Services Group */}
                <Link href="#" className={styles.ppDrawerLink} onClick={(e) => e.preventDefault()}>
                  <Landmark size={16} />
                  <span>Home Loans</span>
                </Link>
                <Link href="#" className={styles.ppDrawerLink} onClick={(e) => e.preventDefault()}>
                  <ChevronRight size={16} />
                  <span>Insights</span>
                  <span className={styles.ppDrawerNewBadge}>NEW</span>
                </Link>
                <Link href="#" className={styles.ppDrawerLink} onClick={(e) => e.preventDefault()}>
                  <ChevronRight size={16} />
                  <span>Articles & News</span>
                </Link>

                <div className={styles.ppDrawerDivider} />

                {/* Info Group */}
                <Link href="/about" className={styles.ppDrawerLink} onClick={() => setPostPropDrawerOpen(false)}>
                  <Info size={16} />
                  <span>About Us</span>
                </Link>
                <Link href="/contact" className={styles.ppDrawerLink} onClick={() => setPostPropDrawerOpen(false)}>
                  <ChevronRight size={16} />
                  <span>Get Help</span>
                </Link>
                <Link href="#" className={styles.ppDrawerLink} onClick={(e) => e.preventDefault()}>
                  <Download size={16} />
                  <span>Download App</span>
                </Link>
              </nav>
            </aside>
          </>
        )}
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        <MobileBottomNav onMenuClick={() => setPostPropDrawerOpen(true)} />
      </div>
    );
  }

  // ─── STANDARD HEADER (all other routes) ──────────────────
  return (
    <div className={`${styles.headerWrapper} ${isHome ? styles.homeHeaderWrapper : ''}`}>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''} ${isHome ? styles.homeHeader : ''}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <Home className={styles.logoIcon} size={32} />
          <span className={styles.logoText}>ListMe</span>
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${isActive(link.href) ? styles.activeNavLink : ''}`}
            >
              {isActive(link.href) && <span className={styles.activeDot}>• </span>}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Action Section */}
        <div className={styles.rightSection}>
          {user ? (
            <div className={styles.ppLoginTrigger} style={{ marginRight: '1.25rem' }}>
              <button
                className={styles.ppIconButton}
                aria-label="Login menu"
                aria-haspopup="true"
              >
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name || 'User avatar'}
                    className={styles.ppIconButtonImg}
                  />
                ) : profile?.name ? (
                  <span className={styles.ppIconButtonInitials}>
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User size={22} />
                )}
              </button>

              {/* Hover Dropdown */}
              <div className={styles.ppLoginDropdown} role="menu" style={{ right: 0, left: 'auto' }}>
                    <div className={styles.ppDropdownName}>{profile?.name || 'User'}</div>
                    {getHeaderLinks(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN').map((link, idx) => (
                      <Link
                        key={`main-${idx}`}
                        href={link.href}
                        className={styles.ppDropdownItem}
                        role="menuitem"
                      >
                        <div className={styles.ppDropdownItemContent}>
                          <span className={styles.ppDropdownLabel} style={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                            {link.label}
                            {link.badge && <span className={styles.freeBadge}>{link.badge}</span>}
                          </span>
                        </div>
                      </Link>
                    ))}
                    <button
                      onClick={() => signOut()}
                      className={styles.ppDropdownItem}
                      role="menuitem"
                      style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    >
                      <div className={styles.ppDropdownItemContent}>
                        <span className={styles.ppDropdownLabel} style={{ fontWeight: 500 }}>Logout</span>
                      </div>
                    </button>

                    <div className={styles.ppDropdownDivider} />

                    <div className={styles.ppDropdownSectionTitle}>My Activity</div>
                    {getActivityLinks().map((link, idx) => (
                      <Link
                        key={`activity-${idx}`}
                        href={link.href}
                        className={styles.ppDropdownItem}
                        role="menuitem"
                      >
                        <div className={styles.ppDropdownItemContent}>
                          <span className={styles.ppDropdownLabel} style={{ fontWeight: 500 }}>{link.label}</span>
                        </div>
                      </Link>
                    ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className={styles.navLink}
              style={{ marginRight: '1.25rem', fontWeight: 600, fontSize: '1rem', color: 'var(--color-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Log In
            </button>
          )}
          <Button
            href="/post-property"
            variant="primary"
            className={styles.capsuleBtn}
          >
            <span>Post property</span>
            <span className={styles.freeBadge}>FREE</span>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={styles.mobileMenuButton}
          aria-label="Open navigation menu"
        >
          <Menu size={24} />
        </button>

        {/* Mobile Nav Overlay & Drawer */}
        {mobileMenuOpen && (
          <>
            <div className={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />
            <div className={styles.mobileDrawer} role="dialog" aria-modal="true">
              <div className={styles.drawerHeader}>
                <span className={`${styles.drawerLogo} text-gradient`}>ListMe</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={styles.closeButton}
                  aria-label="Close navigation menu"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className={styles.drawerNav}>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${styles.drawerNavLink} ${
                      isActive(link.href) ? styles.activeDrawerNavLink : ''
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {user && (
                  <>
                    <div className={styles.ppDropdownDivider} style={{ margin: '1rem 0' }} />
                    <div className={styles.ppDropdownName} style={{ padding: '0 0 0.5rem 0' }}>{profile?.name || 'User'}</div>
                    {getHeaderLinks(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN').map((link, idx) => (
                      <Link
                        key={`mob-main-${idx}`}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={styles.drawerNavLink}
                        style={{ fontWeight: 500, fontSize: '0.9375rem', display: 'flex', alignItems: 'center' }}
                      >
                        {link.label}
                        {link.badge && <span className={styles.freeBadge}>{link.badge}</span>}
                      </Link>
                    ))}
                    
                    <div className={styles.ppDropdownDivider} style={{ margin: '1rem 0' }} />
                    <div className={styles.ppDropdownSectionTitle} style={{ padding: '0 0 0.5rem 0' }}>My Activity</div>
                    {getActivityLinks().map((link, idx) => (
                      <Link
                        key={`mob-activity-${idx}`}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={styles.drawerNavLink}
                        style={{ fontWeight: 500, fontSize: '0.9375rem' }}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </>
                )}
              </nav>

              <div className={styles.drawerFooter}>
                {user ? (
                  <>
                    <Button
                      href={(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') ? '/admin' : '/dashboard'}
                      variant="outline"
                      fullWidth
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') ? 'Admin Portal' : 'Dashboard'}
                    </Button>
                    <Button
                      variant="ghost"
                      fullWidth
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                    >
                      Log Out
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                  >
                    Log In
                  </Button>
                )}
                <Button
                  href="/post-property"
                  variant="primary"
                  fullWidth
                  onClick={() => setMobileMenuOpen(false)}
                  className={styles.capsuleBtn}
                >
                  <span>Post property</span>
                  <span className={styles.freeBadge}>FREE</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </header>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <MobileBottomNav onMenuClick={() => setMobileMenuOpen(true)} />
    </div>
  );
};

export default Header;
