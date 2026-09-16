'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './MobileMenuDrawer.module.css';
import { useMobileMenu } from '@/context/MobileMenuContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { 
  Plus, 
  MessageCircle, 
  Crown, 
  ArrowUp, 
  HardHat, 
  Building, 
  Building2,
  Home, 
  BedDouble, 
  PlusSquare, 
  Info, 
  Store, 
  Map, 
  Factory, 
  TrendingUp, 
  BarChart2, 
  Calculator, 
  Maximize, 
  FileText, 
  BookOpen, 
  Globe, 
  MapPin, 
  MessageSquare, 
  PhoneCall, 
  Heart, 
  Eye, 
  User, 
  Headset, 
  Headphones, 
  HelpCircle, 
  Bell, 
  Key,
  History,
  LogOut
} from 'lucide-react';

const CATEGORIES = [
  { 
    id: 'sell_rent', 
    label: 'Sell/Rent', 
    icon: (
      <div className={styles.sellRentBadgeIcon}>
        <span className={styles.sellRentPlus}>+</span>
        <span className={styles.sellRentFree}>FREE</span>
      </div>
    ) 
  },
  { id: 'buy_residential', label: 'Buy Residential', icon: <Home size={20} /> },
  { id: 'rent_pg', label: 'Rent / PG', icon: <Key size={20} /> },
  { id: 'buy_commercial', label: 'Buy Commercial', icon: <Store size={20} /> },
  { id: 'lease_commercial', label: 'Lease Commercial', icon: <Building2 size={20} /> },
  { 
    id: 'price_insights', 
    label: 'Price & Insights', 
    icon: <span className={styles.rupeeIcon}>₹</span> 
  },
  { id: 'activity_support', label: 'Activity & Support', icon: <History size={20} /> },
];

