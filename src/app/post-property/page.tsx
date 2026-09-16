'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Input, Button, Badge, Select, useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { PhoneVerificationModal } from '@/components/auth/PhoneVerificationModal';
import { 
  Check, 
  ShieldCheck, 
  Coins, 
  Bell, 
  Plus, 
  Minus, 
  PlusCircle,
  ArrowRight, 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Sparkles, 
  ClipboardCheck, 
  Image as ImageIcon, 
  Phone, 
  ChevronDown 
} from 'lucide-react';
import styles from './postproperty.module.css';

// Mock Data
const MOCK_PROPERTIES = [
  {
    id: 'prop-1',
    title: 'Spacious 3 BHK Apartment in HSR Layout',
    price: '₹ 85,000 / month',
    type: 'Rent',
    category: 'Apartment',
    location: 'HSR Layout, Bangalore',
    beds: 3,
    baths: 3,
    area: '1,850 sq.ft',
    verified: true,
    imageUrl: '/images/luxury_villa_hero.png',
  },
  {
    id: 'prop-2',
    title: 'Modern Independent Villa near EPIP Zone',
    price: '₹ 3.2 Crore',
    type: 'Sell',
    category: 'Villa',
    location: 'Whitefield, Bangalore',
    beds: 4,
    baths: 5,
    area: '3,400 sq.ft',
    verified: true,
    imageUrl: '/images/luxury_villa_hero.png',
  },
  {
    id: 'prop-3',
    title: 'Premium Commercial Office Space',
    price: '₹ 1.5 Lakh / month',
    type: 'Rent',
    category: 'Office',
    location: 'Baner, Pune',
    beds: 0,
    baths: 2,
    area: '2,200 sq.ft',
    verified: false,
    imageUrl: '/images/luxury_villa_hero.png',
  },
  {
    id: 'prop-4',
    title: 'Residential Plot for Sale in gated community',
    price: '₹ 1.8 Crore',
    type: 'Sell',
    category: 'Plot',
    location: 'ECR, Chennai',
    beds: 0,
    baths: 0,
    area: '2,400 sq.ft',
    verified: true,
    imageUrl: '/images/luxury_villa_hero.png',
  }
];

const TESTIMONIALS = [
  {
    id: 'test-1',
    text: "Listing my 2 BHK on ListMe was extremely simple. Within 48 hours of posting, I was contacted by three genuine tenants. The OTP verification step filtered out all brokers, saving me a lot of spam. Renting out my house has never been this smooth!",
    author: "Rohan Sen",
    role: "Property Owner, Bangalore",
    avatarInitials: "RS"
  },
  {
    id: 'test-2',
    text: "I sold my commercial plot in Chennai through ListMe. I saved nearly ₹3.6 Lakhs in brokerage commissions! The direct connect model is exactly what the Indian real estate market needed. Highly recommended for any owner looking to sell.",
    author: "Sunita Krishnan",
    role: "Plot Owner, Chennai",
    avatarInitials: "SK"
  },
  {
    id: 'test-3',
    text: "As a commercial asset builder, I manage multiple listings. The ListMe admin dashboard makes tracking leads and managing details simple. Plus, the Verified Owner badge instantly built trust with buyers. Completely free with zero brokerage!",
    author: "Rajesh Mehta",
    role: "Commercial Asset Builder, Mumbai",
    avatarInitials: "RM"
  }
];

const FAQS = [
  {
    question: "Is listing my property really free on ListMe.com?",
    answer: "Yes, posting your property is 100% free. There are no registration charges, listing fees, or subscription costs. You can upload photos, add listing parameters, and get direct leads without paying a rupee."
  },
  {
    question: "How do you protect my privacy from spam and brokers?",
    answer: "ListMe hides your phone number by default from general visitors. To view your contact details, seekers must mark themselves as interested and verify their phone number via a secure OTP. This screens out random callers and brokers."
  },
  {
    question: "What is the difference between Sell and Rent listing flows?",
    answer: "Sell listings require details about ownership, pricing, and possession date, whereas Rent listings focus on rental price, security deposit, power backup, and tenancy rules. You can select either using the type toggle when posting."
  },
  {
    question: "Are there any brokerage fees or commission model at ListMe?",
    answer: "There is absolutely zero brokerage. If you list your property on ListMe, you pay nothing. The transaction is done directly between the owner and seeker. We do not take a cut or charge hidden fees."
  },
  {
    question: "What documents do I need to get the Verified Owner badge?",
    answer: "You simply need to upload a utility bill (like electricity or water bill) or standard registry documents confirming ownership. Our team will review it in under 24 hours to award the Verified Owner badge."
  }
];

const ARTICLES = [
  {
    id: 'art-1',
    category: 'Valuation',
    date: 'July 10, 2026',
    title: 'How to Correctly Price Your Property for Sale',
    desc: 'Avoid overpricing or underselling. Learn how to calculate fair market values using current transaction records and location metrics.',
    imageUrl: '/images/luxury_villa_hero.png',
    href: '/tips',
  },
  {
    id: 'art-2',
    category: 'Staging',
    date: 'June 28, 2026',
    title: '5 Staging Tips to Rent Out Your Home Faster',
    desc: 'First impressions matter. Discover cost-effective staging techniques like decluttering, lighting, and fresh paint to attract premium tenants.',
    imageUrl: '/images/luxury_villa_hero.png',
    href: '/tips',
  },
  {
    id: 'art-3',
    category: 'Market Trends',
    date: 'May 15, 2026',
    title: 'Real Estate Outlook: Residential vs Commercial in 2026',
    desc: 'An in-depth analysis of high-demand areas in tier-1 cities, yield projections, and where you should list to get maximum yields.',
    imageUrl: '/images/luxury_villa_hero.png',
    href: '/blog',
  }
];

