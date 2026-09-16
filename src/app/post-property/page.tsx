'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Input, Button, Badge, Select, useToast } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useMobileMenu } from '@/context/MobileMenuContext';
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

const MOBILE_USER_TESTIMONIALS = [
  {
    id: 'mob-test-1',
    author: 'Anuj Velankar',
    role: 'Owner, Gurgaon',
    avatarInitials: 'AV',
    avatarVariant: 'avatarSky',
    shortText: 'Great efforts and regular follow-up to get leads for my rental apartment. Because of your enthusiasm and ...',
    fullText: 'Great efforts and regular follow-up to get leads for my rental apartment. Because of your enthusiasm and direct seeker connections, I found a verified family tenant within a week with zero brokerage!',
  },
  {
    id: 'mob-test-2',
    author: 'Manish Roy',
    role: 'Owner, Bangalore',
    avatarInitials: 'MR',
    avatarVariant: 'avatarAmber',
    shortText: 'I found reliable buyers for my flat in Whitefield. The platform team provided prompt assistance to all my queries...',
    fullText: 'I found reliable buyers for my flat in Whitefield. The platform team provided prompt assistance to all my queries. The OTP verification ensures only genuine buyers contact you. Best experience!',
  },
  {
    id: 'mob-test-3',
    author: 'Pooja Sharma',
    role: 'Owner, Mumbai',
    avatarInitials: 'PS',
    avatarVariant: 'avatarGreen',
    shortText: 'Seamless listing process and got 15+ verified buyer enquiries in the first week itself. Highly recommended for direct owners!',
    fullText: 'Seamless listing process and got 15+ verified buyer enquiries in the first week itself. Highly recommended for direct owners wanting to save hefty brokerage fees and connect directly.',
  },
  {
    id: 'mob-test-4',
    author: 'Rajesh Kumar',
    role: 'Owner, Pune',
    avatarInitials: 'RK',
    avatarVariant: 'avatarPurple',
    shortText: 'Listing my commercial property was hassle-free. Got screened tenant leads directly on WhatsApp with zero middlemen involved.',
    fullText: 'Listing my commercial property was hassle-free. Got screened tenant leads directly on WhatsApp with zero middlemen involved. Fast closure without paying a single rupee commission.',
  },
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

// ─── Step Illustrations & Connectors for Mobile "3 Simple Steps" ───
const Step1Illustration = () => (
  <svg 
    width="88" 
    height="88" 
    viewBox="0 0 96 96" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    aria-hidden="true"
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    {/* Soft organic light-blue blob background */}
    <path d="M12 44 C10 22 24 8 48 6 C70 4 86 16 90 36 C94 58 86 80 66 88 C46 94 18 86 12 66 Z" fill="#eef6fc" />
    
    {/* Document card in warm pastel gold */}
    <rect x="22" y="18" width="46" height="54" rx="5" fill="#fef3c7" stroke="#fde68a" strokeWidth="1.5" />
    
    {/* Horizontal document lines (3 lines per reference mockup) */}
    <line x1="30" y1="36" x2="48" y2="36" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="30" y1="44" x2="58" y2="44" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="30" y1="52" x2="48" y2="52" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

    {/* Folded paper curl banner at bottom */}
    <path d="M44 72 C52 72 64 72 70 72 C74 72 76 70 76 67 C76 64 73 64 68 64 L52 64 C44 64 38 68 44 72 Z" fill="#0078db" />
    <path d="M54 60 L68 72 L54 72 Z" fill="#0066c0" opacity="0.25" />

    {/* Blue circular badge on top right */}
    <circle cx="60" cy="22" r="13" fill="#0078db" />
    {/* White house icon inside badge */}
    <path d="M60 14.5 L51 21.5 L53 21.5 L53 28.5 L67 28.5 L67 21.5 L69 21.5 Z" fill="#ffffff" />
    <rect x="58" y="24" width="4" height="4.5" rx="0.5" fill="#0078db" />
  </svg>
);

const Step2Illustration = () => (
  <svg 
    width="88" 
    height="88" 
    viewBox="0 0 96 96" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    aria-hidden="true"
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    {/* Soft organic light-blue blob background */}
    <path d="M22 68 C12 50 18 26 36 14 C54 4 72 10 84 26 C94 44 86 68 68 80 C50 92 32 84 22 68 Z" fill="#eef6fc" />
    
    {/* Back photo card (warm golden, tilted -16 deg) */}
    <g transform="rotate(-16 44 48)">
      <rect x="20" y="24" width="46" height="40" rx="4" fill="#fef3c7" stroke="#fde68a" strokeWidth="1.5" />
      <circle cx="32" cy="34" r="3.5" fill="#f59e0b" opacity="0.6" />
      <polygon points="24,56 34,44 44,56" fill="#f59e0b" opacity="0.4" />
      <polygon points="40,56 50,46 60,56" fill="#f59e0b" opacity="0.6" />
    </g>

    {/* Front photo card (vivid blue, tilted +12 deg) */}
    <g transform="rotate(12 52 50)">
      <rect x="25" y="24" width="48" height="42" rx="4" fill="#0078db" />
      {/* Sun on top right corner per mockup */}
      <circle cx="59" cy="34" r="3.5" fill="#ffffff" fillOpacity="0.9" />
      {/* Smooth rounded white mountain landscape per mockup */}
      <path d="M25 54 C31 52 36 43 43 43 C49 43 52 49 57 49 C61 49 64 46 68 48 L73 52 L73 66 L25 66 Z" fill="#ffffff" />
    </g>
  </svg>
);

const Step3Illustration = () => (
  <svg 
    width="88" 
    height="88" 
    viewBox="0 0 96 96" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    aria-hidden="true"
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    {/* Soft organic light-blue blob background */}
    <path d="M12 44 C10 24 24 12 50 12 C74 12 88 24 86 48 C84 70 72 84 46 84 C20 84 14 64 12 44 Z" fill="#eef6fc" />
    
    {/* Small blue spire on roof apex per mockup */}
    <rect x="46.5" y="16" width="3" height="6" rx="1" fill="#0078db" />

    {/* Blue eaves / roof outer trim */}
    <path d="M48 21 L18 43 L23 46 L48 27 L73 46 L78 43 Z" fill="#0078db" />
    
    {/* Orange roof triangle */}
    <polygon points="48,24 25,42 71,42" fill="#f97316" />
    <polygon points="48,25 29,40 67,40" fill="#fb923c" />

    {/* House walls & side pillars */}
    <rect x="26" y="42" width="13" height="32" rx="2" fill="#cbe3f7" />
    <rect x="57" y="42" width="13" height="32" rx="2" fill="#cbe3f7" />

    {/* Center doorway with Rupee symbol */}
    <text 
      x="48" 
      y="60" 
      textAnchor="middle" 
      dominantBaseline="central" 
      fill="#0078db" 
      fontSize="16" 
      fontWeight="bold" 
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      ₹
    </text>
  </svg>
);

const ConnectorCurveRight = () => (
  <svg width="76" height="88" viewBox="0 0 76 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M0,2 H42 A32,32 0 0 1 74,34 V88" stroke="#d4ebf9" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const ConnectorCurveLeft = () => (
  <svg width="76" height="88" viewBox="0 0 76 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M2,88 V34 A32,32 0 0 1 34,2 H76" stroke="#d4ebf9" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const TrustHouseIcon = () => (
  <svg width="40" height="40" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="23.5" y="8" width="3.5" height="8" rx="0.75" fill="#0078db" />
    <path d="M18 5L5 17H9V29.5C9 30.33 9.67 31 10.5 31H25.5C26.33 31 27 30.33 27 29.5V17H31L18 5Z" fill="#0078db" />
    <path d="M15 31V21C15 19.34 16.34 18 18 18C19.66 18 21 19.34 21 21V31H15Z" fill="#ffffff" />
    <path d="M18 7L8 16.5H11L18 10L25 16.5H28L18 7Z" fill="#60a5fa" opacity="0.9" />
  </svg>
);

const TrustSearchIcon = () => (
  <svg width="40" height="40" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="15.5" cy="15.5" r="11" fill="#e7f5ff" stroke="#0078db" strokeWidth="2.5" />
    <path d="M15.5 10L10.5 14.5H12.5V19.5H18.5V14.5H20.5L15.5 10Z" fill="#0078db" />
    <rect x="14.5" y="16" width="2" height="3.5" fill="#e7f5ff" />
    <path d="M24 24L30.5 30.5" stroke="#0078db" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const TrustUserIcon = () => (
  <svg width="40" height="40" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="14" cy="10" r="5" fill="#0078db" />
    <path d="M6 26C6 21.58 9.58 18 14 18C16.3 18 18.36 18.97 19.8 20.52C19.29 21.49 19 22.59 19 23.75V26H6Z" fill="#0078db" />
    <rect x="19.5" y="19.5" width="12" height="11" rx="2" fill="#e7f5ff" stroke="#0078db" strokeWidth="1.5" />
    <path d="M25.5 21L22 24H23.5V28H27.5V24H29L25.5 21Z" fill="#0078db" />
  </svg>
);

// ─── Category Icons for "Recently Posted Properties" (Per Mockup) ───
const FlatCategoryIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="22" cy="22" r="22" fill="#eff6ff" />
    <rect x="14" y="11" width="16" height="23" rx="1.5" fill="#cbe3f7" stroke="#0078db" strokeWidth="1.2" />
    <rect x="13" y="10" width="18" height="2.5" rx="1" fill="#0078db" />
    <rect x="16.5" y="14.5" width="3" height="3" rx="0.5" fill="#ffffff" />
    <rect x="21" y="14.5" width="3" height="3" rx="0.5" fill="#ffffff" />
    <rect x="25" y="14.5" width="3" height="3" rx="0.5" fill="#ffffff" />
    <rect x="16.5" y="19" width="3" height="3" rx="0.5" fill="#ffffff" />
    <rect x="21" y="19" width="3" height="3" rx="0.5" fill="#ffffff" />
    <rect x="25" y="19" width="3" height="3" rx="0.5" fill="#ffffff" />
    <rect x="16.5" y="23.5" width="3" height="3" rx="0.5" fill="#ffffff" />
    <rect x="21" y="23.5" width="3" height="3" rx="0.5" fill="#ffffff" />
    <rect x="25" y="23.5" width="3" height="3" rx="0.5" fill="#ffffff" />
    <rect x="20" y="28.5" width="4" height="5.5" rx="0.75" fill="#0078db" />
  </svg>
);

const HouseCategoryIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="22" cy="22" r="22" fill="#eff6ff" />
    <path d="M22 13L11 22H14.5V31H29.5V22H33L22 13Z" fill="#cbe3f7" stroke="#0078db" strokeWidth="1.2" />
    <path d="M22 14L12 22.5H15.5L22 17L28.5 22.5H32L22 14Z" fill="#0078db" />
    <path d="M19.5 31V25C19.5 23.62 20.62 22.5 22 22.5C23.38 22.5 24.5 23.62 24.5 25V31H19.5Z" fill="#0078db" />
    <rect x="16" y="24" width="2.5" height="3" rx="0.5" fill="#0078db" opacity="0.6" />
    <rect x="25.5" y="24" width="2.5" height="3" rx="0.5" fill="#0078db" opacity="0.6" />
  </svg>
);

const PlotCategoryIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="22" cy="22" r="22" fill="#eff6ff" />
    <ellipse cx="22" cy="29" rx="14" ry="5.5" fill="#fed7aa" opacity="0.7" />
    <rect x="29" y="22" width="2" height="7" fill="#b45309" rx="0.5" />
    <circle cx="30" cy="20" r="4.5" fill="#f59e0b" opacity="0.85" />
    <path d="M12 24H27M12 27H27" stroke="#0078db" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="14" y="22" width="2" height="8" rx="0.5" fill="#0078db" />
    <rect x="20" y="22" width="2" height="8" rx="0.5" fill="#0078db" />
    <rect x="25" y="22" width="2" height="8" rx="0.5" fill="#0078db" />
  </svg>
);

const OfficeCategoryIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="22" cy="22" r="22" fill="#eff6ff" />
    <rect x="12" y="22" width="6" height="11" rx="1" fill="#fed7aa" opacity="0.8" />
    <rect x="28" y="19" width="5" height="14" rx="1" fill="#fed7aa" opacity="0.8" />
    <rect x="18" y="12" width="10" height="21" rx="1.5" fill="#0078db" />
    <rect x="20" y="14" width="6" height="17" rx="1" fill="#60a5fa" opacity="0.9" />
    <line x1="20" y1="18" x2="26" y2="18" stroke="#ffffff" strokeWidth="0.75" />
    <line x1="20" y1="22" x2="26" y2="22" stroke="#ffffff" strokeWidth="0.75" />
    <line x1="20" y1="26" x2="26" y2="26" stroke="#ffffff" strokeWidth="0.75" />
  </svg>
);