type SubOptionItem = {
  label: string;
  icon: React.ReactNode;
  bg: string;
  iconBg: string;
  fullWidth?: boolean;
  href?: string;
  action?: 'whatsapp' | 'toast';
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
    },
    {
      title: 'Stand out with higher visibility',
      items: [
        { label: 'Owner Plans', icon: <Crown size={22} color="#ed8936" />, bg: 'transparent', iconBg: 'transparent', href: '/post-property#pricing' },
        { label: 'Dealer Plans', icon: <ArrowUp size={22} color="#22c55e" strokeWidth={2.5} />, bg: 'transparent', iconBg: 'transparent', href: '/post-property#pricing' },
        { label: 'Builder Plans', icon: <HardHat size={22} color="#ed8936" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/post-property#pricing' }
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
        { label: 'Farm House', icon: <Home size={20} color="#b7791f" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=sale&property_type=FARM_HOUSE' },
        { label: 'Serviced Apartments', icon: <BedDouble size={20} color="#c53030" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/listings?type=sale&property_type=APARTMENT' }
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
        { label: 'Serviced Apartments', icon: <BedDouble size={20} color="#c53030" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=rent&property_type=APARTMENT' },
        { label: 'Farm House', icon: <Home size={20} color="#b7791f" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=rent&property_type=FARM_HOUSE' }
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
        { label: 'Ready to move Offices', icon: <Building size={20} color="#553c9a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=buy&property_type=OFFICE' },
        { label: 'Bare shell Offices', icon: <Building size={20} color="#2f855a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=buy&property_type=OFFICE' },
        { label: 'Plot / Land', icon: <Map size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=buy&property_type=COMMERCIAL_LAND' },
        { label: 'Factory Manufacturing', icon: <Factory size={20} color="#b7791f" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=buy&property_type=WAREHOUSE' },
        { label: 'Warehouse', icon: <Factory size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=buy&property_type=WAREHOUSE' },
        { label: 'Others', icon: <Home size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/listings?type=commercial&commercial_trade=buy' }
      ]
    }
  ],
  lease_commercial: [
    {
      title: 'Property Options',
      items: [
        { label: 'Ready to move Offices', icon: <Building size={20} color="#553c9a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=OFFICE' },
        { label: 'Bare shell Offices', icon: <Building size={20} color="#2f855a" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=OFFICE' },
        { label: 'Co-working Offices', icon: <Building size={20} color="#c53030" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=OFFICE' },
        { label: 'Retail Shops / Showrooms', icon: <Store size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=SHOP' },
        { label: 'Warehouse', icon: <Factory size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=WAREHOUSE' },
        { label: 'Factory / Manufacturing', icon: <Factory size={20} color="#b7791f" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=WAREHOUSE' },
        { label: 'Plot / Land', icon: <Map size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease&property_type=COMMERCIAL_LAND' },
        { label: 'Others', icon: <Home size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/listings?type=commercial&commercial_trade=lease' }
      ]
    }
  ],
  price_insights: [
    {
      title: 'Insights',
      items: [
        { label: 'Real Estate Insights', icon: <BarChart2 size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', action: 'toast' },
        { label: 'Price Trends', icon: <TrendingUp size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent', action: 'toast' }
      ]
    },
    {
      title: 'Tools',
      items: [
        { label: 'Budget Calculator', icon: <Calculator size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent', action: 'toast' },
        { label: 'Area Converter', icon: <Maximize size={20} color="#c53030" />, bg: 'transparent', iconBg: 'transparent', action: 'toast' }
      ]
    },
    {
      title: 'Articles & Guides',
      items: [
        { label: 'Articles', icon: <FileText size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', action: 'toast' },
        { label: 'Home Buying Guide', icon: <BookOpen size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', action: 'toast' },
        { label: 'Home Interiors Guide', icon: <BookOpen size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', action: 'toast' },
        { label: 'Seller Guide', icon: <BookOpen size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent', action: 'toast' }
      ]
    },
    {
      title: 'Discover',
      items: [
        { label: 'All India Homepage', icon: <Globe size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/' },
        { label: 'NRI Homepage', icon: <MapPin size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent', action: 'toast' }
      ]
    },
    {
      title: 'Review your Society or Locality',
      items: [
        { label: 'Share reviews', icon: <MessageSquare size={20} color="#ed8936" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, action: 'toast' }
      ]
    }
  ],
  activity_support: [
    {
      title: 'Activity',
      items: [
        { label: 'Contacted', icon: <PhoneCall size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', href: '/dashboard/interests' },
        { label: 'Shortlisted', icon: <Heart size={20} color="#c53030" />, bg: 'transparent', iconBg: 'transparent', href: '/dashboard/interests' },
        { label: 'Viewed', icon: <Eye size={20} color="#ed8936" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true, href: '/dashboard' }
      ]
    },
    {
      title: 'Support & Settings',
      items: [
        { label: 'Log in', icon: <User size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/login' },
        { label: 'Customer Service', icon: <Headset size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/contact' },
        { label: 'Contact Us', icon: <Headphones size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/contact' },
        { label: 'Request Info', icon: <HelpCircle size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/contact' },
        { label: 'Give Feedback', icon: <MessageSquare size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/contact' },
        { label: 'Communication Settings', icon: <Bell size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent', href: '/dashboard/profile' }
      ]
    }
  ]
};

export const MobileMenuDrawer: React.FC = () => {
  const { isMenuOpen, closeMenu } = useMobileMenu();
  const [activeTab, setActiveTab] = useState('sell_rent');
  const router = useRouter();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { user, profile, signOut } = useAuth();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };
    if (isMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen, closeMenu]);

  if (!isMenuOpen) return null;

  const currentOptions = SUB_OPTIONS[activeTab as keyof typeof SUB_OPTIONS] || [];

  const handleOptionClick = (item: SubOptionItem) => {
    closeMenu();
    
    if (item.action === 'whatsapp') {
      const phone = settings?.contactPhone?.replace(/[^0-9]/g, '') || '919999999999';
      window.open(`https://wa.me/${phone}?text=Hi%20I%20want%20to%20post%20a%20property`, '_blank');
      return;
    }

    if (item.action === 'toast') {
      showToast('Coming Soon', `${item.label} will be available in a future update!`, 'info');
      return;
    }

    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <div className={styles.drawerOverlay} onClick={closeMenu}>
      <div 
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
            ×
          </button>
        </div>
        
        <div className={styles.body}>
          <div className={styles.sidebar} role="tablist" aria-label="Category tabs">
            {CATEGORIES.map(cat => (
              <button 
                type="button"
                key={cat.id} 
                role="tab"
                aria-selected={activeTab === cat.id}
                className={`${styles.tabItem} ${activeTab === cat.id ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(cat.id)}
              >
                <div className={styles.tabIcon}>{cat.icon}</div>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
          
          <div className={styles.contentArea}>
            {/* Login / Personalize Experience Card */}
            <div className={styles.loginCard}>
              <div className={styles.loginCardHeader}>
                <div className={styles.loginAvatarCircle}>
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name || 'User'} className={styles.loginAvatarImg} />
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
                      await signOut();
                      showToast('Logged Out', 'You have been signed out successfully.', 'info');
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
                    {section.items.map((item, i) => (
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