// Residential Sell Pills (img1: 8 options)
const RESIDENTIAL_SELL_PILLS = [
  { id: 'flat-apartment', label: 'Flat/Apartment', type: 'APARTMENT' },
  { id: 'house-villa', label: 'Independent House / Villa', type: 'HOUSE' },
  { id: 'builder-floor', label: 'Builder Floor', type: 'APARTMENT' },
  { id: 'plot-land', label: 'Plot / Land', type: 'PLOT' },
  { id: 'studio-apartment', label: '1 RK/ Studio Apartment', type: 'APARTMENT' },
  { id: 'serviced-apartment', label: 'Serviced Apartment', type: 'APARTMENT' },
  { id: 'farmhouse', label: 'Farmhouse', type: 'HOUSE' },
  { id: 'other-res', label: 'Other', type: 'APARTMENT' },
];

// Residential Rent / Lease Pills (img2: 7 options, no Plot/Land)
const RESIDENTIAL_RENT_PILLS = [
  { id: 'flat-apartment', label: 'Flat/Apartment', type: 'APARTMENT' },
  { id: 'house-villa', label: 'Independent House / Villa', type: 'HOUSE' },
  { id: 'builder-floor', label: 'Builder Floor', type: 'APARTMENT' },
  { id: 'studio-apartment', label: '1 RK/ Studio Apartment', type: 'APARTMENT' },
  { id: 'serviced-apartment', label: 'Serviced Apartment', type: 'APARTMENT' },
  { id: 'farmhouse', label: 'Farmhouse', type: 'HOUSE' },
  { id: 'other-res', label: 'Other', type: 'APARTMENT' },
];

// PG Property Pills (img3: 5 options only)
const PG_PROPERTY_PILLS = [
  { id: 'flat-apartment', label: 'Flat/Apartment', type: 'APARTMENT' },
  { id: 'house-villa', label: 'Independent House / Villa', type: 'HOUSE' },
  { id: 'builder-floor', label: 'Builder Floor', type: 'APARTMENT' },
  { id: 'studio-apartment', label: '1 RK/ Studio Apartment', type: 'APARTMENT' },
  { id: 'serviced-apartment', label: 'Serviced Apartment', type: 'APARTMENT' },
];

// PG Room Type Pills (img3: 2 options)
const PG_ROOM_TYPES = [
  { id: 'sharing', label: 'Sharing' },
  { id: 'private', label: 'Private' },
];

// Commercial Pills (img1 & img2: 7 options for both Sell and Rent/Lease)
const COMMERCIAL_PILLS = [
  { id: 'comm-office', label: 'Office', type: 'OFFICE' },
  { id: 'comm-retail', label: 'Retail', type: 'SHOP' },
  { id: 'comm-plot-land', label: 'Plot / Land', type: 'PLOT' },
  { id: 'comm-storage', label: 'Storage', type: 'OFFICE' },
  { id: 'comm-industry', label: 'Industry', type: 'OFFICE' },
  { id: 'comm-hospitality', label: 'Hospitality', type: 'OFFICE' },
  { id: 'comm-other', label: 'Other', type: 'OFFICE' },
];

const COMMERCIAL_SELL_PILLS = COMMERCIAL_PILLS;
const COMMERCIAL_RENT_PILLS = COMMERCIAL_PILLS;

const HouseIllustration = ({ activeTab }: { activeTab: 'sell' | 'rent' | 'pg' }) => {
  const badgeText = activeTab === 'sell' ? 'Sell' : activeTab === 'rent' ? 'Rent' : 'PG';

  return (
    <svg 
      width="220" 
      height="115" 
      viewBox="0 0 240 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      aria-hidden="true"
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {/* Soft ground shadow */}
      <ellipse cx="120" cy="112" rx="95" ry="8" fill="#fef3c7" fillOpacity="0.6" />
      
      {/* Tree on left */}
      <rect x="44" y="82" width="5" height="28" rx="2" fill="#b45309" />
      <ellipse cx="46" cy="72" rx="16" ry="22" fill="#f97316" />
      <ellipse cx="49" cy="68" rx="11" ry="16" fill="#fb923c" />
      
      {/* House Roof & Main Structure */}
      <path d="M88 56 L124 24 L160 56 Z" fill="#0e3860" />
      <rect x="92" y="56" width="64" height="54" fill="#cbe3f7" />
      
      {/* Window */}
      <rect x="116" y="64" width="18" height="16" rx="2" fill="#ffffff" />
      <rect x="118" y="66" width="6" height="5" fill="#7cb2df" />
      <rect x="126" y="66" width="6" height="5" fill="#7cb2df" />
      <rect x="118" y="73" width="6" height="5" fill="#7cb2df" />
      <rect x="126" y="73" width="6" height="5" fill="#7cb2df" />
      
      {/* Right Extension / Garage Facade */}
      <rect x="156" y="68" width="34" height="42" fill="#b3d6f3" />
      <line x1="156" y1="78" x2="190" y2="78" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="156" y1="88" x2="190" y2="88" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="156" y1="98" x2="190" y2="98" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.6" />

      {/* Door with awning */}
      <rect x="98" y="82" width="14" height="28" rx="1" fill="#ffffff" />
      <rect x="96" y="80" width="18" height="3" rx="1.5" fill="#0e3860" />

      {/* Sign Post with dynamic badge */}
      <rect x="180" y="66" width="3" height="44" fill="#ffffff" rx="1" />
      <rect x="174" y="68" width="34" height="3" fill="#ffffff" rx="1" />
      <rect x="182" y="74" width="34" height="20" rx="3" fill="#f59e0b" />
      <text 
        x="199" 
        y="84" 
        textAnchor="middle" 
        dominantBaseline="central"
        fill="#ffffff" 
        fontSize="11" 
        fontWeight="bold" 
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {badgeText}
      </text>
    </svg>
  );
};

const TICKER_ITEMS = [
  {
    prefix: 'Assistance in co-ordinating ',
    highlight: 'site visits*',
  },
  {
    prefix: 'Advertise for ',
    highlight: 'free',
  },
  {
    prefix: 'Get ',
    highlight: 'unlimited enquiries',
  },
  {
    prefix: 'Get ',
    highlight: 'shortlisted buyers and tenants',
  },
];