const POPULAR_CITIES = ['Delhi', 'Noida', 'Gurgaon', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad'];

interface CityCategoryListing {
  categoryName: string;
  categoryCount: string;
  categoryCode: string;
  title: string;
  price: string;
  locality: string;
  postedAgo: string;
  id?: string;
}

const CITY_FALLBACK_DATA: Record<string, { buy: CityCategoryListing[]; rent: CityCategoryListing[] }> = {
  Delhi: {
    buy: [
      { categoryName: 'Flats', categoryCount: '32K+ Flats', categoryCode: 'APARTMENT', title: '4 Bhk Independent/Builder Floor', price: '₹88 Lac', locality: 'Saarthi Luxurious Homes, Uttam Nagar', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '4.1K+ Houses', categoryCode: 'HOUSE', title: '2 Bhk Independent House/Villa for Sale', price: 'Available on Request', locality: 'Sainik Farm, South Delhi', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '2.8K+ Plots', categoryCode: 'PLOT', title: 'Residential Land for Sale', price: '₹22.5 Lac', locality: 'Kirti Nagar, Delhi, West Delhi', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '1.2K+ Offices', categoryCode: 'OFFICE', title: 'Ready to move office space for Sale', price: '₹27.5 Lac', locality: 'Chawla Complex, Laxmi Nagar', postedAgo: 'Today' },
    ],
    rent: [
      { categoryName: 'Flats', categoryCount: '28K+ Flats', categoryCode: 'APARTMENT', title: '3 Bhk Furnished Apartment for Rent', price: '₹38,000 / mo', locality: 'Saket, South Delhi', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '3.4K+ Houses', categoryCode: 'HOUSE', title: '4 Bhk Independent Kothi for Rent', price: '₹75,000 / mo', locality: 'Vasant Vihar, South West Delhi', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '1.5K+ Plots', categoryCode: 'PLOT', title: 'Commercial Plot on Main Road for Lease', price: '₹1.2 Lac / mo', locality: 'Okhla Phase 3, South Delhi', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '2.1K+ Offices', categoryCode: 'OFFICE', title: 'Fully Furnished Office Space for Rent', price: '₹45,000 / mo', locality: 'Connaught Place, Central Delhi', postedAgo: 'Today' },
    ],
  },
  Noida: {
    buy: [
      { categoryName: 'Flats', categoryCount: '24K+ Flats', categoryCode: 'APARTMENT', title: '3 Bhk Luxury Flat in Sector 75', price: '₹1.15 Cr', locality: 'Sector 75, Noida', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '2.9K+ Houses', categoryCode: 'HOUSE', title: 'Independent Duplex Villa for Sale', price: '₹2.4 Cr', locality: 'Sector 44, Noida', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '3.1K+ Plots', categoryCode: 'PLOT', title: 'Authority Residential Plot for Sale', price: '₹85 Lac', locality: 'Sector 150, Noida Expressway', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '1.8K+ Offices', categoryCode: 'OFFICE', title: 'Grade A IT Office Space for Sale', price: '₹55 Lac', locality: 'Sector 62, Noida', postedAgo: 'Today' },
    ],
    rent: [
      { categoryName: 'Flats', categoryCount: '19K+ Flats', categoryCode: 'APARTMENT', title: '2 Bhk High Rise Apartment for Rent', price: '₹24,000 / mo', locality: 'Sector 137, Noida Expressway', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '1.8K+ Houses', categoryCode: 'HOUSE', title: '3 Bhk Independent Floor for Rent', price: '₹35,000 / mo', locality: 'Sector 26, Noida', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '900+ Plots', categoryCode: 'PLOT', title: 'Industrial Plot for Long Term Lease', price: '₹90,000 / mo', locality: 'Phase 2, Noida', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '2.4K+ Offices', categoryCode: 'OFFICE', title: 'Plug & Play Coworking/Office Space', price: '₹60,000 / mo', locality: 'Sector 16, Film City, Noida', postedAgo: 'Today' },
    ],
  },
  Gurgaon: {
    buy: [
      { categoryName: 'Flats', categoryCount: '36K+ Flats', categoryCode: 'APARTMENT', title: '4 Bhk Ultra Luxury Condominium', price: '₹3.8 Cr', locality: 'Golf Course Extension, Gurgaon', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '5.2K+ Houses', categoryCode: 'HOUSE', title: 'Luxury Villa with Private Garden', price: '₹5.5 Cr', locality: 'DLF Phase 1, Gurgaon', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '4.5K+ Plots', categoryCode: 'PLOT', title: 'Gated Township Residential Land', price: '₹1.8 Cr', locality: 'Sector 57, Gurgaon', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '3.1K+ Offices', categoryCode: 'OFFICE', title: 'Corporate Office in Signature Tower', price: '₹1.4 Cr', locality: 'Cyber City, Gurgaon', postedAgo: 'Today' },
    ],
    rent: [
      { categoryName: 'Flats', categoryCount: '30K+ Flats', categoryCode: 'APARTMENT', title: '3 Bhk Fully Furnished Apartment', price: '₹65,000 / mo', locality: 'Sohna Road, Gurgaon', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '4.0K+ Houses', categoryCode: 'HOUSE', title: 'Independent Floor with Terrace Garden', price: '₹85,000 / mo', locality: 'Sushant Lok 1, Gurgaon', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '1.2K+ Plots', categoryCode: 'PLOT', title: 'Commercial Yard for Lease', price: '₹2.5 Lac / mo', locality: 'Manesar, Gurgaon', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '4.8K+ Offices', categoryCode: 'OFFICE', title: '50-Seater Ready Corporate Office', price: '₹1.8 Lac / mo', locality: 'MG Road, Gurgaon', postedAgo: 'Today' },
    ],
  },
  Mumbai: {
    buy: [
      { categoryName: 'Flats', categoryCount: '42K+ Flats', categoryCode: 'APARTMENT', title: '2 Bhk Sea View Apartment for Sale', price: '₹2.8 Cr', locality: 'Andheri West, Mumbai', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '2.1K+ Houses', categoryCode: 'HOUSE', title: 'Row House / Bungalow for Sale', price: '₹6.2 Cr', locality: 'Juhu Scheme, Mumbai', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '1.1K+ Plots', categoryCode: 'PLOT', title: 'Non-Agricultural Land Parcel', price: '₹1.9 Cr', locality: 'Panvel, Navi Mumbai', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '3.8K+ Offices', categoryCode: 'OFFICE', title: 'Commercial Office in Business Park', price: '₹1.75 Cr', locality: 'BKC, Mumbai', postedAgo: 'Today' },
    ],
    rent: [
      { categoryName: 'Flats', categoryCount: '38K+ Flats', categoryCode: 'APARTMENT', title: '2 Bhk High Floor Flat for Rent', price: '₹70,000 / mo', locality: 'Bandra West, Mumbai', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '1.5K+ Houses', categoryCode: 'HOUSE', title: 'Independent Bungalow for Rent', price: '₹1.8 Lac / mo', locality: 'Pali Hill, Bandra, Mumbai', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '850+ Plots', categoryCode: 'PLOT', title: 'Industrial Open Yard for Lease', price: '₹1.5 Lac / mo', locality: 'Thane West, Mumbai', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '5.2K+ Offices', categoryCode: 'OFFICE', title: 'Furnished Office Cabin & Workstations', price: '₹95,000 / mo', locality: 'Lower Parel, Mumbai', postedAgo: 'Today' },
    ],
  },
  Bangalore: {
    buy: [
      { categoryName: 'Flats', categoryCount: '35K+ Flats', categoryCode: 'APARTMENT', title: '3 Bhk Gated Community Apartment', price: '₹1.45 Cr', locality: 'Whitefield, Bangalore', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '4.8K+ Houses', categoryCode: 'HOUSE', title: '4 Bhk Independent Villa with Garden', price: '₹3.1 Cr', locality: 'Sarjapur Road, Bangalore', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '3.9K+ Plots', categoryCode: 'PLOT', title: 'BMRDA Approved Villa Plot for Sale', price: '₹65 Lac', locality: 'Electronic City, Bangalore', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '2.5K+ Offices', categoryCode: 'OFFICE', title: 'Commercial Tech Space for Sale', price: '₹95 Lac', locality: 'HSR Layout, Bangalore', postedAgo: 'Today' },
    ],
    rent: [
      { categoryName: 'Flats', categoryCount: '31K+ Flats', categoryCode: 'APARTMENT', title: '3 Bhk Premium Society Flat for Rent', price: '₹48,000 / mo', locality: 'Bellandur, Outer Ring Road', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '3.2K+ Houses', categoryCode: 'HOUSE', title: '4 Bhk Triplex Villa for Rent', price: '₹80,000 / mo', locality: 'Indiranagar, Bangalore', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '1.1K+ Plots', categoryCode: 'PLOT', title: 'Commercial Open Land for Lease', price: '₹85,000 / mo', locality: 'Hebbal, Bangalore', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '3.6K+ Offices', categoryCode: 'OFFICE', title: 'Fully Fitted Tech Office for Rent', price: '₹1.1 Lac / mo', locality: 'Koramangala, Bangalore', postedAgo: 'Today' },
    ],
  },
  Pune: {
    buy: [
      { categoryName: 'Flats', categoryCount: '22K+ Flats', categoryCode: 'APARTMENT', title: '2 Bhk Modern Flat for Sale', price: '₹72 Lac', locality: 'Kharadi, Pune', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '3.1K+ Houses', categoryCode: 'HOUSE', title: '3 Bhk Independent Row House', price: '₹1.6 Cr', locality: 'Baner, Pune', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '2.4K+ Plots', categoryCode: 'PLOT', title: 'Residential NA Plot for Sale', price: '₹42 Lac', locality: 'Wagholi, Pune', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '1.5K+ Offices', categoryCode: 'OFFICE', title: 'Commercial IT Park Office', price: '₹48 Lac', locality: 'Hinjawadi, Pune', postedAgo: 'Today' },
    ],
    rent: [
      { categoryName: 'Flats', categoryCount: '18K+ Flats', categoryCode: 'APARTMENT', title: '2 Bhk Furnished Flat for Rent', price: '₹26,000 / mo', locality: 'Viman Nagar, Pune', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '2.0K+ Houses', categoryCode: 'HOUSE', title: '3 Bhk Villa for Rent', price: '₹45,000 / mo', locality: 'Koregaon Park, Pune', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '800+ Plots', categoryCode: 'PLOT', title: 'Commercial Plot for Lease', price: '₹60,000 / mo', locality: 'Hadapsar, Pune', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '1.9K+ Offices', categoryCode: 'OFFICE', title: 'Furnished Office Space for Rent', price: '₹55,000 / mo', locality: 'Senapati Bapat Road, Pune', postedAgo: 'Today' },
    ],
  },
  Hyderabad: {
    buy: [
      { categoryName: 'Flats', categoryCount: '28K+ Flats', categoryCode: 'APARTMENT', title: '3 Bhk Gated Flat for Sale', price: '₹1.25 Cr', locality: 'Gachibowli, Hyderabad', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '3.6K+ Houses', categoryCode: 'HOUSE', title: '4 Bhk Independent Villa for Sale', price: '₹2.8 Cr', locality: 'Jubilee Hills, Hyderabad', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '3.2K+ Plots', categoryCode: 'PLOT', title: 'HMDA Approved Villa Plot', price: '₹58 Lac', locality: 'Miyapur, Hyderabad', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '2.0K+ Offices', categoryCode: 'OFFICE', title: 'Commercial Space in IT Corridor', price: '₹75 Lac', locality: 'Hitec City, Hyderabad', postedAgo: 'Today' },
    ],
    rent: [
      { categoryName: 'Flats', categoryCount: '22K+ Flats', categoryCode: 'APARTMENT', title: '3 Bhk High Rise Flat for Rent', price: '₹42,000 / mo', locality: 'Kondapur, Hyderabad', postedAgo: 'Today' },
      { categoryName: 'Houses', categoryCount: '2.4K+ Houses', categoryCode: 'HOUSE', title: 'Independent Villa with Lawn', price: '₹65,000 / mo', locality: 'Madhapur, Hyderabad', postedAgo: 'Today' },
      { categoryName: 'Plots', categoryCount: '950+ Plots', categoryCode: 'PLOT', title: 'Commercial Land for Lease', price: '₹70,000 / mo', locality: 'Kukatpally, Hyderabad', postedAgo: 'Today' },
      { categoryName: 'Offices', categoryCount: '2.7K+ Offices', categoryCode: 'OFFICE', title: 'Plug & Play Office Space', price: '₹85,000 / mo', locality: 'Financial District, Hyderabad', postedAgo: 'Today' },
    ],
  },
};

function formatRelativeTime(dateStr?: string | Date) {
  if (!dateStr) return 'Today';
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return 'Today';
  if (diffHours < 48) return 'Yesterday';
  const days = Math.floor(diffHours / 24);
  return `${days} days ago`;
}

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

  // ─── Mobile "Recently Posted Properties" Dynamic State ───
  const [recentTab, setRecentTab] = useState<'buy' | 'rent'>('buy');
  const [recentCity, setRecentCity] = useState<string>('Delhi');
  const [cityListings, setCityListings] = useState<any[]>([]);
  const [, setCityListingsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchCityListings = async () => {
      setCityListingsLoading(true);
      try {
        const typeParam = recentTab === 'buy' ? 'sale' : 'rent';
        const res = await fetch(`/api/listings?city=${encodeURIComponent(recentCity)}&type=${typeParam}&limit=16`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.listings && Array.isArray(data.listings)) {
            setCityListings(data.listings);
          }
        }
      } catch (err) {
        console.error('Failed to fetch city listings:', err);
      } finally {
        if (!isCancelled) setCityListingsLoading(false);
      }
    };

    fetchCityListings();
    return () => {
      isCancelled = true;
    };
  }, [recentCity, recentTab]);

  // Helper to extract or fallback the 4 category rows for the mobile section
  const getCategoryRowData = (rowIndex: number, categoryTypes: string[]) => {
    const fallbackList = CITY_FALLBACK_DATA[recentCity]?.[recentTab] || CITY_FALLBACK_DATA.Delhi[recentTab];
    const fallback = fallbackList[rowIndex];

    // Check if a real listing exists for this category in cityListings
    const matchedListing = cityListings.find((l) =>
      categoryTypes.includes(l.propertyType)
    );

    if (matchedListing) {
      const isRent = recentTab === 'rent';
      const formattedPrice = formatCardPrice(matchedListing.askingPrice, isRent);
      const bhkText = matchedListing.bedrooms ? `${matchedListing.bedrooms} Bhk ` : '';
      const localityText = matchedListing.locality ? ` in ${matchedListing.locality}` : ` in ${matchedListing.city}`;
      const title = `${bhkText}${matchedListing.title} (${formattedPrice})${localityText}`;

      return {
        categoryName: fallback.categoryName,
        categoryCount: fallback.categoryCount,
        categoryCode: fallback.categoryCode,
        title,
        postedAgo: formatRelativeTime(matchedListing.createdAt),
        link: `/property/${matchedListing.id}`,
        isReal: true,
      };
    }

    // Fallback to rich authentic city data
    return {
      ...fallback,
      link: `/listings?type=${recentTab === 'buy' ? 'sale' : 'rent'}&city=${encodeURIComponent(recentCity)}&property_type=${fallback.categoryCode}`,
      isReal: false,
    };
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

  // Drawer context for menu state awareness
  const { isMenuOpen } = useMobileMenu();

  // Sticky Floating Mobile Bottom CTA
  const mobileFormRef = useRef<HTMLFormElement | null>(null);
  const inlineCtaRef = useRef<HTMLButtonElement | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [expandedTestimonials, setExpandedTestimonials] = useState<Record<string, boolean>>({});

  const toggleTestimonial = (id: string) => {
    setExpandedTestimonials((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (window.innerWidth > 768) {
        setShowStickyCta(false);
        setShowScrollTop(false);
        return;
      }
      const inlineBtn = inlineCtaRef.current;
      if (inlineBtn) {
        const rect = inlineBtn.getBoundingClientRect();
        // Becomes visible when the inline CTA button has scrolled off the top of the viewport
        setShowStickyCta(rect.bottom < 40);
      } else {
        setShowStickyCta(window.scrollY > 450);
      }
      setShowScrollTop(window.scrollY > 350);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [mobileTopTab, mobileCategory]);

  // Track keyboard opening / input focus to avoid floating CTA obscuring inputs or keyboard
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let blurTimeout: NodeJS.Timeout | null = null;

    const handleFocusIn = (e: FocusEvent) => {
      if (blurTimeout) clearTimeout(blurTimeout);
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setIsInputFocused(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const nextTarget = e.relatedTarget as HTMLElement | null;
      if (nextTarget && (nextTarget.tagName === 'INPUT' || nextTarget.tagName === 'TEXTAREA' || nextTarget.isContentEditable)) {
        return;
      }
      blurTimeout = setTimeout(() => {
        setIsInputFocused(false);
      }, 100);
    };

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const isKeyboard = window.innerHeight - window.visualViewport.height > 150;
        if (isKeyboard) {
          setIsInputFocused(true);
        } else if (!document.activeElement || (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
          setIsInputFocused(false);
        }
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  const isStickyVisible = showStickyCta && !isInputFocused && !isMenuOpen && !authModalOpen && !verificationModalOpen;

  const handleStickyCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    submitSourceRef.current = 'mobile';
    const inputEl = document.getElementById('mobileContactInput') as HTMLInputElement | null;
    const currentVal = inputEl?.value || mobileContact;
    const contact = currentVal.trim() || (profile?.phone || '');

    if (!contact) {
      if (inputEl) {
        inputEl.focus({ preventScroll: true });
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      showToast('Contact Required', 'Please enter your phone number or email to start posting', 'info');
      return;
    }

    if (inputEl && !inputEl.value && contact) {
      inputEl.value = contact;
    }
    if (!mobileContact.trim() && contact) {
      setMobileContact(contact);
    }
    if (!phone && contact) {
      const digits = contact.replace(/\D/g, '');
      if (digits.length >= 10) {
        setPhone(digits.slice(-10));
      }
    }

    if (mobileFormRef.current) {
      mobileFormRef.current.requestSubmit();
    }
  };

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
    const inputEl = document.getElementById('mobileContactInput') as HTMLInputElement | null;
    const currentVal = inputEl?.value || mobileContact;
    const contact = currentVal.trim() || (profile?.phone || '');

    if (!contact) {
      showToast('Contact Required', 'Please enter your phone number or email', 'error');
      if (inputEl) {
        inputEl.focus({ preventScroll: true });
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
        window.sessionStorage.removeItem('onboarding_email');
      }
    } else if (isEmail) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('onboarding_email', contact);
        window.sessionStorage.removeItem('onboarding_phone');
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
            ref={mobileFormRef}
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
                ref={inlineCtaRef}
                type="submit"
                className={styles.mobileCtaBtn}
              >
                Start now, it’s FREE
              </button>
            </div>
          </form>
        </section>

        {/* MOBILE 3 SIMPLE STEPS SECTION (Matches uploaded reference mockup) */}
        <section className={styles.mobileStepsSection} aria-label="How to post property in 3 simple steps">
          <div className={styles.mobileStepsContainer}>
            <div className={styles.mobileStepsHeader}>
              <span className={styles.mobileStepsPreheading}>HOW TO POST</span>
              <h2 className={styles.mobileStepsTitle}>
                Post Your Property in<br />3 Simple Steps
              </h2>
            </div>

            <div className={styles.mobileStepsFlow}>
              {/* Step 01 */}
              <div className={styles.mobileStepRow}>
                <div className={styles.mobileStepLeftCol}>
                  <div className={styles.mobileStepIllustration}>
                    <Step1Illustration />
                  </div>
                  <h3 className={styles.mobileStepHeading}>
                    <span className={styles.mobileStepNum}>01. </span>
                    <span className={styles.mobileStepTitle}>Add property details</span>
                  </h3>
                  <p className={styles.mobileStepDesc}>
                    Begin by telling us the few basic details about your property like your property type, location, rooms, etc
                  </p>
                </div>
                <div className={styles.mobileStepRightCol}>
                  <div className={styles.connectorWrapper}>
                    <ConnectorCurveRight />
                  </div>
                </div>
              </div>

              {/* Step 02 */}
              <div className={`${styles.mobileStepRow} ${styles.mobileStepRowAlt}`}>
                <div className={styles.mobileStepLeftCol}>
                  <div className={styles.connectorWrapperLeft}>
                    <ConnectorCurveLeft />
                  </div>
                </div>
                <div className={`${styles.mobileStepRightCol} ${styles.mobileStepRightAlign}`}>
                  <div className={styles.mobileStepIllustration}>
                    <Step2Illustration />
                  </div>
                  <h3 className={styles.mobileStepHeading}>
                    <span className={styles.mobileStepNum}>02. </span>
                    <span className={styles.mobileStepTitle}>Upload Photos &amp; Videos</span>
                  </h3>
                  <p className={styles.mobileStepDesc}>
                    Add photos/videos of your property from desktop or mobile
                  </p>
                </div>
              </div>

              {/* Step 03 */}
              <div className={styles.mobileStepRow}>
                <div className={styles.mobileStepLeftCol}>
                  <div className={styles.mobileStepIllustration}>
                    <Step3Illustration />
                  </div>
                  <h3 className={styles.mobileStepHeading}>
                    <span className={styles.mobileStepNum}>03. </span>
                    <span className={styles.mobileStepTitle}>Add Pricing &amp; Ownership</span>
                  </h3>
                  <p className={styles.mobileStepDesc}>
                    Add ownership details and expected price, then you are ready to post
                  </p>
                </div>
                <div className={styles.mobileStepRightCol} />
              </div>
            </div>
          </div>
        </section>

        {/* MOBILE 'WHY TRUST US' VISIBILITY STATS SECTION */}
        <section className={styles.mobileTrustSection} aria-label="Why trust ListMe">
          <div className={styles.mobileTrustBackdrop} />
          <div className={styles.mobileTrustCardWrapper}>
            <div className={styles.mobileTrustCard}>
              <span className={styles.mobileTrustTag}>WHY TRUST US</span>
              <h2 className={styles.mobileTrustTitle}>
                Get maximum visibility with 7 million unique visitors monthly
              </h2>
              <p className={styles.mobileTrustSubtitle}>
                ListMe gives your property the best reach with best advertisement
              </p>

              <div className={styles.mobileTrustMetrics}>
                {/* Metric 1: Listings */}
                <div className={styles.mobileTrustMetricItem}>
                  <div className={styles.mobileTrustMetricIcon}>
                    <TrustHouseIcon />
                  </div>
                  <div className={styles.mobileTrustMetricContent}>
                    <span className={styles.mobileTrustMetricNumber}>Over 1 million</span>
                    <span className={styles.mobileTrustMetricLabel}>Property listings</span>
                  </div>
                </div>

                {/* Metric 2: Searches */}
                <div className={styles.mobileTrustMetricItem}>
                  <div className={styles.mobileTrustMetricIcon}>
                    <TrustSearchIcon />
                  </div>
                  <div className={styles.mobileTrustMetricContent}>
                    <span className={styles.mobileTrustMetricNumber}>Over 5.5 million</span>
                    <span className={styles.mobileTrustMetricLabel}>Monthly searches</span>
                  </div>
                </div>

                {/* Metric 3: Owners */}
                <div className={styles.mobileTrustMetricItem}>
                  <div className={styles.mobileTrustMetricIcon}>
                    <TrustUserIcon />
                  </div>
                  <div className={styles.mobileTrustMetricContent}>
                    <span className={styles.mobileTrustMetricNumber}>Over 200K</span>
                    <span className={styles.mobileTrustMetricLabel}>Owners advertising monthly</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MOBILE TESTIMONIALS CAROUSEL ('What our users have to say...') */}
        <section className={styles.mobileTestimonialsSection} aria-label="What our users have to say">
          <div className={styles.mobileTestimonialsHeader}>
            <h2 className={styles.mobileTestimonialsTitle}>What our users have to say...</h2>
          </div>

          <div className={styles.mobileTestimonialsTrack} role="region" aria-label="User testimonials">
            {MOBILE_USER_TESTIMONIALS.map((t) => {
              const isExpanded = !!expandedTestimonials[t.id];
              return (
                <div key={t.id} className={styles.mobileTestimonialCard}>
                  <div>
                    <div className={styles.mobileTestimonialAuthor}>
                      <div className={`${styles.mobileAuthorAvatar} ${styles[t.avatarVariant]}`}>
                        {t.avatarInitials}
                      </div>
                      <div className={styles.mobileAuthorDetails}>
                        <h3 className={styles.mobileAuthorName}>{t.author}</h3>
                        <span className={styles.mobileAuthorRole}>{t.role}</span>
                      </div>
                    </div>

                    <p className={`${styles.mobileTestimonialText} ${isExpanded ? styles.mobileTestimonialTextExpanded : ''}`}>
                      {isExpanded ? t.fullText : t.shortText}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleTestimonial(t.id)}
                    className={styles.mobileReadMoreBtn}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? 'Read less' : 'Read more'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* MOBILE RECENTLY POSTED PROPERTIES DYNAMIC SECTION (Matches user screenshots) */}
        <section className={styles.mobileRecentSection} aria-label="Recently posted properties">
          <h2 className={styles.mobileRecentTitle}>Recently posted properties</h2>

          {/* Buy vs Rent/Lease Tabs */}
          <div className={styles.mobileRecentTabs} role="tablist" aria-label="Property transaction types">
            <button
              type="button"
              role="tab"
              aria-selected={recentTab === 'buy'}
              className={`${styles.mobileRecentTabBtn} ${recentTab === 'buy' ? styles.mobileRecentTabBtnActive : ''}`}
              onClick={() => setRecentTab('buy')}
            >
              Buy
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={recentTab === 'rent'}
              className={`${styles.mobileRecentTabBtn} ${recentTab === 'rent' ? styles.mobileRecentTabBtnActive : ''}`}
              onClick={() => setRecentTab('rent')}
            >
              Rent/Lease
            </button>
            <div
              className={styles.mobileRecentTabIndicator}
              style={{
                left: recentTab === 'buy' ? '0%' : '50%',
                width: '50%',
              }}
            />
          </div>

          {/* Location Filter Pills Track */}
          <div className={styles.mobileCityPillsTrack} role="region" aria-label="Location filters">
            {POPULAR_CITIES.map((city) => {
              const isSelected = city === recentCity;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => setRecentCity(city)}
                  className={`${styles.mobileCityPill} ${isSelected ? styles.mobileCityPillActive : ''}`}
                  aria-pressed={isSelected}
                >
                  {city}
                </button>
              );
            })}
          </div>

          {/* Category Table Card */}
          <div className={styles.mobileRecentTableCard}>
            {/* Row 1: Flats */}
            {(() => {
              const row = getCategoryRowData(0, ['APARTMENT', 'BUILDER_FLOOR', 'PENTHOUSE']);
              return (
                <div className={styles.mobileRecentRow}>
                  <Link
                    href={`/listings?type=${recentTab === 'buy' ? 'sale' : 'rent'}&city=${encodeURIComponent(recentCity)}&property_type=APARTMENT`}
                    className={styles.mobileCategoryCol}
                    title={`View ${row.categoryCount} in ${recentCity}`}
                  >
                    <span className={styles.mobileCategoryCount}>{row.categoryCount}</span>
                  </Link>
                  <Link
                    href={row.link}
                    className={styles.mobileListingCol}
                    title={row.title}
                  >
                    <div className={styles.mobileCategoryIconWrapper}>
                      <FlatCategoryIcon />
                    </div>
                    <div className={styles.mobileListingDetails}>
                      <p className={styles.mobileListingTitle}>{row.title}</p>
                      <span className={styles.mobileListingDate}>{row.postedAgo}</span>
                    </div>
                  </Link>
                </div>
              );
            })()}

            {/* Row 2: Houses */}
            {(() => {
              const row = getCategoryRowData(1, ['HOUSE', 'VILLA']);
              return (
                <div className={styles.mobileRecentRow}>
                  <Link
                    href={`/listings?type=${recentTab === 'buy' ? 'sale' : 'rent'}&city=${encodeURIComponent(recentCity)}&property_type=HOUSE`}
                    className={styles.mobileCategoryCol}
                    title={`View ${row.categoryCount} in ${recentCity}`}
                  >
                    <span className={styles.mobileCategoryCount}>{row.categoryCount}</span>
                  </Link>
                  <Link
                    href={row.link}
                    className={styles.mobileListingCol}
                    title={row.title}
                  >
                    <div className={styles.mobileCategoryIconWrapper}>
                      <HouseCategoryIcon />
                    </div>
                    <div className={styles.mobileListingDetails}>
                      <p className={styles.mobileListingTitle}>{row.title}</p>
                      <span className={styles.mobileListingDate}>{row.postedAgo}</span>
                    </div>
                  </Link>
                </div>
              );
            })()}

            {/* Row 3: Plots */}
            {(() => {
              const row = getCategoryRowData(2, ['PLOT', 'COMMERCIAL_LAND']);
              return (
                <div className={styles.mobileRecentRow}>
                  <Link
                    href={`/listings?type=${recentTab === 'buy' ? 'sale' : 'rent'}&city=${encodeURIComponent(recentCity)}&property_type=PLOT`}
                    className={styles.mobileCategoryCol}
                    title={`View ${row.categoryCount} in ${recentCity}`}
                  >
                    <span className={styles.mobileCategoryCount}>{row.categoryCount}</span>
                  </Link>
                  <Link
                    href={row.link}
                    className={styles.mobileListingCol}
                    title={row.title}
                  >
                    <div className={styles.mobileCategoryIconWrapper}>
                      <PlotCategoryIcon />
                    </div>
                    <div className={styles.mobileListingDetails}>
                      <p className={styles.mobileListingTitle}>{row.title}</p>
                      <span className={styles.mobileListingDate}>{row.postedAgo}</span>
                    </div>
                  </Link>
                </div>
              );
            })()}

            {/* Row 4: Offices */}
            {(() => {
              const row = getCategoryRowData(3, ['OFFICE', 'SHOP', 'WAREHOUSE']);
              return (
                <div className={styles.mobileRecentRow}>
                  <Link
                    href={`/listings?type=${recentTab === 'buy' ? 'sale' : 'rent'}&city=${encodeURIComponent(recentCity)}&property_type=OFFICE`}
                    className={styles.mobileCategoryCol}
                    title={`View ${row.categoryCount} in ${recentCity}`}
                  >
                    <span className={styles.mobileCategoryCount}>{row.categoryCount}</span>
                  </Link>
                  <Link
                    href={row.link}
                    className={styles.mobileListingCol}
                    title={row.title}
                  >
                    <div className={styles.mobileCategoryIconWrapper}>
                      <OfficeCategoryIcon />
                    </div>
                    <div className={styles.mobileListingDetails}>
                      <p className={styles.mobileListingTitle}>{row.title}</p>
                      <span className={styles.mobileListingDate}>{row.postedAgo}</span>
                    </div>
                  </Link>
                </div>
              );
            })()}
          </div>
        </section>

        {/* DESKTOP 3 SIMPLE STEPS SECTION */}
        <section className={`${styles.stepsSection} ${styles.desktopSteps} section-padding`}>
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

      {/* STICKY FLOATING MOBILE BOTTOM CTA */}
      <div 
        className={`${styles.stickyMobileCtaContainer} ${isStickyVisible ? styles.stickyMobileCtaVisible : ''}`}
        aria-hidden={!isStickyVisible}
      >
        <button
          type="button"
          onClick={handleStickyCtaClick}
          className={styles.stickyMobileCtaBtn}
          tabIndex={isStickyVisible ? 0 : -1}
          aria-label="Start posting your property now for free"
        >
          Start now, it’s FREE
        </button>
      </div>

      {/* FLOATING SCROLL-TO-TOP BUTTON (mobile only, appears after scrolling down) */}
      {showScrollTop && (
        <button
          type="button"
          className={styles.scrollTopBtn}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll back to top"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 14V4M9 4L5 8M9 4L13 8" stroke="#0078db" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

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
