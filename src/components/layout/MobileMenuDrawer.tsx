'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from './MobileMenuDrawer.module.css';
import { useMobileMenu } from '@/context/MobileMenuContext';
import { getWhatsAppLink, getWhatsAppNumber } from '@/lib/contact-info';
import { useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock, useDialogFocus, useCloseAboveBreakpoint } from '@/lib/use-dialog';
import {
  Plus,
  MessageCircle,
  Building,
  Home,
  BedDouble,
  PlusSquare,
  Info,
  Store,
  Map,
  Factory,
  FileText,
  BookOpen,
  Globe,
  MessageSquare,
  PhoneCall,
  User,
  Headset,
  Headphones,
  HelpCircle,
  Key,
  LogOut,
  X,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'sell_rent', label: 'Sell/Rent', icon: <PlusSquare size={20} /> },
  { id: 'buy_residential', label: 'Buy Residential', icon: <Home size={20} /> },
  { id: 'rent_pg', label: 'Rent / PG', icon: <Key size={20} /> },
  { id: 'buy_commercial', label: 'Buy Commercial', icon: <Store size={20} /> },
  { id: 'lease_commercial', label: 'Lease Commercial', icon: <Store size={20} /> },
  { id: 'price_insights', label: 'Guides & Help', icon: <BookOpen size={20} /> },
  { id: 'activity_support', label: 'Activity & Support', icon: <Info size={20} /> },
];

// WhatsApp posting is offered only when a real number is configured.
const WHATSAPP_ENABLED = getWhatsAppNumber() !== null;

type SubOptionItem = {
  label: string;
  icon: React.ReactNode;
  bg: string;
  iconBg: string;
  fullWidth?: boolean;
  href?: string;
  action?: 'whatsapp';
};

type SubOptionSection = {
  title: string;
  items: SubOptionItem[];
};

type SubOptionsType = Record<string, SubOptionSection[]>;

