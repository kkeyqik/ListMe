'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  User,
  ChevronRight,
  Info,
  HelpCircle,
  Newspaper,
} from 'lucide-react';
import { Button } from '../ui';
import styles from './Header.module.css';
import { useAuth } from '@/context/AuthContext';
import { useMobileMenu } from '@/context/MobileMenuContext';
import dynamic from 'next/dynamic';
import { getWhatsAppLink } from '@/lib/contact-info';
import { useBodyScrollLock, useDialogFocus, useCloseAboveBreakpoint } from '@/lib/use-dialog';

const whatsappHref = getWhatsAppLink('Hi ListMe, I want to post a property');

// Reports the current query string. Kept in its own Suspense boundary so useSearchParams
// doesn't force every statically rendered page that shows the header into client rendering.
function SearchParamsSync({ onChange }: { onChange: (search: string) => void }) {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  useEffect(() => {
    onChange(search);
  }, [search, onChange]);
  return null;
}

const AuthModal = dynamic(() => import('../auth/AuthModal').then((mod) => mod.AuthModal), {
  ssr: false,
});

export const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { isMenuOpen, openMenu } = useMobileMenu();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [postPropDrawerOpen, setPostPropDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const pathname = usePathname();
  // Query string of the current URL, so Buy (?type=sale) and Rent (?type=rent) aren't both
  // highlighted on /listings (filled in by <SearchParamsSync />).
  const [currentSearch, setCurrentSearch] = useState('');
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const ppDrawerRef = useRef<HTMLElement>(null);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const closePostPropDrawer = useCallback(() => setPostPropDrawerOpen(false), []);

  const getHeaderLinks = (isAdmin: boolean) => [
    { label: 'Post Property', href: '/post-property', badge: 'FREE' },
    { label: isAdmin ? 'Admin Portal' : 'My Dashboard', href: isAdmin ? '/admin' : '/dashboard' },
    { label: 'Manage Listings', href: '/dashboard/listings' },
    { label: 'View Responses', href: '/dashboard/interests' },
    { label: 'Manage Profile', href: '/dashboard/profile' },
    { label: 'Account Settings', href: '/dashboard/profile' },
  ];

  const getActivityLinks = () => [
    { label: 'Search Listings', href: '/listings' },
    { label: 'Contacted Properties', href: '/dashboard/interests' },
    { label: 'My Interests', href: '/dashboard/interests' },
    { label: 'My Listings', href: '/dashboard/listings' },
  ];


  const isPostPropertyRoute = pathname ? pathname.startsWith('/post-property') : false;

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close drawers on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setPostPropDrawerOpen(false);
  }, [pathname]);

  // Ref-counted body scroll lock, focus trap/restore and Escape handling for both drawers
  useBodyScrollLock(postPropDrawerOpen || mobileMenuOpen);
  useDialogFocus(mobileMenuOpen, mobileDrawerRef, closeMobileMenu);
  useDialogFocus(postPropDrawerOpen, ppDrawerRef, closePostPropDrawer);
  // The standard mobile drawer is hidden by CSS at 1024px+; close it so it can't keep the page locked.
  useCloseAboveBreakpoint(mobileMenuOpen, closeMobileMenu);

  const navLinks = [
    { label: 'Buy', href: '/listings?type=sale' },
    { label: 'Rent', href: '/listings?type=rent' },
    { label: 'Post Property', href: '/post-property' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    const [path, query] = href.split('?');
    if (!pathname.startsWith(path)) return false;
    if (!query) return true;
    const wanted = new URLSearchParams(query);
    const current = new URLSearchParams(currentSearch);
    for (const [key, value] of wanted) {
      if (current.get(key) !== value) return false;
    }
    return true;
  };

  const isHome = pathname === '/';

  // ─── POST PROPERTY HEADER ────────────────────────────────
  if (isPostPropertyRoute) {
    return (
      <div className={styles.ppHeaderWrapper}>
        <header className={`${styles.ppHeader} ${scrolled ? styles.ppHeaderScrolled : ''}`}>
          {/* Left: Mobile Menu Button + Logo */}
          <div className={styles.ppHeaderLeft}>
            <button
              type="button"
              className={styles.ppMobileMenuBtn}
              onClick={openMenu}
              aria-label="Open category navigation menu"
              aria-expanded={isMenuOpen}
            >
              <Menu size={24} />
            </button>

            {/* Logo */}
            <Link href="/" className={styles.ppLogo}>
              <Home className={styles.ppLogoIcon} size={28} />
              <span className={styles.ppLogoText}>ListMe</span>
            </Link>
          </div>

          {/* Mobile Right WhatsApp Action (hidden until NEXT_PUBLIC_WHATSAPP_NUMBER is set) */}
          {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ppWhatsappBtn}
            aria-label="Post via Whatsapp"
          >
            <span className={styles.ppWhatsappText}>Post via Whatsapp</span>
            <span className={styles.ppWhatsappBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.84-1.56 1.56-3.64 2.42-5.83 2.42-1.43 0-2.83-.37-4.07-1.07l-.29-.17-3.03.79.81-2.95-.19-.3a8.216 8.216 0 01-1.26-4.32c0-4.54 3.7-8.24 8.24-8.24zm4.5 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.02 2.6c.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.3z"/>
              </svg>
            </span>
          </a>
          )}

          {/* Right Controls */}
          <div className={`${styles.ppRightControls} ${styles.ppDesktopControls}`}>
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
              type="button"
              className={styles.ppIconButton}
              onClick={() => setPostPropDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={postPropDrawerOpen}
            >
              <Menu size={22} />
            </button>
          </div>
        </header>

        {/* ── Full-height Side Drawer ── */}
        {postPropDrawerOpen && createPortal(
          <>
            <div
              className={styles.ppDrawerOverlay}
              onClick={() => setPostPropDrawerOpen(false)}
              aria-hidden="true"
            />
            <aside
              ref={ppDrawerRef}
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

                {/* Content Group (unbuilt items such as Home Loans and the app download are hidden) */}
                <Link href="/blog" className={styles.ppDrawerLink} onClick={() => setPostPropDrawerOpen(false)}>
                  <Newspaper size={16} />
                  <span>Articles & News</span>
                </Link>
                <Link href="/faq" className={styles.ppDrawerLink} onClick={() => setPostPropDrawerOpen(false)}>
                  <HelpCircle size={16} />
                  <span>FAQ</span>
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
              </nav>
            </aside>
          </>,
          document.body
        )}
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  // ─── STANDARD HEADER (all other routes) ──────────────────
  return (
    <div className={`${styles.headerWrapper} ${isHome ? styles.homeHeaderWrapper : ''}`}>
      <Suspense fallback={null}>
        <SearchParamsSync onChange={setCurrentSearch} />
      </Suspense>
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
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={styles.mobileMenuButton}
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu size={24} />
        </button>

        {/* Mobile Nav Overlay & Drawer: portalled to <body> so the header's
            backdrop-filter/transform can't become their containing block */}
        {mobileMenuOpen && createPortal(
          <>
            <div className={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
            <div ref={mobileDrawerRef} className={styles.mobileDrawer} role="dialog" aria-modal="true" aria-label="Navigation menu">
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
          </>,
          document.body
        )}
      </header>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Header;