const BenefitTicker = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slidesRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const slides = (
      slidesRef.current.filter(Boolean).length === TICKER_ITEMS.length
        ? slidesRef.current.filter(Boolean)
        : Array.from(containerRef.current.children)
    ) as HTMLDivElement[];

    if (slides.length <= 1) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.set(slides[0], { yPercent: 0, opacity: 1, autoAlpha: 1 });
        slides.slice(1).forEach((slide) => {
          gsap.set(slide, { display: 'none' });
        });
        return;
      }

      // Set initial positions: first slide visible, all others placed below
      gsap.set(slides[0], { yPercent: 0, opacity: 1, autoAlpha: 1 });
      slides.slice(1).forEach((slide) => {
        gsap.set(slide, { yPercent: 100, opacity: 0, autoAlpha: 0 });
      });

      const tl = gsap.timeline({ repeat: -1 });

      slides.forEach((current, i) => {
        const next = slides[(i + 1) % slides.length];

        // Hold current slide visible for 2.4s
        tl.to({}, { duration: 2.4 });

        // Shift current slide up and disappear
        tl.to(current, {
          yPercent: -100,
          opacity: 0,
          autoAlpha: 0,
          duration: 0.45,
          ease: 'power2.inOut',
        });

        // Incoming slide arrives from bottom
        tl.fromTo(
          next,
          { yPercent: 100, opacity: 0, autoAlpha: 0 },
          {
            yPercent: 0,
            opacity: 1,
            autoAlpha: 1,
            duration: 0.45,
            ease: 'power2.inOut',
            immediateRender: false,
          },
          '<'
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.tickerContainer}
      aria-live="off"
      role="region"
      aria-label="Key benefits"
    >
      {TICKER_ITEMS.map((item, idx) => (
        <div
          key={idx}
          ref={(el) => {
            slidesRef.current[idx] = el;
          }}
          className={styles.tickerSlide}
        >
          <Check size={16} className={styles.mobileCheckIcon} />
          <span className={styles.tickerText}>
            {item.prefix}
            <span className={styles.yellowHighlight}>{item.highlight}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

export default function PostPropertyPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile } = useAuth();

  // Dynamic listings from database
  const [dynamicListings, setDynamicListings] = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchActiveListings = async () => {
      try {
        const res = await fetch('/api/listings?limit=4');
        if (res.ok) {
          const data = await res.json();
          if (data.listings && Array.isArray(data.listings) && data.listings.length > 0) {
            setDynamicListings(data.listings);
          }
        }
      } catch (err) {
        console.error('Failed to fetch recent listings:', err);
      } finally {
        setListingsLoading(false);
      }
    };

    fetchActiveListings();
  }, []);

  const formatCardPrice = (price: string | number, isRent?: boolean) => {
    const val = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(val)) return 'Price on Request';
    let formatted = '';
    if (val >= 10000000) formatted = `₹ ${(val / 10000000).toFixed(2)} Cr`;
    else if (val >= 100000) formatted = `₹ ${(val / 100000).toFixed(2)} Lk`;
    else formatted = `₹ ${val.toLocaleString('en-IN')}`;

    if (isRent) {
      formatted += ' / month';
    }
    return formatted;
  };

  // Form states
  const [listingFor, setListingFor] = useState<'sell' | 'rent'>('sell');
  const [category, setCategory] = useState<'residential' | 'commercial'>('residential');
  const [propertyType, setPropertyType] = useState<string>('APARTMENT');
  const [phone, setPhone] = useState<string>('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // Mobile-specific Form States
  const [mobileTopTab, setMobileTopTab] = useState<'sell' | 'rent' | 'pg'>('sell');
  const [mobileCategory, setMobileCategory] = useState<'residential' | 'commercial'>('residential');
  const [selectedPillId, setSelectedPillId] = useState<string>('flat-apartment');
  const [selectedRoomType, setSelectedRoomType] = useState<'sharing' | 'private'>('sharing');
  const [mobileContact, setMobileContact] = useState<string>('');

  // Ref to track whether form submission originated from desktop card or mobile section
  const submitSourceRef = useRef<'desktop' | 'mobile'>('mobile');

  // Prefill contact if user is authenticated
  useEffect(() => {
    if (profile?.phone) {
      setMobileContact(profile.phone);
      setPhone(profile.phone);
    } else if (profile?.email || user?.email) {
      const email = profile?.email || user?.email || '';
      setMobileContact(email);
    }
  }, [profile, user]);

  const getActiveMobilePills = () => {
    if (mobileCategory === 'commercial') {
      return mobileTopTab === 'sell' ? COMMERCIAL_SELL_PILLS : COMMERCIAL_RENT_PILLS;
    }
    if (mobileTopTab === 'pg') {
      return PG_PROPERTY_PILLS;
    }
    return mobileTopTab === 'sell' ? RESIDENTIAL_SELL_PILLS : RESIDENTIAL_RENT_PILLS;
  };

  const getContactHeading = () => {
    if (mobileTopTab === 'pg') {
      return 'Your contact details for the tenants to reach you';
    }
    return 'Your contact details for the buyer to reach you';
  };

  const getNewListingUrl = (source?: 'desktop' | 'mobile') => {
    const isDesktop = (source || submitSourceRef.current) === 'desktop';
    if (isDesktop) {
      return `/dashboard/listings/new?type=${listingFor}&propertyType=${propertyType}`;
    }
    const activePills = getActiveMobilePills();
    const chosenPill = activePills.find((p) => p.id === selectedPillId) || activePills[0];
    const targetType = mobileTopTab === 'sell' ? 'sell' : 'rent';
    const targetPropType = mobileTopTab === 'pg' ? 'PG' : chosenPill.type;
    let url = `/dashboard/listings/new?type=${targetType}&propertyType=${targetPropType}`;
    if (mobileTopTab === 'pg') {
      url += `&isPg=true&roomType=${selectedRoomType}`;
    }
    return url;
  };

  const handleMobileTopTabChange = (tab: 'sell' | 'rent' | 'pg') => {
    if (mobileCategory === 'commercial' && tab === 'pg') {
      return;
    }
    setMobileTopTab(tab);
    if (tab === 'sell') {
      setListingFor('sell');
      const pills = mobileCategory === 'residential' ? RESIDENTIAL_SELL_PILLS : COMMERCIAL_SELL_PILLS;
      const currentPill = pills.find((p) => p.id === selectedPillId);
      if (currentPill) {
        setPropertyType(currentPill.type);
      } else {
        setSelectedPillId(pills[0].id);
        setPropertyType(pills[0].type);
      }
    } else if (tab === 'rent') {
      setListingFor('rent');
      const pills = mobileCategory === 'residential' ? RESIDENTIAL_RENT_PILLS : COMMERCIAL_RENT_PILLS;
      const currentPill = pills.find((p) => p.id === selectedPillId);
      if (currentPill) {
        setPropertyType(currentPill.type);
      } else {
        setSelectedPillId(pills[0].id);
        setPropertyType(pills[0].type);
      }
    } else if (tab === 'pg') {
      setListingFor('rent');
      setCategory('residential');
      setMobileCategory('residential');
      const currentPill = PG_PROPERTY_PILLS.find((p) => p.id === selectedPillId);
      if (!currentPill) {
        setSelectedPillId(PG_PROPERTY_PILLS[0].id);
      }
      setPropertyType('PG');
    }
  };

  const handleMobileCategoryChange = (cat: 'residential' | 'commercial') => {
    setMobileCategory(cat);
    setCategory(cat);
    if (cat === 'residential') {
      const targetTopTab = mobileTopTab === 'pg' ? 'pg' : mobileTopTab;
      const pills = targetTopTab === 'pg' 
        ? PG_PROPERTY_PILLS 
        : targetTopTab === 'sell' 
          ? RESIDENTIAL_SELL_PILLS 
          : RESIDENTIAL_RENT_PILLS;
      const currentPill = pills.find((p) => p.id === selectedPillId);
      if (currentPill) {
        setPropertyType(currentPill.type);
      } else {
        setSelectedPillId(pills[0].id);
        setPropertyType(pills[0].type);
      }
    } else {
      // Commercial mode: ensure mobileTopTab is 'sell' or 'rent' (no 'pg')
      const targetTopTab = mobileTopTab === 'pg' ? 'sell' : mobileTopTab;
      if (mobileTopTab === 'pg') {
        setMobileTopTab('sell');
        setListingFor('sell');
      }
      const pills = targetTopTab === 'sell' ? COMMERCIAL_SELL_PILLS : COMMERCIAL_RENT_PILLS;
      const currentPill = pills.find((p) => p.id === selectedPillId);
      if (currentPill) {
        setPropertyType(currentPill.type);
      } else {
        setSelectedPillId(COMMERCIAL_SELL_PILLS[0].id);
        setPropertyType(COMMERCIAL_SELL_PILLS[0].type);
      }
    }
  };

  const handleSelectPill = (pillId: string) => {
    setSelectedPillId(pillId);
    const activePills = getActiveMobilePills();
    const chosenPill = activePills.find((p) => p.id === pillId);
    if (chosenPill) {
      setPropertyType(mobileTopTab === 'pg' ? 'PG' : chosenPill.type);
    }
  };

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSourceRef.current = 'mobile';
    const contact = mobileContact.trim();
    if (!contact) {
      showToast('Contact Required', 'Please enter your phone number or email', 'error');
      return;
    }

    const digitsOnly = contact.replace(/\D/g, '');
    const isEmail = contact.includes('@') && contact.includes('.');
    const isPhone = digitsOnly.length >= 10;

    if (isPhone) {
      const tenDigits = digitsOnly.slice(-10);
      setPhone(tenDigits);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('onboarding_phone', tenDigits);
      }
    } else if (isEmail) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('onboarding_email', contact);
      }
    } else {
      showToast('Error', 'Please enter a valid 10-digit mobile number or email address', 'error');
      return;
    }

    const activePills = getActiveMobilePills();
    const chosenPill = activePills.find((p) => p.id === selectedPillId) || activePills[0];
    const targetType = mobileTopTab === 'sell' ? 'sell' : 'rent';
    const targetPropertyType = mobileTopTab === 'pg' ? 'PG' : chosenPill.type;

    setPropertyType(targetPropertyType);
    setListingFor(targetType);

    if (mobileTopTab === 'pg') {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('onboarding_room_type', selectedRoomType);
        window.sessionStorage.setItem('onboarding_is_pg', 'true');
        window.sessionStorage.setItem('onboarding_pg_subproperty', chosenPill.label);
        window.sessionStorage.setItem('onboarding_category', 'residential');
        window.sessionStorage.removeItem('onboarding_commercial_subproperty');
      }
    } else if (mobileCategory === 'commercial') {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('onboarding_category', 'commercial');
        window.sessionStorage.setItem('onboarding_commercial_subproperty', chosenPill.label);
        window.sessionStorage.removeItem('onboarding_is_pg');
        window.sessionStorage.removeItem('onboarding_room_type');
        window.sessionStorage.removeItem('onboarding_pg_subproperty');
      }
    } else {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('onboarding_category', 'residential');
        window.sessionStorage.removeItem('onboarding_commercial_subproperty');
        window.sessionStorage.removeItem('onboarding_is_pg');
        window.sessionStorage.removeItem('onboarding_room_type');
        window.sessionStorage.removeItem('onboarding_pg_subproperty');
      }
    }

    const targetUrl = getNewListingUrl('mobile');

    if (!user) {
      setAuthModalOpen(true);
    } else if (!profile?.phoneVerified && isPhone) {
      setVerificationModalOpen(true);
    } else {
      router.push(targetUrl);
    }
  };

  // FAQ state
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  // Sub-category lists
  const residentialSubCategories = [
    { value: 'APARTMENT', label: 'Apartment / Flat' },
    { value: 'HOUSE', label: 'Independent House' },
    { value: 'VILLA', label: 'Villa' },
    { value: 'PLOT', label: 'Plot / Land' },
    { value: 'PG', label: 'PG / Hostel' },
  ];

  const commercialSubCategories = [
    { value: 'OFFICE', label: 'Commercial Office' },
    { value: 'SHOP', label: 'Shop / Retail Store' },
    { value: 'PLOT', label: 'Plot / Land' },
  ];

  const currentSubCategories = category === 'residential' 
    ? residentialSubCategories 
    : commercialSubCategories;

  const handleCategoryChange = (cat: 'residential' | 'commercial') => {
    setCategory(cat);
    setMobileCategory(cat);
    // Auto-update sub-category to first element of the new category list
    if (cat === 'residential') {
      setPropertyType('APARTMENT');
    } else {
      setPropertyType('OFFICE');
      if (mobileTopTab === 'pg') {
        setMobileTopTab('sell');
        setListingFor('sell');
      }
    }
  };

  const handleAuthSuccess = () => {
    const isDesktop = submitSourceRef.current === 'desktop';
    if (!isDesktop) {
      const activePills = getActiveMobilePills();
      const chosenPill = activePills.find((p) => p.id === selectedPillId) || activePills[0];
      if (typeof window !== 'undefined') {
        if (mobileTopTab === 'pg') {
          window.sessionStorage.setItem('onboarding_room_type', selectedRoomType);
          window.sessionStorage.setItem('onboarding_is_pg', 'true');
          if (chosenPill) {
            window.sessionStorage.setItem('onboarding_pg_subproperty', chosenPill.label);
          }
          window.sessionStorage.setItem('onboarding_category', 'residential');
          window.sessionStorage.removeItem('onboarding_commercial_subproperty');
        } else if (mobileCategory === 'commercial') {
          window.sessionStorage.setItem('onboarding_category', 'commercial');
          if (chosenPill) {
            window.sessionStorage.setItem('onboarding_commercial_subproperty', chosenPill.label);
          }
          window.sessionStorage.removeItem('onboarding_is_pg');
          window.sessionStorage.removeItem('onboarding_room_type');
          window.sessionStorage.removeItem('onboarding_pg_subproperty');
        } else {
          window.sessionStorage.setItem('onboarding_category', 'residential');
          window.sessionStorage.removeItem('onboarding_commercial_subproperty');
          window.sessionStorage.removeItem('onboarding_is_pg');
          window.sessionStorage.removeItem('onboarding_room_type');
          window.sessionStorage.removeItem('onboarding_pg_subproperty');
        }
      }
    } else {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('onboarding_category', category);
        window.sessionStorage.removeItem('onboarding_commercial_subproperty');
        window.sessionStorage.removeItem('onboarding_is_pg');
        window.sessionStorage.removeItem('onboarding_room_type');
        window.sessionStorage.removeItem('onboarding_pg_subproperty');
      }
    }
    const targetUrl = getNewListingUrl();
    router.push(targetUrl);
  };

  const handleBeginPosting = (e: React.FormEvent) => {
    e.preventDefault();
    submitSourceRef.current = 'desktop';
    if (!phone || phone.length < 10) {
      showToast('Error', 'Please enter a valid 10-digit contact number', 'error');
      return;
    }

    // Securely pass the phone number using sessionStorage to avoid exposing it in browser history logs
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('onboarding_phone', phone);
      window.sessionStorage.setItem('onboarding_category', category);
      window.sessionStorage.removeItem('onboarding_commercial_subproperty');
      window.sessionStorage.removeItem('onboarding_is_pg');
      window.sessionStorage.removeItem('onboarding_room_type');
      window.sessionStorage.removeItem('onboarding_pg_subproperty');
    }

    const targetUrl = getNewListingUrl('desktop');

    if (!user) {
      // Open inline authentication modal popup instead of sending the user to /login
      setAuthModalOpen(true);
    } else if (!profile?.phoneVerified) {
      // User is logged in (e.g. via Google) but their phone is not verified yet. Require verification.
      setVerificationModalOpen(true);
    } else {
      // Redirect directly to the new listing creation page.
      router.push(targetUrl);
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
  };

  return (
    <div className={styles.pageWrapper}>
      <Header />
      
      <main className={styles.mainContent}>
        {/* DESKTOP HERO SECTION */}
        <section className={`${styles.heroSection} ${styles.desktopHero}`}>
          <div className="container">
            <div className={styles.heroGrid}>
              
              {/* Left Side Info */}
              <div className={styles.heroLeft}>
                <h1 className={styles.headline}>
                  Sell or Rent Property online faster with <span className={styles.headlineHighlight}>ListMe.com</span>
                </h1>
                
                <div className={styles.checklist}>
                  <div className={styles.checkItem}>
                    <Check className={styles.checkIcon} size={24} />
                    <span>Advertisement is FREE</span>
                  </div>
                  <div className={styles.checkItem}>
                    <Check className={styles.checkIcon} size={24} />
                    <span>Get genuine leads</span>
                  </div>
                  <div className={styles.checkItem}>
                    <Check className={styles.checkIcon} size={24} />
                    <span>Connect directly with buyers/tenants</span>
                  </div>
                  <div className={styles.checkItem}>
                    <Check className={styles.checkIcon} size={24} />
                    <span>No hidden fees, no commissions</span>
                  </div>
                </div>
              </div>

              {/* Right Side Glassmorphic Form Card */}
              <div>
                <form onSubmit={handleBeginPosting} className={styles.formCard}>
                  <div>
                    <h2 className={styles.formTitle}>Post Your Property</h2>
                    <p className={styles.formSubtitle}>Takes less than 5 minutes</p>
                  </div>

                  {/* Property Type Toggle */}
                  <div className={styles.formGroup}>
                    <span className={styles.label}>Property Type</span>
                    <div className={styles.toggleGroup}>
                      <button
                        type="button"
                        className={`${styles.toggleButton} ${listingFor === 'sell' ? styles.toggleButtonActive : styles.toggleButtonInactive}`}
                        onClick={() => setListingFor('sell')}
                        aria-pressed={listingFor === 'sell'}
                      >
                        Sell
                      </button>
                      <button
                        type="button"
                        className={`${styles.toggleButton} ${listingFor === 'rent' ? styles.toggleButtonActiveSecondary : styles.toggleButtonInactive}`}
                        onClick={() => setListingFor('rent')}
                        aria-pressed={listingFor === 'rent'}
                      >
                        Rent
                      </button>
                    </div>
                  </div>

                  {/* Category Toggle */}
                  <div className={styles.formGroup}>
                    <span className={styles.label}>Category</span>
                    <div className={styles.toggleGroup}>
                      <button
                        type="button"
                        className={`${styles.toggleButton} ${category === 'residential' ? styles.toggleButtonActive : styles.toggleButtonInactive}`}
                        onClick={() => handleCategoryChange('residential')}
                        aria-pressed={category === 'residential'}
                      >
                        Residential
                      </button>
                      <button
                        type="button"
                        className={`${styles.toggleButton} ${category === 'commercial' ? styles.toggleButtonActiveSecondary : styles.toggleButtonInactive}`}
                        onClick={() => handleCategoryChange('commercial')}
                        aria-pressed={category === 'commercial'}
                      >
                        Commercial
                      </button>
                    </div>
                  </div>

                  {/* Property Sub-category */}
                  <Select
                    id="sub-category"
                    label="Property Sub-category"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    options={currentSubCategories}
                    fullWidth
                  />

                  {/* Contact Number */}
                  <Input
                    label="Contact Number"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    leftIcon={<Phone size={18} />}
                    fullWidth
                    required
                  />

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    variant="primary" 
                    size="lg" 
                    fullWidth
                    rightIcon={<ArrowRight size={18} />}
                  >
                    Begin Posting (Free)
                  </Button>
                </form>
              </div>

            </div>
          </div>
        </section>

        {/* MOBILE ABOVE-THE-FOLD HERO SECTION */}
        <section className={styles.mobileHero}>
          {/* Blue Hero Canvas */}
          <div className={styles.mobileHeroCanvas}>
            {/* Vector SVG House Illustration with dynamic badge */}
            <div className={styles.mobileIllustrationWrapper}>
              <HouseIllustration activeTab={mobileTopTab} />
            </div>

            <h1 className={styles.mobileHeadline}>
              Sell or Rent Property online faster
            </h1>

            {/* Animated Rotating Value Proposition Ticker */}
            <BenefitTicker />

            {/* Top Toggle Tabs: Sell | Rent / Lease | PG (or 2 Tabs: Sell | Rent / Lease for Commercial per screenshots) */}
            <div 
              className={mobileCategory === 'commercial' ? styles.mobileTopTabsTwo : styles.mobileTopTabs} 
              role="tablist" 
              aria-label="Listing type"
            >
              <button
                type="button"
                role="tab"
                id="mobile-tab-sell"
                aria-controls="mobile-property-form"
                aria-selected={mobileTopTab === 'sell'}
                className={`${styles.mobileTab} ${styles.mobileTabLeft} ${mobileTopTab === 'sell' ? styles.mobileTabActive : ''}`}
                onClick={() => handleMobileTopTabChange('sell')}
              >
                Sell
              </button>
              <button
                type="button"
                role="tab"
                id="mobile-tab-rent"
                aria-controls="mobile-property-form"
                aria-selected={mobileTopTab === 'rent'}
                className={`${styles.mobileTab} ${mobileCategory === 'commercial' ? styles.mobileTabRight : styles.mobileTabCenter} ${mobileTopTab === 'rent' ? styles.mobileTabActive : ''}`}
                onClick={() => handleMobileTopTabChange('rent')}
              >
                Rent / Lease
              </button>
              {mobileCategory !== 'commercial' && (
                <button
                  type="button"
                  role="tab"
                  id="mobile-tab-pg"
                  aria-controls="mobile-property-form"
                  aria-selected={mobileTopTab === 'pg'}
                  className={`${styles.mobileTab} ${styles.mobileTabRight} ${mobileTopTab === 'pg' ? styles.mobileTabActive : ''}`}
                  onClick={() => handleMobileTopTabChange('pg')}
                >
                  PG
                </button>
              )}
            </div>
          </div>

          {/* White Form Container */}
          <form 
            id="mobile-property-form"
            role="tabpanel"
            aria-labelledby={mobileTopTab === 'sell' ? 'mobile-tab-sell' : mobileTopTab === 'rent' ? 'mobile-tab-rent' : 'mobile-tab-pg'}
            onSubmit={handleMobileSubmit} 
            className={styles.mobileFormCard}
            noValidate
          >
            <h2 className={styles.mobileQuestionHeading}>
              What kind of property do you have?
            </h2>

            {/* Category Underline Tabs */}
            <div className={styles.mobileCategoryNav} role="tablist" aria-label="Property category">
              <button
                type="button"
                role="tab"
                id="category-tab-residential"
                aria-selected={mobileCategory === 'residential'}
                className={`${styles.mobileCategoryTab} ${mobileCategory === 'residential' ? styles.mobileCategoryActive : ''}`}
                onClick={() => handleMobileCategoryChange('residential')}
                style={mobileTopTab === 'pg' ? { cursor: 'default' } : undefined}
              >
                Residential
              </button>
              {mobileTopTab !== 'pg' && (
                <button
                  type="button"
                  role="tab"
                  id="category-tab-commercial"
                  aria-selected={mobileCategory === 'commercial'}
                  className={`${styles.mobileCategoryTab} ${mobileCategory === 'commercial' ? styles.mobileCategoryActive : ''}`}
                  onClick={() => handleMobileCategoryChange('commercial')}
                >
                  Commercial
                </button>
              )}
            </div>

            {/* Sub-category Pills */}
            <div className={styles.mobilePillsWrapper} role="radiogroup" aria-label="Property sub-category">
              {getActiveMobilePills().map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedPillId === pill.id}
                  className={`${styles.mobilePill} ${selectedPillId === pill.id ? styles.mobilePillActive : ''}`}
                  onClick={() => handleSelectPill(pill.id)}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Room Type Section (PG only - matches screenshot #3) */}
            {mobileTopTab === 'pg' && (
              <div className={styles.mobileRoomTypeSection}>
                <h3 className={styles.mobileSectionHeading}>
                  Room Type
                </h3>
                <div 
                  className={styles.mobilePillsWrapper} 
                  role="radiogroup" 
                  aria-label="Room Type"
                >
                  {PG_ROOM_TYPES.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedRoomType === room.id}
                      className={`${styles.mobilePill} ${selectedRoomType === room.id ? styles.mobilePillActive : ''}`}
                      onClick={() => setSelectedRoomType(room.id as 'sharing' | 'private')}
                    >
                      {room.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Details Section */}
            <div className={styles.mobileContactSection}>
              <h3 id="mobile-contact-heading" className={styles.mobileContactHeading}>
                {getContactHeading()}
              </h3>

              <div className={styles.mobileInputWrapper}>
                <input
                  type="text"
                  id="mobileContactInput"
                  aria-labelledby="mobile-contact-heading"
                  className={styles.mobileContactInput}
                  placeholder="Phone number / Email / Username"
                  value={mobileContact}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMobileContact(val);
                    const digits = val.replace(/\D/g, '');
                    if (digits.length >= 10) {
                      setPhone(digits.slice(-10));
                    }
                  }}
                  autoComplete="tel"
                />
              </div>

              <button
                type="submit"
                className={styles.mobileCtaBtn}
              >
                Start now, it’s FREE
              </button>
            </div>
          </form>
        </section>

        {/* 3 SIMPLE STEPS SECTION */}
        <section className={`${styles.stepsSection} section-padding`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Post Property in 3 Simple Steps</h2>
              <p className={styles.sectionSubtitle}>Simple, fast, and completely free listing experience</p>
            </div>

            <div className={styles.stepsGrid}>
              {/* Step 1 */}
              <div className={styles.stepCard}>
                <div className={styles.iconWrapper}>
                  <ClipboardCheck size={32} />
                </div>
                <h3 className={styles.stepTitle}>1. Fill in Details</h3>
                <p className={styles.stepDesc}>
                  Enter property type, location, size, and pricing. Provide accurate specifications for better matching.
                </p>
              </div>

              {/* Step 2 */}
              <div className={styles.stepCard}>
                <div className={styles.iconWrapper}>
                  <ImageIcon size={32} />
                </div>
                <h3 className={styles.stepTitle}>2. Upload Photos</h3>
                <p className={styles.stepDesc}>
                  Add clear photos of rooms, kitchen, and balcony. Verified listings with high-quality media get 3x higher views.
                </p>
              </div>

              {/* Step 3 */}
              <div className={styles.stepCard}>
                <div className={styles.iconWrapper}>
                  <Sparkles size={32} />
                </div>
                <h3 className={styles.stepTitle}>3. Sell/Rent</h3>
                <p className={styles.stepDesc}>
                  Your listing goes live instantly. Receive genuine OTP-verified leads and close the deal without any brokerage.
                </p>
              </div>
            </div>

            <div className={styles.ctaContainer}>
              <Button 
                onClick={() => {
                  const target = document.getElementById('sub-category');
                  if (target && target.offsetParent !== null) {
                    target.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }} 
                variant="outline"
                size="lg"
                rightIcon={<ArrowRight size={16} />}
                className={styles.capsuleCta}
              >
                Post Property - It's Free
              </Button>
            </div>
          </div>
        </section>

        {/* VISIBILITY STATS BANNER */}
        <section className={styles.statsBanner}>
          <div className={styles.statsCard}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>1M+</span>
              <span className={styles.statLabel}>Properties Listed</span>
              <span className={styles.statDesc}>Across all major cities in India</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>5.5M+</span>
              <span className={styles.statLabel}>Monthly Traffic</span>
              <span className={styles.statDesc}>Active buyers & genuine tenants</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>200K+</span>
              <span className={styles.statLabel}>Happy Owners</span>
              <span className={styles.statDesc}>Saved crores in brokerage commissions</span>
            </div>
          </div>
        </section>

        {/* RECENTLY POSTED PROPERTIES */}
        <section className={`${styles.propertiesSection} section-padding`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recently Posted Properties</h2>
              <p className={styles.sectionSubtitle}>Handpicked owner-posted listings fresh on the platform</p>
            </div>

            <div className={styles.propertiesGrid}>
              {dynamicListings.length > 0 ? (
                dynamicListings.map((listing) => {
                  const isRent = listing.listingFor === 'RENT';
                  const displayPrice = formatCardPrice(listing.askingPrice, isRent);
                  const primaryImage = listing.images?.[0]?.imageUrl || '/images/luxury_villa_hero.png';
                  const displayType = isRent ? 'Rent' : 'Sell';
                  const beds = listing.bedrooms || 0;
                  const baths = listing.bathrooms || 0;
                  const areaVal = listing.carpetArea || listing.builtUpArea || listing.superBuiltUpArea;
                  const displayArea = areaVal ? `${areaVal} sq.ft` : 'Spacious';

                  return (
                    <div 
                      key={listing.id} 
                      className={styles.propertyCard}
                      onClick={() => router.push(`/property/${listing.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          router.push(`/property/${listing.id}`);
                        }
                      }}
                    >
                      <div className={styles.imageWrapper}>
                        <img 
                          src={primaryImage} 
                          alt={listing.title} 
                          className={styles.propertyImage} 
                        />
                        
                        <div className={styles.badgeOverlay}>
                          <Badge variant={isRent ? 'secondary' : 'primary'} size="sm">
                            For {displayType}
                          </Badge>
                        </div>

                        <div className={styles.verifiedOverlay}>
                          <Badge variant="success" size="sm" className={styles.verifiedBadge}>
                            ✓ Verified Owner
                          </Badge>
                        </div>
                      </div>

                      <div className={styles.propertyInfo}>
                        <span className={styles.propPrice}>{displayPrice}</span>
                        <h3 className={styles.propTitle} title={listing.title}>{listing.title}</h3>
                        
                        <div className={styles.propLoc}>
                          <MapPin size={14} />
                          <span>{listing.locality}, {listing.city}</span>
                        </div>

                        <div className={styles.propSpecs}>
                          {beds > 0 && (
                            <div className={styles.specItem}>
                              <Bed size={14} />
                              <span>{beds} BHK</span>
                            </div>
                          )}
                          
                          {baths > 0 && (
                            <div className={styles.specItem}>
                              <Bath size={14} />
                              <span>{baths} Bath</span>
                            </div>
                          )}

                          <div className={styles.specItem}>
                            <Square size={14} />
                            <span>{displayArea}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                MOCK_PROPERTIES.map((prop) => (
                  <div 
                    key={prop.id} 
                    className={styles.propertyCard}
                    onClick={() => router.push(`/listings?type=${prop.type === 'Rent' ? 'rent' : 'sale'}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        router.push(`/listings?type=${prop.type === 'Rent' ? 'rent' : 'sale'}`);
                      }
                    }}
                  >
                    <div className={styles.imageWrapper}>
                      <img 
                        src={prop.imageUrl} 
                        alt={prop.title} 
                        className={styles.propertyImage} 
                      />
                      
                      <div className={styles.badgeOverlay}>
                        <Badge variant={prop.type === 'Rent' ? 'secondary' : 'primary'} size="sm">
                          For {prop.type}
                        </Badge>
                      </div>

                      {prop.verified && (
                        <div className={styles.verifiedOverlay}>
                          <Badge variant="success" size="sm" className={styles.verifiedBadge}>
                            ✓ Verified Owner
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className={styles.propertyInfo}>
                      <span className={styles.propPrice}>{prop.price}</span>
                      <h3 className={styles.propTitle} title={prop.title}>{prop.title}</h3>
                      
                      <div className={styles.propLoc}>
                        <MapPin size={14} />
                        <span>{prop.location}</span>
                      </div>

                      <div className={styles.propSpecs}>
                        {prop.beds > 0 && (
                          <div className={styles.specItem}>
                            <Bed size={14} />
                            <span>{prop.beds} BHK</span>
                          </div>
                        )}
                        
                        {prop.baths > 0 && (
                          <div className={styles.specItem}>
                            <Bath size={14} />
                            <span>{prop.baths} Bath</span>
                          </div>
                        )}

                        <div className={styles.specItem}>
                          <Square size={14} />
                          <span>{prop.area}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section className={`${styles.testimonialsSection} section-padding`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>What Owners & Seekers Say</h2>
              <p className={styles.sectionSubtitle}>Real stories of success, speed, and saved brokerages</p>
            </div>

            <div className={styles.testimonialsGrid}>
              {TESTIMONIALS.map((test) => (
                <div key={test.id} className={styles.testimonialCard}>
                  <p className={styles.quoteText}>"{test.text}"</p>
                  
                  <div className={styles.authorInfo}>
                    <div className={styles.authorAvatar}>
                      {test.avatarInitials}
                    </div>
                    <div>
                      <h4 className={styles.authorName}>{test.author}</h4>
                      <span className={styles.authorRole}>{test.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLATFORM BENEFITS */}
        <section className={`${styles.benefitsSection} section-padding`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Why Choose ListMe?</h2>
              <p className={styles.sectionSubtitle}>Tailored features built specifically to make peer-to-peer real estate fast and safe</p>
            </div>

            <div className={styles.benefitsGrid}>
              {/* Benefit 1 */}
              <div className={styles.benefitCard}>
                <div className={styles.benefitIconWrapper}>
                  <Coins size={24} />
                </div>
                <h3 className={styles.benefitTitle}>Zero Brokerage</h3>
                <p className={styles.benefitDesc}>
                  Keep 100% of your transaction. ListMe does not charge any brokerages or hidden listing commissions.
                </p>
              </div>

              {/* Benefit 2 */}
              <div className={styles.benefitCard}>
                <div className={styles.benefitIconWrapper}>
                  <ShieldCheck size={24} />
                </div>
                <h3 className={styles.benefitTitle}>Verified Owner Badge</h3>
                <p className={styles.benefitDesc}>
                  Get a premium check badge that indicates direct, verified owner status, building instant trust with seekers.
                </p>
              </div>

              {/* Benefit 3 */}
              <div className={styles.benefitCard}>
                <div className={styles.benefitIconWrapper}>
                  <Bell size={24} />
                </div>
                <h3 className={styles.benefitTitle}>Instant Alerts</h3>
                <p className={styles.benefitDesc}>
                  Get instant SMS and Email notifications as soon as an interested buyer or tenant verifies their mobile number.
                </p>
              </div>

              {/* Benefit 4 */}
              <div className={styles.benefitCard}>
                <div className={styles.benefitIconWrapper}>
                  <PlusCircle size={24} />
                </div>
                <h3 className={styles.benefitTitle}>Unlimited Listings</h3>
                <p className={styles.benefitDesc}>
                  Manage, edit, or post multiple properties. No caps on listings or listing expiration timers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE FAQ ACCORDIONS */}
        <section className={`${styles.faqSection} section-padding`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
              <p className={styles.sectionSubtitle}>Clear answers to queries about listings, verification, and how it works</p>
            </div>

            <div className={styles.faqContainer}>
              {FAQS.map((faq, index) => {
                const isOpen = expandedFaqIndex === index;
                return (
                  <div 
                    key={index} 
                    className={`${styles.faqItem} ${isOpen ? styles.faqItemActive : ''}`}
                  >
                    <button 
                      className={styles.faqHeader}
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      <span className={styles.faqToggle}>
                        {isOpen ? <Minus size={20} /> : <Plus size={20} />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className={styles.faqContent}>
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* INTERESTING READS */}
        <section className={`${styles.readsSection} section-padding`}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Interesting Reads</h2>
              <p className={styles.sectionSubtitle}>Valuable insights, guides, and tips to help you make informed real estate decisions</p>
            </div>

            <div className={styles.readsGrid}>
              {ARTICLES.map((art) => (
                <div key={art.id} className={styles.readCard}>
                  <div className={styles.readImageWrapper}>
                    <img 
                      src={art.imageUrl} 
                      alt={art.title} 
                      className={styles.readImage}
                    />
                  </div>

                  <div className={styles.readContent}>
                    <div className={styles.readMeta}>
                      <span className={styles.readCategory}>{art.category}</span>
                      <span>•</span>
                      <span>{art.date}</span>
                    </div>

                    <h3 className={styles.readTitle}>{art.title}</h3>
                    <p className={styles.readDesc}>{art.desc}</p>
                    
                    <Link href={art.href} className={styles.readLink}>
                      <span>Read Full Article</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialPhone={phone || (mobileContact.replace(/\D/g, '').length >= 10 ? mobileContact.replace(/\D/g, '').slice(-10) : '')}
        redirectPath={getNewListingUrl()}
      />
      <PhoneVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialPhone={phone || (mobileContact.replace(/\D/g, '').length >= 10 ? mobileContact.replace(/\D/g, '').slice(-10) : '')}
      />
    </div>
  );
}