const SUB_OPTIONS: SubOptionsType = {
  sell_rent: [
    {
      title: 'Property posting options',
      items: [
        { label: 'Post Property', icon: <Plus size={18} color="white" strokeWidth={2.5} />, bg: '#0078db', iconBg: '#0078db', href: '/post-property' },
        { label: 'Post via WhatsApp', icon: <MessageCircle size={18} color="white" />, bg: '#25d366', iconBg: '#25d366', action: 'whatsapp' }
      ]
    }
  ],
  buy_residential: [
    {
      title: 'Property Options',
      items: [
        { label: 'Flat / Apartment', icon: <Building size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=sale&property_type=APARTMENT' },
        { label: 'Residential Land', icon: <Map size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=sale&property_type=PLOT' },
        { label: 'Independent House / Villa', icon: <Home size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=sale&property_type=VILLA' },
        { label: 'Builder Floor', icon: <Building size={20} color="#553c9a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=sale&property_type=BUILDER_FLOOR' },
        { label: 'Studio Apartment', icon: <BedDouble size={20} color="#2f855a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=sale&property_type=STUDIO' },
        { label: 'Farm House', icon: <Home size={20} color="#b7791f" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/listings?type=sale&property_type=FARM_HOUSE' }
      ]
    }
  ],
  rent_pg: [
    {
      title: 'Property Options',
      items: [
        { label: 'Flat / Apartment', icon: <Building size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=rent&property_type=APARTMENT' },
        { label: 'Independent House / Villa', icon: <Home size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=rent&property_type=VILLA' },
        { label: 'Builder Floor', icon: <Building size={20} color="#553c9a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=rent&property_type=BUILDER_FLOOR' },
        { label: 'Studio Apartment', icon: <BedDouble size={20} color="#2f855a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=rent&property_type=STUDIO' },
        { label: 'Farm House', icon: <Home size={20} color="#b7791f" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/listings?type=rent&property_type=FARM_HOUSE' }
      ]
    },
    {
      title: 'PG/Co-living options',
      items: [
        { label: 'PG/Co-living properties', icon: <Building size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/listings?type=rent&property_type=PG' }
      ]
    }
  ],
  buy_commercial: [
    {
      title: 'Property Options',
      items: [
        { label: 'Retail Shops / Showrooms', icon: <Store size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=buy&property_type=SHOP' },
        { label: 'Offices', icon: <Building size={20} color="#553c9a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=buy&property_type=OFFICE' },
        { label: 'Plot / Land', icon: <Map size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=buy&property_type=COMMERCIAL_LAND' },
        { label: 'Warehouse / Factory', icon: <Factory size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=buy&property_type=WAREHOUSE' },
        { label: 'All Commercial', icon: <Home size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/listings?type=commercial&commercial_trade=buy' }
      ]
    }
  ],
  lease_commercial: [
    {
      title: 'Property Options',
      items: [
        { label: 'Offices', icon: <Building size={20} color="#553c9a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=OFFICE' },
        { label: 'Retail Shops / Showrooms', icon: <Store size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=SHOP' },
        { label: 'Warehouse / Factory', icon: <Factory size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=WAREHOUSE' },
        { label: 'Plot / Land', icon: <Map size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=COMMERCIAL_LAND' },
        { label: 'All Commercial', icon: <Home size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/listings?type=commercial&commercial_trade=lease' }
      ]
    }
  ],
  price_insights: [
    {
      title: 'Articles & Guides',
      items: [
        { label: 'Articles', icon: <FileText size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/blog' },
        { label: 'Buying & Selling Tips', icon: <BookOpen size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent', href: '/tips' },
        { label: 'FAQ', icon: <HelpCircle size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/faq' },
        { label: 'About ListMe', icon: <Info size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/about' }
      ]
    },
    {
      title: 'Discover',
      items: [
        { label: 'All India Homepage', icon: <Globe size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/' }
      ]
    },
    {
      title: 'Legal',
      items: [
        { label: 'Privacy Policy', icon: <FileText size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/privacy' },
        { label: 'Terms of Service', icon: <FileText size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/terms' }
      ]
    }
  ],
  activity_support: [
    {
      title: 'Activity',
      items: [
        { label: 'Contacted', icon: <PhoneCall size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/dashboard/interests' },
        { label: 'My Listings', icon: <Building size={20} color="#ed8936" />, bg: 'transparent', iconBg: 'transparent', href: '/dashboard/listings' }
      ]
    },
    {
      title: 'Support & Settings',
      items: [
        { label: 'Manage Profile', icon: <User size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/dashboard/profile' },
        { label: 'Customer Service', icon: <Headset size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/contact' },
        { label: 'Contact Us', icon: <Headphones size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/contact' },
        { label: 'Request Info', icon: <HelpCircle size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/contact' },
        { label: 'Give Feedback', icon: <MessageSquare size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/contact' }
      ]
    }
  ]
};

export const MobileMenuDrawer: React.FC = () => {
  const { isMenuOpen, closeMenu } = useMobileMenu();
  const [activeTab, setActiveTab] = useState('sell_rent');
  const [avatarError, setAvatarError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const { user, profile, signOut } = useAuth();

  // Auto-close only when pathname actually changes (navigation occurred)
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      closeMenu();
    }
  }, [pathname, closeMenu]);

  // Reset avatar error fallback if profile image updates
  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatarUrl]);

  // Ref-counted scroll lock, focus trap/restore and Escape; close if the viewport
  // grows to desktop width, where this drawer is hidden by CSS.
  const drawerRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(isMenuOpen);
  useDialogFocus(isMenuOpen, drawerRef, closeMenu);
  useCloseAboveBreakpoint(isMenuOpen, closeMenu);

  // Scroll content area to top whenever active category tab changes so Login Card is always visible
  const contentAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const currentOptions = SUB_OPTIONS[activeTab as keyof typeof SUB_OPTIONS] || [];

  if (!isMenuOpen) return null;

  const handleOptionClick = (item: SubOptionItem) => {
    closeMenu();
    
    if (item.action === 'whatsapp') {
      const link = getWhatsAppLink('Hi ListMe, I want to post a property');
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }

    if (item.href) {
      if (item.href.startsWith('/dashboard') && !user) {
        router.push(`/login?redirect=${encodeURIComponent(item.href)}`);
      } else {
        router.push(item.href);
      }
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={closeMenu}>
      <div
        ref={drawerRef}
        className={styles.drawerContent} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-drawer-title"
      >
        <div className={styles.header}>
          <h2 id="mobile-menu-drawer-title">All Categories</h2>
          <button 
            type="button"
            className={styles.closeButton} 
            onClick={closeMenu}
            aria-label="Close categories menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        
        <div className={styles.body}>
          <div className={styles.sidebar} role="tablist" aria-label="Category tabs">
            {CATEGORIES.map(cat => (
              <button 
                type="button"
                key={cat.id} 
                id={`tab-${cat.id}`}
                role="tab"
                aria-selected={activeTab === cat.id}
                aria-controls={`panel-${cat.id}`}
                className={`${styles.tabItem} ${activeTab === cat.id ? styles.activeTab : ''}`}
                onClick={() => {
                  if (activeTab === cat.id) {
                    if (contentAreaRef.current) {
                      contentAreaRef.current.scrollTop = 0;
                    }
                  } else {
                    setActiveTab(cat.id);
                  }
                }}
              >
                <div className={styles.tabIcon}>{cat.icon}</div>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
          
          <div 
            className={styles.contentArea} 
            ref={contentAreaRef}
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {/* Login / Personalize Experience Card — Displayed across all 7 categories */}
            <div className={styles.loginCard}>
              <div className={styles.loginCardHeader}>
                <div className={styles.loginAvatarCircle}>
                  {profile?.avatarUrl && !avatarError ? (
                    <img 
                      src={profile.avatarUrl} 
                      alt={profile.name || 'User'} 
                      className={styles.loginAvatarImg} 
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <User size={22} color={user ? '#0078db' : '#64748b'} />
                  )}
                </div>
                <div className={styles.loginTextWrap}>
                  <span className={styles.loginTitle}>
                    {user ? `Hello, ${profile?.name || user?.email?.split('@')[0] || 'User'}` : 'Hello'}
                  </span>
                  <span className={styles.loginSubtitle}>
                    {user ? (profile?.phone || user?.email || 'Logged in') : 'Login to personalize your experience.'}
                  </span>
                </div>
              </div>

              {user ? (
                <div className={styles.loggedInActions}>
                  <button
                    type="button"
                    className={styles.loginBtn}
                    onClick={() => {
                      closeMenu();
                      const target = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' 
                        ? '/admin' 
                        : '/dashboard';
                      router.push(target);
                    }}
                  >
                    {profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' ? 'Admin Portal' : 'My Dashboard'}
                  </button>
                  <button
                    type="button"
                    className={styles.logoutBtn}
                    onClick={async () => {
                      try {
                        closeMenu();
                        await signOut();
                        showToast('Logged Out', 'You have been signed out successfully.', 'info');
                      } catch (err) {
                        console.error('[MobileMenuDrawer] Logout error:', err);
                      }
                    }}
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.loginBtn}
                  onClick={() => {
                    closeMenu();
                    router.push('/login');
                  }}
                >
                  Login/Register
                </button>
              )}
            </div>

            {currentOptions.length > 0 ? (
              currentOptions.map((section, idx) => (
                <div key={idx} className={styles.sectionBlock}>
                  <h3 className={styles.sectionTitle}>{section.title}</h3>
                  <div className={styles.gridContainer}>
                    {section.items.filter((item) => item.action !== 'whatsapp' || WHATSAPP_ENABLED).map((item, i) => (
                      <button 
                        type="button"
                        key={i} 
                        className={`${styles.optionCard} ${item.fullWidth ? styles.fullWidthCard : ''}`}
                        onClick={() => handleOptionClick(item)}
                      >
                        <div 
                          className={styles.optionIconCircle} 
                          style={{ backgroundColor: item.iconBg === 'transparent' ? 'transparent' : item.iconBg }}
                        >
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <p>Content coming soon</p>
              </div>
            )}
            
            <div className={styles.helpFooter}>
              <span>👍 Help us improve ListMe</span>
              <button 
                type="button"
                className={styles.rateBtn} 
                onClick={() => {
                  closeMenu();
                  router.push('/contact');
                }}
              >
                Rate now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
