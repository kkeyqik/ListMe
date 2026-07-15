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

export const Header: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [postPropDrawerOpen, setPostPropDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [recentViews, setRecentViews] = useState<any[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const searches = localStorage.getItem('listme_recent_searches');
        const views = localStorage.getItem('listme_recent_views');
        
        const parsedSearches = searches ? JSON.parse(searches) : [];
        const parsedViews = views ? JSON.parse(views) : [];
        
        // Fallback mock entries if no searches/views exist yet
        const mockSearches = [
          { display: 'Whitefield • Bangalore', params: 'city=bangalore&query=Whitefield' }
        ];
        const mockViews = [
          { id: 'static-1', title: 'Luxury Villa in Whitefield', locality: 'Whitefield', city: 'Bangalore' }
        ];
        
        setRecentSearches(parsedSearches.length > 0 ? parsedSearches : mockSearches);
        setRecentViews(parsedViews.length > 0 ? parsedViews : mockViews);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

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
                    {(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') ? (
                      <Link
                        href="/admin"
                        className={styles.ppDropdownItem}
                        role="menuitem"
                      >
                        <User size={16} />
                        <span>Go to Admin Portal</span>
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard"
                        className={styles.ppDropdownItem}
                        role="menuitem"
                      >
                        <User size={16} />
                        <span>Go to Dashboard</span>
                      </Link>
                    )}
                    <Link
                      href="/dashboard/profile"
                      className={styles.ppDropdownItem}
                      role="menuitem"
                    >
                      <User size={16} />
                      <span>Go to Profile</span>
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className={styles.ppDropdownItem}
                      role="menuitem"
                      style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
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

                <div className={styles.ppDropdownDivider} />

                <div className={styles.ppDropdownSectionHeader}>Recently Searched</div>
                {recentSearches.map((item, idx) => (
                  <Link
                    key={`search-${idx}`}
                    href={`/listings?${item.params}`}
                    className={styles.ppDropdownItem}
                    role="menuitem"
                  >
                    <Search size={16} />
                    <div className={styles.ppDropdownItemContent}>
                      <span className={styles.ppDropdownLabel}>{item.display}</span>
                    </div>
                  </Link>
                ))}

                <div className={styles.ppDropdownDivider} />

                <div className={styles.ppDropdownSectionHeader}>Recently Viewed</div>
                {recentViews.map((item, idx) => (
                  <Link
                    key={`view-${idx}`}
                    href={`/property/${item.id}`}
                    className={styles.ppDropdownItem}
                    role="menuitem"
                  >
                    <Eye size={16} />
                    <div className={styles.ppDropdownItemContent}>
                      <span className={styles.ppDropdownLabel}>{item.title}</span>
                      {item.locality && item.city && (
                        <span className={styles.ppDropdownMeta}>{`${item.locality}, ${item.city}`}</span>
                      )}
                    </div>
                  </Link>
                ))}
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
                {(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') ? (
                  <Link
                    href="/admin"
                    className={styles.ppDropdownItem}
                    role="menuitem"
                  >
                    <User size={16} />
                    <span>Go to Admin Portal</span>
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className={styles.ppDropdownItem}
                    role="menuitem"
                  >
                    <User size={16} />
                    <span>Go to Dashboard</span>
                  </Link>
                )}
                <Link
                  href="/dashboard/profile"
                  className={styles.ppDropdownItem}
                  role="menuitem"
                >
                  <User size={16} />
                  <span>Go to Profile</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className={styles.ppDropdownItem}
                  role="menuitem"
                  style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>

                <div className={styles.ppDropdownDivider} />

                <div className={styles.ppDropdownSectionHeader}>Recently Searched</div>
                {recentSearches.slice(0, 3).map((item, idx) => (
                  <Link
                    key={`search-${idx}`}
                    href={`/listings?${item.params}`}
                    className={styles.ppDropdownItem}
                    role="menuitem"
                  >
                    <Search size={16} />
                    <div className={styles.ppDropdownItemContent}>
                      <span className={styles.ppDropdownLabel}>{item.display}</span>
                    </div>
                  </Link>
                ))}

                <div className={styles.ppDropdownDivider} />

                <div className={styles.ppDropdownSectionHeader}>Recently Viewed</div>
                {recentViews.slice(0, 3).map((item, idx) => (
                  <Link
                    key={`view-${idx}`}
                    href={`/property/${item.id}`}
                    className={styles.ppDropdownItem}
                    role="menuitem"
                  >
                    <Eye size={16} />
                    <div className={styles.ppDropdownItemContent}>
                      <span className={styles.ppDropdownLabel}>{item.title}</span>
                      {item.locality && item.city && (
                        <span className={styles.ppDropdownMeta}>{`${item.locality}, ${item.city}`}</span>
                      )}
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
    </div>
  );
};

export default Header;
