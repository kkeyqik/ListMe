'use client';

import React, { useState } from 'react';
import styles from './MobileMenuDrawer.module.css';
import { useMobileMenu } from '@/context/MobileMenuContext';
import { Plus, MessageCircle, Crown, ArrowUp, HardHat, Building, Home, BedDouble, PlusSquare, Info, Store, Map, Factory, TrendingUp, BarChart2, Calculator, Maximize, FileText, BookOpen, Globe, MapPin, MessageSquare, PhoneCall, Heart, Eye, User, Headset, Headphones, HelpCircle, Bell, Key } from 'lucide-react';

const CATEGORIES = [
  { id: 'sell_rent', label: 'Sell/Rent', icon: <PlusSquare size={20} /> },
  { id: 'buy_residential', label: 'Buy Residential', icon: <Home size={20} /> },
  { id: 'rent_pg', label: 'Rent / PG', icon: <Key size={20} /> },
  { id: 'buy_commercial', label: 'Buy Commercial', icon: <Store size={20} /> },
  { id: 'lease_commercial', label: 'Lease Commercial', icon: <Store size={20} /> },
  { id: 'price_insights', label: 'Price & Insights', icon: <TrendingUp size={20} /> },
  { id: 'activity_support', label: 'Activity & Support', icon: <Info size={20} /> },
];

type SubOptionItem = {
  label: string;
  icon: React.ReactNode;
  bg: string;
  iconBg: string;
  fullWidth?: boolean;
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
        { label: 'Post Property', icon: <Plus size={16} color="white" />, bg: '#3182ce', iconBg: '#3182ce' },
        { label: 'Post via WhatsApp', icon: <MessageCircle size={16} color="white" />, bg: '#48bb78', iconBg: '#48bb78' }
      ]
    },
    {
      title: 'Stand out with higher visibility',
      items: [
        { label: 'Owner Plans', icon: <Crown size={20} color="#ed8936" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Dealer Plans', icon: <ArrowUp size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Builder Plans', icon: <HardHat size={20} color="#ed8936" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true }
      ]
    }
  ],
  buy_residential: [
    {
      title: 'Property Options',
      items: [
        { label: 'Flat / Apartment', icon: <Building size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Residential Land', icon: <Map size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Independent House / Villa', icon: <Home size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Builder Floor', icon: <Building size={20} color="#553c9a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Studio Apartment', icon: <BedDouble size={20} color="#2f855a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Farm House', icon: <Home size={20} color="#b7791f" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Serviced Apartments', icon: <BedDouble size={20} color="#c53030" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true }
      ]
    }
  ],
  rent_pg: [
    {
      title: 'PG/Co-living options',
      items: [
        { label: 'PG/Co-living properties', icon: <Building size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true }
      ]
    }
  ],
  buy_commercial: [
    {
      title: 'Property Options',
      items: [
        { label: 'Retail Shops / Showrooms', icon: <Store size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Ready to move Offices', icon: <Building size={20} color="#553c9a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Bare shell Offices', icon: <Building size={20} color="#2f855a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Plot / Land', icon: <Map size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Factory Manufacturing', icon: <Factory size={20} color="#b7791f" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Warehouse', icon: <Factory size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Others', icon: <Home size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true }
      ]
    }
  ],
  lease_commercial: [
    {
      title: 'Property Options',
      items: [
        { label: 'Ready to move Offices', icon: <Building size={20} color="#553c9a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Bare shell Offices', icon: <Building size={20} color="#2f855a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Co-working Offices', icon: <Building size={20} color="#c53030" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Retail Shops / Showrooms', icon: <Store size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Warehouse', icon: <Factory size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Factory / Manufacturing', icon: <Factory size={20} color="#b7791f" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Plot / Land', icon: <Map size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Others', icon: <Home size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' }
      ]
    }
  ],
  price_insights: [
    {
      title: 'Insights',
      items: [
        { label: 'Real Estate Insights', icon: <BarChart2 size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Price Trends', icon: <TrendingUp size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent' }
      ]
    },
    {
      title: 'Tools',
      items: [
        { label: 'Budget Calculator', icon: <Calculator size={20} color="#48bb78" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Area Converter', icon: <Maximize size={20} color="#c53030" />, bg: 'transparent', iconBg: 'transparent' }
      ]
    },
    {
      title: 'Articles & Guides',
      items: [
        { label: 'Articles', icon: <FileText size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Home Buying Guide', icon: <BookOpen size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Home Interiors Guide', icon: <BookOpen size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Seller Guide', icon: <BookOpen size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent' }
      ]
    },
    {
      title: 'Discover',
      items: [
        { label: 'All India Homepage', icon: <Globe size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'NRI Homepage', icon: <MapPin size={20} color="#d69e2e" />, bg: 'transparent', iconBg: 'transparent' }
      ]
    },
    {
      title: 'Review your Society or Locality',
      items: [
        { label: 'Share reviews', icon: <MessageSquare size={20} color="#ed8936" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true }
      ]
    }
  ],
  activity_support: [
    {
      title: 'Activity',
      items: [
        { label: 'Contacted', icon: <PhoneCall size={20} color="#3182ce" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Shortlisted', icon: <Heart size={20} color="#c53030" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Viewed', icon: <Eye size={20} color="#ed8936" />, bg: 'transparent', iconBg: 'transparent', fullWidth: true }
      ]
    },
    {
      title: 'Support & Settings',
      items: [
        { label: 'Log in', icon: <User size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Customer Service', icon: <Headset size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Contact Us', icon: <Headphones size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Request Info', icon: <HelpCircle size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Give Feedback', icon: <MessageSquare size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent' },
        { label: 'Communication Settings', icon: <Bell size={20} color="#0f172a" />, bg: 'transparent', iconBg: 'transparent' }
      ]
    }
  ]
};

export const MobileMenuDrawer: React.FC = () => {
  const { isMenuOpen, closeMenu } = useMobileMenu();
  const [activeTab, setActiveTab] = useState('sell_rent');

  if (!isMenuOpen) return null;

  const currentOptions = SUB_OPTIONS[activeTab as keyof typeof SUB_OPTIONS] || [];

  return (
    <div className={styles.drawerOverlay} onClick={closeMenu}>
      <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>All Categories</h2>
          <button className={styles.closeButton} onClick={closeMenu}>×</button>
        </div>
        
        <div className={styles.body}>
          <div className={styles.sidebar}>
            {CATEGORIES.map(cat => (
              <div 
                key={cat.id} 
                className={`${styles.tabItem} ${activeTab === cat.id ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(cat.id)}
              >
                <div className={styles.tabIcon}>{cat.icon}</div>
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
          
          <div className={styles.contentArea}>
            {currentOptions.length > 0 ? (
              currentOptions.map((section, idx) => (
                <div key={idx} className={styles.sectionBlock}>
                  <h3 className={styles.sectionTitle}>{section.title}</h3>
                  <div className={styles.gridContainer}>
                    {section.items.map((item, i) => (
                      <div key={i} className={`${styles.optionCard} ${item.fullWidth ? styles.fullWidthCard : ''}`}>
                        <div 
                          className={styles.optionIconCircle} 
                          style={{ backgroundColor: item.iconBg === 'transparent' ? 'transparent' : item.iconBg }}
                        >
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
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
              <button className={styles.rateBtn}>Rate now</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
