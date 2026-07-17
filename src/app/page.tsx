'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building, Building2, ShieldCheck, Heart, Check, Tag, ArrowUp, MapPin, MessageSquare, Calendar, Home as HomeIcon, CheckCircle, Users, CircleDollarSign, Star, ChevronLeft, ChevronRight, ChevronDown, Navigation, Mic, ArrowLeft } from 'lucide-react';
import { Header, Footer } from '../components/layout';
import { Button, Card } from '../components/ui';
import styles from './Home.module.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '@/context/AuthContext';


// Register ScrollTrigger plugin (client-side only to prevent SSR issues)
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const avatars = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
];

const staticHandpickedProperties = [
  {
    id: 'static-1',
    title: 'Luxury Villa in Whitefield',
    location: 'Whitefield, Bangalore',
    price: '₹2.85 Cr',
    beds: 4,
    baths: 4,
    area: '3200 Sq.Ft',
    tag: 'For Sale',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
    ownerVerified: true,
  },
  {
    id: 'static-2',
    title: 'Modern 3BHK Apartment',
    location: 'Hitec City, Hyderabad',
    price: '₹45,000 /month',
    beds: 3,
    baths: 2,
    area: '1650 Sq.Ft',
    tag: 'For Rent',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    ownerVerified: true,
  },
  {
    id: 'static-3',
    title: 'Premium Duplex House',
    location: 'Gachibowli, Hyderabad',
    price: '₹1.95 Cr',
    beds: 4,
    baths: 3,
    area: '2400 Sq.Ft',
    tag: 'For Sale',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    ownerVerified: true,
  },
  {
    id: 'static-4',
    title: 'Studio Apartment',
    location: 'Koramangala, Bangalore',
    price: '₹22,000 /month',
    beds: 1,
    baths: 1,
    area: '600 Sq.Ft',
    tag: 'For Rent',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    ownerVerified: true,
  }
];

const formatPrice = (price: number | string, listingFor: string) => {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) return 'Price on Request';
  
  if (listingFor.toUpperCase() === 'SALE') {
    if (numericPrice >= 10000000) {
      return `₹${(numericPrice / 10000000).toFixed(2)} Cr`;
    }
    if (numericPrice >= 100000) {
      return `₹${(numericPrice / 100000).toFixed(2)} Lakh`;
    }
    return `₹${numericPrice.toLocaleString('en-IN')}`;
  } else {
    return `₹${numericPrice.toLocaleString('en-IN')} /month`;
  }
};

const mapDbListingToProperty = (dbListing: any) => {
  const primaryImage = dbListing.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80';
  return {
    id: dbListing.id,
    title: dbListing.title,
    location: `${dbListing.locality}, ${dbListing.city}`,
    price: formatPrice(dbListing.askingPrice, dbListing.listingFor),
    beds: dbListing.bedrooms || 0,
    baths: dbListing.bathrooms || 0,
    area: dbListing.carpetArea ? `${dbListing.carpetArea} Sq.Ft` : (dbListing.builtUpArea ? `${dbListing.builtUpArea} Sq.Ft` : 'N/A'),
    tag: dbListing.listingFor === 'SALE' ? 'For Sale' : 'For Rent',
    image: primaryImage,
    ownerVerified: true,
  };
};

export default function Home() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [searchLocation, setSearchLocation] = useState('');
  const [searchType, setSearchType] = useState('sale');
  const [searchBudget, setSearchBudget] = useState('');
  const [cityTrends, setCityTrends] = useState<any>(null);
  const [selectedBhk, setSelectedBhk] = useState<string>('ALL');
  const [selectedPossession, setSelectedPossession] = useState<string>('ALL');
  const containerRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const scrollAmount = 304; // card width 280 + gap 24
      categoriesRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [dragged, setDragged] = useState(false);
  const mouseDownPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!categoriesRef.current) return;
    setIsDown(true);
    setDragged(false);
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    setStartX(e.pageX - categoriesRef.current.offsetLeft);
    setScrollLeftState(categoriesRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDown(false);
  };

  const handleMouseUp = () => {
    setIsDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown || !categoriesRef.current) return;
    const deltaX = Math.abs(e.clientX - mouseDownPos.current.x);
    const deltaY = Math.abs(e.clientY - mouseDownPos.current.y);
    
    if (deltaX > 5 || deltaY > 5) {
      setDragged(true);
    }
    
    e.preventDefault();
    const x = e.pageX - categoriesRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    categoriesRef.current.scrollLeft = scrollLeftState - walk;
  };

  const [dbCities, setDbCities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Buy');
  const defaultCategories = new Set(['Flat/Apartment', 'Builder Floor', 'Independent House/Villa', 'Residential Land', '1 RK/ Studio Apartment', 'Farm House', 'Serviced Apartments', 'Other']);
  const [checkedCategories, setCheckedCategories] = useState<Set<string>>(new Set(defaultCategories));
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const categoryMenuRef = useRef<HTMLDivElement>(null);

  // Filter pills state
  const [activeDropdownView, setActiveDropdownView] = useState<'main' | 'budget' | 'bedroom' | 'construction' | 'postedby'>('main');
  const [budgetRange, setBudgetRange] = useState<[number, number]>([0, 100]);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>('Any');
  const [selectedConstructionStatus, setSelectedConstructionStatus] = useState<string>('Any');
  const [selectedPostedBy, setSelectedPostedBy] = useState<string>('Any');

  // Commercial States
  const [commercialTrade, setCommercialTrade] = useState<'Buy' | 'Lease' | 'Invest'>('Buy');
  const [isCommercialTradeOpen, setIsCommercialTradeOpen] = useState(false);
  const [commercialType, setCommercialType] = useState<string>('All Commercial');
  const [isCommercialTypeOpen, setIsCommercialTypeOpen] = useState(false);
  const [officeSpaceType, setOfficeSpaceType] = useState<string | null>(null);
  const [commercialArea, setCommercialArea] = useState<[number, number]>([0, 10000]);
  const [commercialActiveView, setCommercialActiveView] = useState<'main' | 'budget' | 'area' | 'construction' | 'postedby' | 'seats'>('main');

  // Lease seat/grade-A States
  const [leaseSeats, setLeaseSeats] = useState<string>('Any');
  const [isGradeAOnly, setIsGradeAOnly] = useState<boolean>(false);

  // Commercial Buy checkbox states
  const [selectedBuySubtypes, setSelectedBuySubtypes] = useState<Set<string>>(new Set([
    'Ready to move offices', 'Shops & Retail', 'Agricultural/Farm Land', 'Warehouse', 'Factory & Manufacturing', 'Others',
    'Bare shell offices', 'Commercial/Inst. Land', 'Industrial Land/Plots', 'Cold Storage', 'Hotel/Resorts'
  ]));
  const [selectedBuyInvestmentOptions, setSelectedBuyInvestmentOptions] = useState<Set<string>>(new Set());

  // Plots/Land States
  const [plotsType, setPlotsType] = useState<'Residential' | 'Commercial'>('Residential');
  const [isPlotsTypeOpen, setIsPlotsTypeOpen] = useState(false);
  const [plotsTrade, setPlotsTrade] = useState<'Buy' | 'Lease' | 'Invest'>('Buy');
  const [isPlotsTradeOpen, setIsPlotsTradeOpen] = useState(false);
  const [selectedPlotsSubtypes, setSelectedPlotsSubtypes] = useState<Set<string>>(new Set([
    'Agricultural / Farm Land', 'Industrial Plots/Land', 'Commercial / Inst. Land'
  ]));

  // Project States
  const [projectType, setProjectType] = useState<'Residential Project' | 'Commercial Project'>('Residential Project');
  const [isProjectTypeOpen, setIsProjectTypeOpen] = useState(false);
  const [selectedProjectStatuses, setSelectedProjectStatuses] = useState<Set<string>>(new Set(['New Launch', 'Under Construction', 'Ready to move']));
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const commercialTradeMenuRef = useRef<HTMLDivElement>(null);
  const commercialTypeMenuRef = useRef<HTMLDivElement>(null);
  const plotsTypeMenuRef = useRef<HTMLDivElement>(null);
  const plotsTradeMenuRef = useRef<HTMLDivElement>(null);

  // Category label helper
  const categoryLabel = checkedCategories.size === defaultCategories.size
    ? 'All Residential'
    : checkedCategories.size === 0
      ? 'Select Type'
      : checkedCategories.size === 1
        ? Array.from(checkedCategories)[0]
        : `${checkedCategories.size} Selected`;

  const toggleCategory = (cat: string) => {
    setCheckedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
        setActiveDropdownView('main');
      }
      if (commercialTradeMenuRef.current && !commercialTradeMenuRef.current.contains(e.target as Node)) {
        setIsCommercialTradeOpen(false);
        setCommercialActiveView('main');
      }
      if (commercialTypeMenuRef.current && !commercialTypeMenuRef.current.contains(e.target as Node)) {
        setIsCommercialTypeOpen(false);
        setCommercialActiveView('main');
      }
      if (plotsTypeMenuRef.current && !plotsTypeMenuRef.current.contains(e.target as Node)) {
        setIsPlotsTypeOpen(false);
      }
      if (plotsTradeMenuRef.current && !plotsTradeMenuRef.current.contains(e.target as Node)) {
        setIsPlotsTradeOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setIsProjectTypeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderCommercialSubView = () => {
    return (
      <>
        <div className={styles.subViewHeader}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => setCommercialActiveView('main')}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className={styles.subViewPills}>
            <button
              type="button"
              className={`${styles.filterPill} ${commercialActiveView === 'budget' ? styles.filterPillActive : ''}`}
              onClick={() => setCommercialActiveView('budget')}
            >
              Budget <ChevronDown size={14} />
            </button>
            {commercialTrade !== 'Invest' && (
              <button
                type="button"
                className={`${styles.filterPill} ${commercialActiveView === 'area' ? styles.filterPillActive : ''}`}
                onClick={() => setCommercialActiveView('area')}
              >
                Area <ChevronDown size={14} />
              </button>
            )}
            {commercialTrade === 'Lease' && commercialType === 'Office Spaces' && (
              <button
                type="button"
                className={`${styles.filterPill} ${commercialActiveView === 'seats' ? styles.filterPillActive : ''}`}
                onClick={() => setCommercialActiveView('seats')}
              >
                Number of Seats <ChevronDown size={14} />
              </button>
            )}
            {commercialTrade === 'Buy' && (
              <button
                type="button"
                className={`${styles.filterPill} ${commercialActiveView === 'construction' ? styles.filterPillActive : ''}`}
                onClick={() => setCommercialActiveView('construction')}
              >
                Construction Status <ChevronDown size={14} />
              </button>
            )}
            {commercialTrade !== 'Invest' && (
              <button
                type="button"
                className={`${styles.filterPill} ${commercialActiveView === 'postedby' ? styles.filterPillActive : ''}`}
                onClick={() => setCommercialActiveView('postedby')}
              >
                Posted By <ChevronDown size={14} />
              </button>
            )}
          </div>
        </div>

        <div className={styles.subViewContent}>
          {commercialActiveView === 'budget' && (
            <div className={styles.subViewPanel}>
              <div className={styles.budgetHeader}>
                <strong>Select Price Range</strong>
                <span className={styles.budgetSubtext}>{budgetRange[0]} - {budgetRange[1] >= 100 ? '100+' : budgetRange[1]} Crore</span>
              </div>
              <div className={styles.budgetSliderContainer}>
                <span className={styles.budgetLabel}>{budgetRange[0]}</span>
                <div className={styles.budgetSliderTrack}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={budgetRange[0]}
                    onChange={(e) => setBudgetRange([Math.min(Number(e.target.value), budgetRange[1] - 1), budgetRange[1]])}
                    className={styles.budgetRangeInput}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={budgetRange[1]}
                    onChange={(e) => setBudgetRange([budgetRange[0], Math.max(Number(e.target.value), budgetRange[0] + 1)])}
                    className={styles.budgetRangeInput}
                  />
                </div>
                <span className={styles.budgetLabel}>100+ Crores</span>
              </div>
            </div>
          )}

          {commercialActiveView === 'area' && (
            <div className={styles.subViewPanel}>
              <div className={styles.budgetHeader}>
                <strong>Select Area Range (sq ft)</strong>
                <span className={styles.budgetSubtext}>{commercialArea[0]} - {commercialArea[1] >= 10000 ? '10,000+' : commercialArea[1]} sq ft</span>
              </div>
              <div className={styles.budgetSliderContainer}>
                <span className={styles.budgetLabel}>{commercialArea[0]}</span>
                <div className={styles.budgetSliderTrack}>
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={100}
                    value={commercialArea[0]}
                    onChange={(e) => setCommercialArea([Math.min(Number(e.target.value), commercialArea[1] - 100), commercialArea[1]])}
                    className={styles.budgetRangeInput}
                  />
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={100}
                    value={commercialArea[1]}
                    onChange={(e) => setCommercialArea([commercialArea[0], Math.max(Number(e.target.value), commercialArea[0] + 100)])}
                    className={styles.budgetRangeInput}
                  />
                </div>
                <span className={styles.budgetLabel}>10,000+ sq ft</span>
              </div>
            </div>
          )}

          {commercialActiveView === 'seats' && (
            <div className={styles.subViewPanel}>
              <h4 className={styles.subViewPanelTitle}>Number of Seats</h4>
              <div className={styles.subViewPanelOptions}>
                {[
                  { label: 'Any', value: 'Any' },
                  { label: 'Under 10', value: '10' },
                  { label: '10 - 50', value: '50' },
                  { label: '50 - 100', value: '100' },
                  { label: '100+ seats', value: '200' }
                ].map((opt) => {
                  const isActive = leaseSeats === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.subViewOption} ${isActive ? styles.subViewOptionActive : ''}`}
                      onClick={() => setLeaseSeats(opt.value)}
                    >
                      <span style={{ fontWeight: 800 }}>{isActive ? '✓' : '+'}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {commercialActiveView === 'construction' && (
            <div className={styles.subViewPanel}>
              <h4 className={styles.subViewPanelTitle}>Construction Status</h4>
              <div className={styles.subViewPanelOptions}>
                {[
                  { label: 'New Launch', value: 'New Launch' },
                  { label: 'Under Construction', value: 'Under Construction' },
                  { label: 'Ready to move', value: 'Ready to Move' }
                ].map((opt) => {
                  const isActive = selectedConstructionStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.subViewOption} ${isActive ? styles.subViewOptionActive : ''}`}
                      onClick={() => setSelectedConstructionStatus(isActive ? 'Any' : opt.value)}
                    >
                      <span style={{ fontWeight: 800 }}>{isActive ? '✓' : '+'}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {commercialActiveView === 'postedby' && (
            <div className={styles.subViewPanel}>
              <h4 className={styles.subViewPanelTitle}>Posted By</h4>
              <div className={styles.subViewPanelOptions}>
                {[
                  { label: 'Owner', value: 'Owner' },
                  { label: 'Dealer', value: 'Dealer' },
                  { label: 'Builder', value: 'Builder' }
                ].map((opt) => {
                  const isActive = selectedPostedBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.subViewOption} ${isActive ? styles.subViewOptionActive : ''}`}
                      onClick={() => setSelectedPostedBy(isActive ? 'Any' : opt.value)}
                    >
                      <span style={{ fontWeight: 800 }}>{isActive ? '✓' : '+'}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderCommercialPills = () => {
    if (commercialTrade === 'Invest') {
      return (
        <div className={styles.dropdownPillsRow}>
          <button
            type="button"
            className={styles.filterPill}
            onClick={() => setCommercialActiveView('budget')}
          >
            Budget <ChevronDown size={14} />
          </button>
        </div>
      );
    }

    if (commercialTrade === 'Lease') {
      if (commercialType === 'Office Spaces') {
        return (
          <div className={styles.dropdownPillsRow}>
            <button
              type="button"
              className={styles.filterPill}
              onClick={() => setCommercialActiveView('budget')}
            >
              Budget <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className={styles.filterPill}
              onClick={() => setCommercialActiveView('seats')}
            >
              Number of Seats <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className={`${styles.filterPill} ${isGradeAOnly ? styles.filterPillActive : ''}`}
              onClick={() => setIsGradeAOnly(!isGradeAOnly)}
            >
              Show Grade A offices
            </button>
          </div>
        );
      } else {
        return (
          <div className={styles.dropdownPillsRow}>
            <button
              type="button"
              className={styles.filterPill}
              onClick={() => setCommercialActiveView('budget')}
            >
              Budget <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className={styles.filterPill}
              onClick={() => setCommercialActiveView('area')}
            >
              Area <ChevronDown size={14} />
            </button>
            <button
              type="button"
              className={styles.filterPill}
              onClick={() => setCommercialActiveView('postedby')}
            >
              Posted By <ChevronDown size={14} />
            </button>
          </div>
        );
      }
    }

    // Default for 'Buy' trade
    return (
      <div className={styles.dropdownPillsRow}>
        <button
          type="button"
          className={styles.filterPill}
          onClick={() => setCommercialActiveView('budget')}
        >
          Budget <ChevronDown size={14} />
        </button>
        <button
          type="button"
          className={styles.filterPill}
          onClick={() => setCommercialActiveView('area')}
        >
          Area <ChevronDown size={14} />
        </button>
        <button
          type="button"
          className={styles.filterPill}
          onClick={() => setCommercialActiveView('postedby')}
        >
          Posted By <ChevronDown size={14} />
        </button>
      </div>
    );
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSearchQuery(searchLocation ? searchLocation.charAt(0).toUpperCase() + searchLocation.slice(1) : 'Mumbai');
        },
        (error) => {
          setSearchQuery('Delhi NCR');
        }
      );
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.onstart = () => {
        setSearchQuery('Listening...');
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
      };
      recognition.onerror = () => {
        setSearchQuery('');
      };
      recognition.start();
    } else {
      alert('Voice speech recognition not supported in this browser.');
    }
  };

  const [featuredProperties, setFeaturedProperties] = useState<any[]>(staticHandpickedProperties);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch('/api/cities');
        if (res.ok) {
          const data = await res.json();
          if (data.cities) {
            setDbCities(data.cities);
          }
        }
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    }
    fetchCities();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const CITIES = [
      { name: 'mumbai', lat: 19.0760, lon: 72.8777, label: 'Mumbai', dbName: 'mumbai' },
      { name: 'bangalore', lat: 12.9716, lon: 77.5946, label: 'Bangalore', dbName: 'bangalore' },
      { name: 'delhi', lat: 28.6139, lon: 77.2090, label: 'Delhi NCR', dbName: 'delhi ncr' },
      { name: 'pune', lat: 18.5204, lon: 73.8567, label: 'Pune', dbName: 'pune' }
    ];

    async function loadFeatured(closestCityName?: string) {
      setIsLoadingFeatured(true);
      try {
        if (closestCityName) {
          const res = await fetch(`/api/listings?city=${encodeURIComponent(closestCityName)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.listings) {
              setFeaturedProperties(data.listings.map(mapDbListingToProperty));
              return;
            }
          }
        }
        
        // General fallback if no city is detected/provided
        const res = await fetch('/api/listings?limit=4');
        if (res.ok) {
          const data = await res.json();
          if (data.listings) {
            setFeaturedProperties(data.listings.map(mapDbListingToProperty));
          } else {
            setFeaturedProperties(staticHandpickedProperties);
          }
        } else {
          setFeaturedProperties(staticHandpickedProperties);
        }
      } catch (err) {
        console.error('Failed to load listings:', err);
        setFeaturedProperties(staticHandpickedProperties);
      } finally {
        setIsLoadingFeatured(false);
      }
    }

    async function loadCityTrends(cityName: string) {
      try {
        const res = await fetch(`/api/cities/trends?city=${encodeURIComponent(cityName)}`);
        if (res.ok) {
          const data = await res.json();
          setCityTrends(data);
        }
      } catch (err) {
        console.error('Failed to load city trends:', err);
      }
    }

    if (profile?.city) {
      // User is logged in and city is known: load listings dynamically for their city, bypass browser prompt
      setSearchLocation(profile.city.toLowerCase());
      loadFeatured(profile.city);
      loadCityTrends(profile.city);
      console.log('[Home] User is logged in. Loading listings dynamically for city:', profile.city);
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // User is not logged in: attempt browser geolocation
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          let closest = CITIES[0];
          let minDistance = Infinity;
          
          CITIES.forEach((city) => {
            const dist = Math.sqrt(
              Math.pow(latitude - city.lat, 2) + Math.pow(longitude - city.lon, 2)
            );
            if (dist < minDistance) {
              minDistance = dist;
              closest = city;
            }
          });
          
          setSearchLocation(closest.name);
          loadFeatured(closest.dbName);
          loadCityTrends(closest.dbName);
          console.log('[Home] Geolocation granted. Nearest detected city:', closest.label);
        },
        (error) => {
          console.warn('[Home] Geolocation failed or blocked:', error);
          loadFeatured();
          loadCityTrends('bangalore');
        }
      );
    } else {
      loadFeatured();
      loadCityTrends('bangalore');
    }
  }, [profile?.city, authLoading]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Entrance animation for the hero elements
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out', duration: 0.8 }
        });

        tl.from('.hero-left-animate', {
          y: 35,
          autoAlpha: 0,
          stagger: 0.1,
          duration: 0.7
        })
        .from('.glass-pill-animate', {
          y: 15,
          autoAlpha: 0,
          stagger: 0.12,
          ease: 'back.out(1.5)',
          duration: 0.6
        }, '-=0.4')
        .from('.search-capsule-animate', {
          y: 30,
          autoAlpha: 0,
          ease: 'back.out(1.2)',
          duration: 0.85
        }, '-=0.3')
        .from('.bottom-trust-strip-animate', {
          y: 15,
          autoAlpha: 0,
          duration: 0.6
        }, '-=0.4');

        // Scroll-triggered animations for other sections
        gsap.from('.feature-card', {
          scrollTrigger: {
            trigger: '.why-choose-section',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 40,
          autoAlpha: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out'
        });

        gsap.from('.city-card-item', {
          scrollTrigger: {
            trigger: '.cities-section',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 30,
          autoAlpha: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: 'power2.out'
        });

        gsap.from('.cta-card', {
          scrollTrigger: {
            trigger: `.${styles.ctaSplitSection}`,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          y: 40,
          autoAlpha: 0,
          duration: 0.8,
          ease: 'power2.out'
        });

        // Scroll-triggered animations for Testimonials
        gsap.from('.testimonial-card-item', {
          scrollTrigger: {
            trigger: `.${styles.testimonialsSection}`,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 30,
          autoAlpha: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out'
        });


        // Scroll-triggered animations for How It Works Steps
        gsap.from('.how-it-works-step', {
          scrollTrigger: {
            trigger: `.${styles.howItWorksSection}`,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 30,
          autoAlpha: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: 'power2.out'
        });

        // Scroll-triggered animations for Featured Properties
        gsap.from('.property-card-item', {
          scrollTrigger: {
            trigger: `.${styles.featuredSection}`,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 40,
          autoAlpha: 0,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power2.out'
        });
      });

      // Fallback for reduced motion
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set('.hero-left-animate, .glass-pill-animate, .search-capsule-animate, .bottom-trust-strip-animate, .feature-card, .city-card-item, .cta-card, .how-it-works-step, .property-card-item, .testimonial-card-item', {
          autoAlpha: 1,
          y: 0,
          scale: 1
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    // 1. Resolve city from query input text
    const queryLower = searchQuery.toLowerCase();
    let resolvedCity = '';
    if (queryLower.includes('mumbai')) resolvedCity = 'mumbai';
    else if (queryLower.includes('pune')) resolvedCity = 'pune';
    else if (queryLower.includes('delhi')) resolvedCity = 'delhi';
    else if (queryLower.includes('ghaziabad')) resolvedCity = 'ghaziabad';
    else if (searchLocation) resolvedCity = searchLocation;

    if (resolvedCity) params.set('city', resolvedCity);

    // 2. Resolve BHK from query input text
    let resolvedBhk = '';
    if (queryLower.includes('1 bhk') || queryLower.includes('1bhk')) resolvedBhk = '1';
    else if (queryLower.includes('2 bhk') || queryLower.includes('2bhk')) resolvedBhk = '2';
    else if (queryLower.includes('3 bhk') || queryLower.includes('3bhk')) resolvedBhk = '3';
    else if (queryLower.includes('4 bhk') || queryLower.includes('4bhk')) resolvedBhk = '4';

    if (resolvedBhk) params.set('bhk', resolvedBhk);

    // 3. Resolve active tab type
    if (activeTab === 'Rent') {
      params.set('type', 'rent');
    } else if (activeTab === 'Commercial') {
      params.set('type', 'commercial');
      params.set('commercial_trade', commercialTrade.toLowerCase());
      
      if (commercialTrade === 'Invest') {
        params.set('property_type', 'INVESTMENT');
      } else if (commercialTrade === 'Lease') {
        if (commercialType === 'Office Spaces') {
          params.set('property_type', 'OFFICE');
          if (officeSpaceType) params.set('office_type', officeSpaceType);
          if (leaseSeats !== 'Any') params.set('seats', leaseSeats);
          if (isGradeAOnly) params.set('grade_a', 'true');
        } else if (commercialType === 'Shops & Retail') params.set('property_type', 'SHOP');
        else if (commercialType === 'Other commercial spaces') params.set('property_type', 'WAREHOUSE');
        else if (commercialType === 'Factory & Manufacturing') params.set('property_type', 'COMMERCIAL_LAND');
      } else { // Buy
        params.set('property_type', 'COMMERCIAL');
        if (selectedBuySubtypes.size > 0) {
          params.set('commercial_subtypes', Array.from(selectedBuySubtypes).join(','));
        }
        if (selectedBuyInvestmentOptions.size > 0) {
          params.set('investment_options', Array.from(selectedBuyInvestmentOptions).join(','));
        }
      }

      // Pass area filters for commercial
      if (commercialTrade !== 'Invest') {
        if (commercialArea[0] > 0) params.set('min_area', commercialArea[0].toString());
        if (commercialArea[1] < 10000) params.set('max_area', commercialArea[1].toString());
      }
    } else if (activeTab === 'Plots/Land') {
      params.set('property_type', 'PLOT');
      params.set('plot_class', plotsType.toLowerCase());
      if (plotsType === 'Commercial') {
        params.set('plots_trade', plotsTrade.toLowerCase());
        if (selectedPlotsSubtypes.size > 0) {
          params.set('plot_subtypes', Array.from(selectedPlotsSubtypes).join(','));
        }
      }
    } else if (activeTab === 'Projects') {
      params.set('type', 'project');
      params.set('project_class', projectType.includes('Residential') ? 'residential' : 'commercial');
      if (selectedProjectStatuses.size > 0) {
        params.set('project_statuses', Array.from(selectedProjectStatuses).join(','));
      }
    } else {
      params.set('type', 'sale');
    }

    // 4. Resolve selected categories (only if not Commercial, Plots/Land, or Projects)
    if (activeTab !== 'Commercial' && activeTab !== 'Plots/Land' && activeTab !== 'Projects') {
      if (checkedCategories.size === 1) {
        const cat = Array.from(checkedCategories)[0];
        if (cat === 'Flat/Apartment') params.set('property_type', 'APARTMENT');
        else if (cat === 'Independent House/Villa') params.set('property_type', 'VILLA');
        else if (cat === 'Residential Land') params.set('property_type', 'PLOT');
        else if (cat === 'Builder Floor') params.set('property_type', 'HOUSE');
      }
    }

    // 5. Budget Filters
    if (budgetRange[0] > 0) {
      params.set('min_price', (budgetRange[0] * 10000000).toString());
    }
    if (budgetRange[1] < 100) {
      params.set('max_price', (budgetRange[1] * 10000000).toString());
    }

    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        const existing = localStorage.getItem('listme_recent_searches');
        let searches = existing ? JSON.parse(existing) : [];
        if (!Array.isArray(searches)) searches = [];

        const parts = [];
        if (resolvedCity) parts.push(resolvedCity.charAt(0).toUpperCase() + resolvedCity.slice(1));
        parts.push(activeTab);
        if (checkedCategories.size < defaultCategories.size && checkedCategories.size > 0) parts.push(categoryLabel);
        if (resolvedBhk) parts.push(`${resolvedBhk} BHK`);

        const display = parts.join(' • ') || 'All Listings';
        const paramsStr = params.toString();
        searches = searches.filter((s: any) => s.params !== paramsStr);
        searches.unshift({ display, params: paramsStr, timestamp: Date.now() });
        searches = searches.slice(0, 5);
        localStorage.setItem('listme_recent_searches', JSON.stringify(searches));
      } catch (err) {
        console.error(err);
      }
    }

    window.location.href = `/listings?${params.toString()}`;
  };

  const activeCities = [
    { name: 'Mumbai', count: 1240, image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80' },
    { name: 'Bangalore', count: 980, image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=600&q=80' },
    { name: 'Delhi NCR', count: 1100, image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80' },
    { name: 'Pune', count: 640, image: 'https://images.unsplash.com/photo-1601999109332-542b18dbec57?auto=format&fit=crop&w=600&q=80' },
  ];

  const displayedProperties = featuredProperties.filter((prop) => {
    if (selectedBhk !== 'ALL') {
      const bhkVal = parseInt(selectedBhk);
      if (bhkVal >= 4) {
        if (prop.beds < 4) return false;
      } else {
        if (prop.beds !== bhkVal) return false;
      }
    }
    if (selectedPossession !== 'ALL') {
      const titleLower = prop.title.toLowerCase();
      const tagLower = prop.tag.toLowerCase();
      
      if (selectedPossession === 'READY') {
        const isUnderConstruction = titleLower.includes('possession') || titleLower.includes('construction') || titleLower.includes('2027') || titleLower.includes('2031');
        if (isUnderConstruction) return false;
      } else if (selectedPossession === 'UNDER_CONSTRUCTION') {
        const isUnderConstruction = titleLower.includes('possession') || titleLower.includes('construction') || titleLower.includes('2027') || titleLower.includes('2031');
        if (!isUnderConstruction && !tagLower.includes('sale')) return false; // rentals are ready
      }
    }
    return true;
  });

  return (
    <div className={styles.main} ref={containerRef}>
      
      <main style={{ flex: 1 }}>
        {/* --- Hero Canvas Wrapper Section --- */}
        <div className={styles.heroCanvasWrapper}>
          <Header />

          {/* Redesigned Premium Hero Section */}
          <section className={styles.heroSection}>
            <div className={`${styles.heroGrid} container`}>
              
              {/* Left Column: Typography, badges, and ratings */}
              <div className={styles.heroLeft}>
                <h1 className={`${styles.title} hero-left-animate`}>
                  Find. Explore.<br />
                  Own Your Perfect<br />
                  <span className={styles.greenHighlight}>Property.</span>
                </h1>
                
                <p className={`${styles.subtitle} hero-left-animate`}>
                  Search properties in your location and connect directly with verified owners. No fees, no hidden charges.
                </p>

                {/* Two Horizontal Benefit Pills */}
                <div className={`${styles.benefitPillsContainer} hero-left-animate`}>
                  <div className={styles.benefitPill}>
                    <div className={styles.pillIconCircle}>
                      <Users size={16} />
                    </div>
                    <div className={styles.pillTextCol}>
                      <h4 className={styles.pillHeading}>No Fees for Buyers</h4>
                      <p className={styles.pillSub}>Search. Explore. It's Free.</p>
                    </div>
                  </div>

                  <div className={styles.benefitPill}>
                    <div className={styles.pillIconCircle}>
                      <HomeIcon size={16} />
                    </div>
                    <div className={styles.pillTextCol}>
                      <h4 className={styles.pillHeading}>No Fees for Owners</h4>
                      <p className={styles.pillSub}>List Your Property. It's Free.</p>
                    </div>
                  </div>
                </div>

                {/* Circular Glass Trust Card */}
                <div className={`${styles.circularTrustCard} hero-left-animate`}>
                  <div className={styles.trustThumbnails}>
                    <img src={avatars[0]} alt="User Avatar 1" className={styles.trustThumb} />
                    <img src={avatars[1]} alt="User Avatar 2" className={styles.trustThumb} />
                    <img src={avatars[2]} alt="User Avatar 3" className={styles.trustThumb} />
                  </div>
                  <div className={styles.trustRating}>
                    <span>4.9</span>
                    <Star size={18} fill="#F59E0B" stroke="#F59E0B" className={styles.trustStar} />
                  </div>
                  <span className={styles.trustUsers}>from 3,200+ users</span>
                </div>
              </div>

              {/* Right Column: Floating glassmorphic badges overlaid on background villa */}
              <div className={styles.heroRight}>
                <div className={`${styles.floatingBadge} ${styles.badgeVerified} glass-pill-animate`}>
                  <div className={styles.badgeGreenIcon}>
                    <CheckCircle size={14} />
                  </div>
                  <span>Verified Listings</span>
                </div>
                
                <div className={`${styles.floatingBadge} ${styles.badgeContact} glass-pill-animate`}>
                  <div className={styles.badgeGreenIcon}>
                    <MessageSquare size={14} />
                  </div>
                  <span>Direct Owner Contact</span>
                </div>

                <div className={`${styles.floatingBadge} ${styles.badgeProperties} glass-pill-animate`}>
                  <div className={styles.badgeGreenIcon}>
                    <Building size={14} />
                  </div>
                  <span>Wide range of Properties</span>
                </div>
              </div>
            </div>

              {/* Floating Search Bar Container */}
            <div className={`${styles.searchCapsuleContainer} search-capsule-animate`}>
              <form onSubmit={handleSearchSubmit} className={`${styles.premiumSearchBox} ${(isCategoryOpen || isCommercialTradeOpen || isCommercialTypeOpen || isPlotsTypeOpen || isPlotsTradeOpen || isProjectTypeOpen) ? styles.premiumSearchBoxDropdownOpen : ''}`}>
                
                {/* 1. First Row: Tabs */}
                <div className={styles.searchTabsRow}>
                  <div className={styles.searchTabsLeft}>
                    {['Buy', 'Rent', 'New Launch', 'Commercial', 'Plots/Land', 'Projects'].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`${styles.searchTabItem} ${activeTab === tab ? styles.searchTabActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                      >
                        {tab}
                        {tab === 'New Launch' && <span className={styles.tabNotificationDot} />}
                      </button>
                    ))}
                  </div>

                  <div className={styles.searchTabsRight}>
                    {/* Vertical separator before Post Property */}
                    <div className={styles.tabsSeparator} />
                    <a href="/post-property" className={styles.postPropertyTab}>
                      Post Property <span className={styles.freeBadge}>FREE</span>
                    </a>
                  </div>
                </div>

                {/* 2. Second Row: Inputs */}
                <div className={styles.searchInputsRow}>
                  {activeTab === 'New Launch' ? (
                    <div className={styles.staticPane}>
                      <span>Residential</span>
                    </div>
                  ) : activeTab === 'Commercial' ? (
                    <>
                      {/* First Dropdown: Buy / Lease / Invest */}
                      <div className={styles.categorySelectWrapper} ref={commercialTradeMenuRef}>
                        <button
                          type="button"
                          className={styles.categorySelectPane}
                          onClick={() => {
                            setIsCommercialTradeOpen(!isCommercialTradeOpen);
                            setIsCommercialTypeOpen(false);
                          }}
                        >
                          <span>{commercialTrade}</span>
                          <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isCommercialTradeOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                        </button>
                        {isCommercialTradeOpen && (
                          <div className={styles.categoryDropdown}>
                            {commercialActiveView === 'main' ? (
                              <div style={{ padding: '20px 24px' }}>
                                {/* Radio Group */}
                                <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                                  {['Buy', 'Lease', 'Invest'].map((t) => (
                                    <label key={t} className={styles.radioLabel}>
                                      <input
                                        type="radio"
                                        name="commercialTrade"
                                        checked={commercialTrade === t}
                                        onChange={() => {
                                          setCommercialTrade(t as any);
                                          if (t === 'Invest') {
                                            setCommercialType('All Commercial');
                                          } else if (t === 'Lease') {
                                            setCommercialType('Office Spaces');
                                          } else if (t === 'Buy') {
                                            setCommercialType('All Commercial');
                                          }
                                        }}
                                        className={styles.radioInput}
                                      />
                                      <span className={styles.radioText}>{t}</span>
                                    </label>
                                  ))}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '16px', textAlign: 'left' }}>
                                  Looking to invest?{' '}
                                  <button
                                    type="button"
                                    className={styles.commercialLinkButton}
                                    onClick={() => {
                                      setCommercialTrade('Invest');
                                      setCommercialType('All Commercial');
                                    }}
                                  >
                                    Click here
                                  </button>
                                </div>

                                <div className={styles.dropdownDivider} style={{ margin: '0 -24px 16px -24px' }} />

                                {/* Pills */}
                                {renderCommercialPills()}
                              </div>
                            ) : (
                              renderCommercialSubView()
                            )}
                          </div>
                        )}
                      </div>

                      {/* Only render Second Dropdown if not Invest */}
                      {commercialTrade !== 'Invest' && (
                        <>
                          <div className={styles.verticalDivider} />

                          {/* Second Dropdown: All Commercial */}
                          <div className={styles.categorySelectWrapper} ref={commercialTypeMenuRef}>
                            <button
                              type="button"
                              className={styles.categorySelectPane}
                              onClick={() => {
                                setIsCommercialTypeOpen(!isCommercialTypeOpen);
                                setIsCommercialTradeOpen(false);
                              }}
                            >
                              <span>{commercialType}</span>
                              <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isCommercialTypeOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                            </button>
                            {isCommercialTypeOpen && (
                              <div className={styles.categoryDropdown} style={{ minWidth: commercialTrade === 'Buy' ? '640px' : '480px' }}>
                                {commercialActiveView === 'main' ? (
                                  <div style={{ padding: '20px 24px' }}>
                                    
                                    {commercialTrade === 'Buy' ? (
                                      /* --- TWO COLUMN BUY LAYOUT --- */
                                      <div style={{ display: 'flex', gap: '32px', marginBottom: '20px' }}>
                                        {/* Left Column: Property Types (65% width) */}
                                        <div style={{ flex: '0 0 65%' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                            <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>Property Types</strong>
                                            <button
                                              type="button"
                                              className={styles.categoryClearBtn}
                                              onClick={() => setSelectedBuySubtypes(new Set())}
                                            >
                                              Clear
                                            </button>
                                          </div>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', textAlign: 'left' }}>
                                            {[
                                              'Ready to move offices',
                                              'Shops & Retail',
                                              'Agricultural/Farm Land',
                                              'Warehouse',
                                              'Factory & Manufacturing',
                                              'Others',
                                              'Bare shell offices',
                                              'Commercial/Inst. Land',
                                              'Industrial Land/Plots',
                                              'Cold Storage',
                                              'Hotel/Resorts'
                                            ].map((sub) => {
                                              const isChecked = selectedBuySubtypes.has(sub);
                                              return (
                                                <label key={sub} className={styles.categoryCheckboxLabel}>
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                      setSelectedBuySubtypes(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(sub)) next.delete(sub);
                                                        else next.add(sub);
                                                        return next;
                                                      });
                                                    }}
                                                    className={styles.categoryCheckbox}
                                                  />
                                                  <span className={styles.categoryCheckboxCustom}>
                                                    {isChecked && (
                                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                    )}
                                                  </span>
                                                  <span className={styles.categoryCheckboxText}>{sub}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>

                                        {/* Right Column: Investment Options (35% width) */}
                                        <div style={{ flex: '0 0 35%', borderLeft: '1px solid #E2E8F0', paddingLeft: '24px', textAlign: 'left' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                            <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>Investment Options</strong>
                                            <span style={{ backgroundColor: '#FFF1F2', color: '#E11D48', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>New</span>
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {[
                                              'Pre Leased Spaces',
                                              'Food Courts',
                                              'Restaurants',
                                              'Multiplexes',
                                              'SCO Plots',
                                              'Co-working',
                                              'Business Center'
                                            ].map((inv) => {
                                              const isChecked = selectedBuyInvestmentOptions.has(inv);
                                              return (
                                                <label key={inv} className={styles.categoryCheckboxLabel}>
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                      setSelectedBuyInvestmentOptions(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(inv)) next.delete(inv);
                                                        else next.add(inv);
                                                        return next;
                                                      });
                                                    }}
                                                    className={styles.categoryCheckbox}
                                                  />
                                                  <span className={styles.categoryCheckboxCustom}>
                                                    {isChecked && (
                                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                    )}
                                                  </span>
                                                  <span className={styles.categoryCheckboxText}>{inv}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      /* --- STANDARD LEASE LAYOUT --- */
                                      <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                          <strong style={{ fontSize: '0.95rem', color: '#1E293B' }}>Property Types</strong>
                                          <button
                                            type="button"
                                            className={styles.categoryClearBtn}
                                            onClick={() => setCommercialType('All Commercial')}
                                          >
                                            Clear
                                          </button>
                                        </div>

                                        {/* Radio Group for Property Types */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px', marginBottom: '20px' }}>
                                          {[
                                            { label: 'Office Spaces', value: 'Office Spaces' },
                                            { label: 'Shops & Retail', value: 'Shops & Retail' },
                                            { label: 'Other commercial spaces', value: 'Other commercial spaces' },
                                            { label: 'Factory & Manufacturing', value: 'Factory & Manufacturing' }
                                          ].map((pt) => (
                                            <label key={pt.value} className={styles.radioLabel}>
                                              <input
                                                type="radio"
                                                name="commercialType"
                                                checked={commercialType === pt.value}
                                                onChange={() => setCommercialType(pt.value)}
                                                className={styles.radioInput}
                                              />
                                              <span className={styles.radioText}>{pt.label}</span>
                                            </label>
                                          ))}
                                        </div>

                                        {/* Office Space Types (only if Office Spaces is selected) */}
                                        {commercialType === 'Office Spaces' && (
                                          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                            <h5 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B', marginBottom: '12px', textAlign: 'left' }}>
                                              Office space type <span style={{ color: 'red' }}>*</span>
                                            </h5>
                                            <div style={{ display: 'flex', gap: '20px' }}>
                                              {[
                                                'Ready to move offices',
                                                'Bare shell offices',
                                                'Co-working office space'
                                              ].map((ost) => (
                                                <label key={ost} className={styles.radioLabel}>
                                                  <input
                                                    type="radio"
                                                    name="officeSpaceType"
                                                    checked={officeSpaceType === ost}
                                                    onChange={() => setOfficeSpaceType(ost)}
                                                    className={styles.radioInput}
                                                  />
                                                  <span className={styles.radioText}>{ost}</span>
                                                </label>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Footers */}
                                    <div style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', textAlign: 'left' }}>
                                      <div>
                                        Looking for residential properties?{' '}
                                        <button
                                          type="button"
                                          className={styles.commercialLinkButton}
                                          onClick={() => {
                                            setActiveTab('Buy');
                                            setIsCommercialTypeOpen(false);
                                          }}
                                        >
                                          Click here
                                        </button>
                                      </div>
                                      <div>
                                        Looking to invest?{' '}
                                        <button
                                          type="button"
                                          className={styles.commercialLinkButton}
                                          onClick={() => {
                                            setCommercialTrade('Invest');
                                            setCommercialType('All Commercial');
                                            setIsCommercialTypeOpen(false);
                                            setIsCommercialTradeOpen(true);
                                          }}
                                        >
                                          Click here
                                        </button>
                                      </div>
                                    </div>

                                    <div className={styles.dropdownDivider} style={{ margin: '0 -24px 16px -24px' }} />

                                    {/* Filter Pills */}
                                    {renderCommercialPills()}
                                  </div>
                                ) : (
                                  renderCommercialSubView()
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  ) : activeTab === 'Plots/Land' ? (
                    <>
                      {/* Trade Dropdown (Only if Plots Type is Commercial) */}
                      {plotsType === 'Commercial' && (
                        <div className={styles.categorySelectWrapper} ref={plotsTradeMenuRef}>
                          <button
                            type="button"
                            className={styles.categorySelectPane}
                            onClick={() => {
                              setIsPlotsTradeOpen(!isPlotsTradeOpen);
                              setIsPlotsTypeOpen(false);
                            }}
                          >
                            <span>{plotsTrade}</span>
                            <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isPlotsTradeOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                          </button>
                          {isPlotsTradeOpen && (
                            <div className={styles.categoryDropdown}>
                              <div style={{ padding: '20px 24px' }}>
                                {/* Radio group for plots trade */}
                                <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                                  {['Buy', 'Lease', 'Invest'].map((t) => (
                                    <label key={t} className={styles.radioLabel}>
                                      <input
                                        type="radio"
                                        name="plotsTrade"
                                        checked={plotsTrade === t}
                                        onChange={() => setPlotsTrade(t as any)}
                                        className={styles.radioInput}
                                      />
                                      <span className={styles.radioText}>{t}</span>
                                    </label>
                                  ))}
                                </div>
                                <div className={styles.dropdownDivider} style={{ margin: '0 -24px 16px -24px' }} />
                                {/* Bottom pills for plots/land */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <button
                                    type="button"
                                    className={styles.filterPill}
                                    onClick={() => setCommercialActiveView('budget')}
                                  >
                                    Budget <ChevronDown size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.filterPill}
                                    onClick={() => setCommercialActiveView('area')}
                                  >
                                    Area <ChevronDown size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.filterPill}
                                    onClick={() => setCommercialActiveView('postedby')}
                                  >
                                    Posted By <ChevronDown size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {plotsType === 'Commercial' && <div className={styles.verticalDivider} />}

                      {/* Plots/Land Type Dropdown */}
                      <div className={styles.categorySelectWrapper} ref={plotsTypeMenuRef}>
                        <button
                          type="button"
                          className={styles.categorySelectPane}
                          onClick={() => {
                            setIsPlotsTypeOpen(!isPlotsTypeOpen);
                            setIsPlotsTradeOpen(false);
                          }}
                        >
                          <span>{plotsType === 'Residential' ? 'Residential Plots/Land' : 'Commercial Plots/Land'}</span>
                          <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isPlotsTypeOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                        </button>
                        {isPlotsTypeOpen && (
                          <div className={styles.categoryDropdown}>
                            <div style={{ padding: '20px 24px' }}>
                              <strong style={{ display: 'block', fontSize: '0.95rem', color: '#1E293B', marginBottom: '14px', textAlign: 'left' }}>Plots/Land</strong>
                              {/* Radios to choose Residential or Commercial */}
                              <div style={{ display: 'flex', gap: '24px', marginBottom: plotsType === 'Commercial' ? '20px' : '16px' }}>
                                <label className={styles.radioLabel}>
                                  <input
                                    type="radio"
                                    name="plotsType"
                                    checked={plotsType === 'Residential'}
                                    onChange={() => setPlotsType('Residential')}
                                    className={styles.radioInput}
                                  />
                                  <span className={styles.radioText}>Residential Plots/Land</span>
                                </label>
                                <label className={styles.radioLabel}>
                                  <input
                                    type="radio"
                                    name="plotsType"
                                    checked={plotsType === 'Commercial'}
                                    onChange={() => setPlotsType('Commercial')}
                                    className={styles.radioInput}
                                  />
                                  <span className={styles.radioText}>Commercial Plots/Land</span>
                                </label>
                              </div>

                              {/* Commercial Sub-types (Checkboxes, only shown if Plots Type is Commercial) */}
                              {plotsType === 'Commercial' && (
                                <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
                                  {[
                                    'Agricultural / Farm Land',
                                    'Industrial Plots/Land',
                                    'Commercial / Inst. Land'
                                  ].map((sub) => {
                                    const isChecked = selectedPlotsSubtypes.has(sub);
                                    return (
                                      <label key={sub} className={styles.categoryCheckboxLabel}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            setSelectedPlotsSubtypes(prev => {
                                              const next = new Set(prev);
                                              if (next.has(sub)) next.delete(sub);
                                              else next.add(sub);
                                              return next;
                                            });
                                          }}
                                          className={styles.categoryCheckbox}
                                        />
                                        <span className={styles.categoryCheckboxCustom}>
                                          {isChecked && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                          )}
                                        </span>
                                        <span className={styles.categoryCheckboxText}>{sub}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              <div className={styles.dropdownDivider} style={{ margin: '0 -24px 16px -24px' }} />
                              {/* Bottom pills */}
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                  type="button"
                                  className={styles.filterPill}
                                  onClick={() => setCommercialActiveView('budget')}
                                >
                                  Budget <ChevronDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.filterPill}
                                  onClick={() => setCommercialActiveView('area')}
                                >
                                  Area <ChevronDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.filterPill}
                                  onClick={() => setCommercialActiveView('postedby')}
                                >
                                  Posted By <ChevronDown size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : activeTab === 'Projects' ? (
                    <div className={styles.categorySelectWrapper} ref={projectMenuRef}>
                      <button
                        type="button"
                        className={styles.categorySelectPane}
                        onClick={() => setIsProjectTypeOpen(!isProjectTypeOpen)}
                      >
                        <span>{projectType}</span>
                        <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isProjectTypeOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                      </button>
                      {isProjectTypeOpen && (
                        <div className={styles.categoryDropdown}>
                          <div style={{ padding: '20px 24px' }}>
                            <strong style={{ display: 'block', fontSize: '0.95rem', color: '#1E293B', marginBottom: '14px', textAlign: 'left' }}>{projectType}</strong>
                            
                            {/* Checkboxes for Project status */}
                            <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                              {['New Launch', 'Under Construction', 'Ready to move'].map((status) => {
                                const isChecked = selectedProjectStatuses.has(status);
                                return (
                                  <label key={status} className={styles.categoryCheckboxLabel}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setSelectedProjectStatuses(prev => {
                                          const next = new Set(prev);
                                          if (next.has(status)) next.delete(status);
                                          else next.add(status);
                                          return next;
                                        });
                                      }}
                                      className={styles.categoryCheckbox}
                                    />
                                    <span className={styles.categoryCheckboxCustom}>
                                      {isChecked && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                      )}
                                    </span>
                                    <span className={styles.categoryCheckboxText}>{status}</span>
                                  </label>
                                );
                              })}
                            </div>

                            {/* Footer link to toggle residential/commercial project */}
                            <div style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '16px', textAlign: 'left' }}>
                              {projectType === 'Residential Project' ? (
                                <>
                                  Looking for commercial projects ?{' '}
                                  <button
                                    type="button"
                                    className={styles.commercialLinkButton}
                                    onClick={() => setProjectType('Commercial Project')}
                                  >
                                    Click here
                                  </button>
                                </>
                              ) : (
                                <>
                                  Looking for residential projects ?{' '}
                                  <button
                                    type="button"
                                    className={styles.commercialLinkButton}
                                    onClick={() => setProjectType('Residential Project')}
                                  >
                                    Click here
                                  </button>
                                </>
                              )}
                            </div>

                            <div className={styles.dropdownDivider} style={{ margin: '0 -24px 16px -24px' }} />
                            {/* Bottom pills for projects */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                type="button"
                                className={styles.filterPill}
                                onClick={() => setCommercialActiveView('budget')}
                              >
                                Budget <ChevronDown size={14} />
                              </button>
                              <button
                                type="button"
                                className={styles.filterPill}
                                onClick={() => setCommercialActiveView('postedby')}
                              >
                                Posted By <ChevronDown size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Category Dropdown with Checkbox Panel & Nested Sub-filters */
                    <div className={styles.categorySelectWrapper} ref={categoryMenuRef}>
                      <button
                        type="button"
                        className={styles.categorySelectPane}
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      >
                        <span>{categoryLabel}</span>
                        <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isCategoryOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                      </button>
                      {isCategoryOpen && (
                        <div className={styles.categoryDropdown}>
                          {activeDropdownView === 'main' ? (
                            <>
                              {/* Main Checkboxes View */}
                              <div className={styles.categoryDropdownHeader}>
                                <span className={styles.categoryDropdownTitle}>Property Type</span>
                                <button
                                  type="button"
                                  className={styles.categoryClearBtn}
                                  onClick={() => setCheckedCategories(new Set())}
                                >
                                  Clear
                                </button>
                              </div>
                              <div className={styles.categoryCheckboxGrid}>
                                {Array.from(defaultCategories).map((cat) => (
                                  <label key={cat} className={styles.categoryCheckboxLabel}>
                                    <input
                                      type="checkbox"
                                      checked={checkedCategories.has(cat)}
                                      onChange={() => toggleCategory(cat)}
                                      className={styles.categoryCheckbox}
                                    />
                                    <span className={styles.categoryCheckboxCustom}>
                                      {checkedCategories.has(cat) && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                      )}
                                    </span>
                                    <span className={styles.categoryCheckboxText}>{cat}</span>
                                  </label>
                                ))}
                              </div>
                              <div className={styles.categoryDropdownFooter}>
                                Looking for commercial properties?{' '}
                                <button
                                  type="button"
                                  className={styles.commercialLinkButton}
                                  onClick={() => {
                                    setActiveTab('Commercial');
                                    setIsCategoryOpen(false);
                                  }}
                                >
                                  Click here
                                </button>
                              </div>

                              {/* Main Pills Row inside Dropdown */}
                              <div className={styles.dropdownDivider} />
                              <div className={styles.dropdownPillsRow}>
                                <button
                                  type="button"
                                  className={styles.filterPill}
                                  onClick={() => setActiveDropdownView('budget')}
                                >
                                  Budget <ChevronDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.filterPill}
                                  onClick={() => setActiveDropdownView('bedroom')}
                                >
                                  Bedroom <ChevronDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.filterPill}
                                  onClick={() => setActiveDropdownView('construction')}
                                >
                                  Construction Status <ChevronDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.filterPill}
                                  onClick={() => setActiveDropdownView('postedby')}
                                >
                                  Posted By <ChevronDown size={14} />
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Sub-filter View (e.g. Budget, Bedrooms, etc.) */}
                              <div className={styles.subViewHeader}>
                                <button
                                  type="button"
                                  className={styles.backButton}
                                  onClick={() => setActiveDropdownView('main')}
                                >
                                  <ArrowLeft size={16} />
                                  <span>Back</span>
                                </button>

                                <div className={styles.subViewPills}>
                                  <button
                                    type="button"
                                    className={`${styles.filterPill} ${activeDropdownView === 'budget' ? styles.filterPillActive : ''}`}
                                    onClick={() => setActiveDropdownView('budget')}
                                  >
                                    Budget <ChevronDown size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.filterPill} ${activeDropdownView === 'bedroom' ? styles.filterPillActive : ''}`}
                                    onClick={() => setActiveDropdownView('bedroom')}
                                  >
                                    Bedroom <ChevronDown size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.filterPill} ${activeDropdownView === 'construction' ? styles.filterPillActive : ''}`}
                                    onClick={() => setActiveDropdownView('construction')}
                                  >
                                    Construction Status <ChevronDown size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className={`${styles.filterPill} ${activeDropdownView === 'postedby' ? styles.filterPillActive : ''}`}
                                    onClick={() => setActiveDropdownView('postedby')}
                                  >
                                    Posted By <ChevronDown size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className={styles.subViewContent}>
                                {activeDropdownView === 'budget' && (
                                  <div className={styles.subViewPanel}>
                                    <div className={styles.budgetHeader}>
                                      <strong>Select Price Range</strong>
                                      <span className={styles.budgetSubtext}>{budgetRange[0]} - {budgetRange[1] >= 100 ? '100+' : budgetRange[1]} Crore</span>
                                    </div>
                                    <div className={styles.budgetSliderContainer}>
                                      <span className={styles.budgetLabel}>{budgetRange[0]}</span>
                                      <div className={styles.budgetSliderTrack}>
                                        <input
                                          type="range"
                                          min={0}
                                          max={100}
                                          value={budgetRange[0]}
                                          onChange={(e) => setBudgetRange([Math.min(Number(e.target.value), budgetRange[1] - 1), budgetRange[1]])}
                                          className={styles.budgetRangeInput}
                                        />
                                        <input
                                          type="range"
                                          min={0}
                                          max={100}
                                          value={budgetRange[1]}
                                          onChange={(e) => setBudgetRange([budgetRange[0], Math.max(Number(e.target.value), budgetRange[0] + 1)])}
                                          className={styles.budgetRangeInput}
                                        />
                                      </div>
                                      <span className={styles.budgetLabel}>100+ Crores</span>
                                    </div>
                                  </div>
                                )}

                                {activeDropdownView === 'bedroom' && (
                                  <div className={styles.subViewPanel}>
                                    <h4 className={styles.subViewPanelTitle}>Number of Bedrooms</h4>
                                    <div className={styles.subViewPanelOptions}>
                                      {[
                                        { label: '1 RK/1 BHK', value: '1' },
                                        { label: '2 BHK', value: '2' },
                                        { label: '3 BHK', value: '3' },
                                        { label: '4 BHK', value: '4' },
                                        { label: '4+ BHK', value: '5' }
                                      ].map((opt) => {
                                        const isActive = selectedBedrooms === opt.value;
                                        return (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            className={`${styles.subViewOption} ${isActive ? styles.subViewOptionActive : ''}`}
                                            onClick={() => setSelectedBedrooms(isActive ? 'Any' : opt.value)}
                                          >
                                            <span style={{ fontWeight: 800 }}>{isActive ? '✓' : '+'}</span>
                                            <span>{opt.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {activeDropdownView === 'construction' && (
                                  <div className={styles.subViewPanel}>
                                    <h4 className={styles.subViewPanelTitle}>Construction Status</h4>
                                    <div className={styles.subViewPanelOptions}>
                                      {[
                                        { label: 'New Launch', value: 'New Launch' },
                                        { label: 'Under Construction', value: 'Under Construction' },
                                        { label: 'Ready to move', value: 'Ready to Move' }
                                      ].map((opt) => {
                                        const isActive = selectedConstructionStatus === opt.value;
                                        return (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            className={`${styles.subViewOption} ${isActive ? styles.subViewOptionActive : ''}`}
                                            onClick={() => setSelectedConstructionStatus(isActive ? 'Any' : opt.value)}
                                          >
                                            <span style={{ fontWeight: 800 }}>{isActive ? '✓' : '+'}</span>
                                            <span>{opt.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {activeDropdownView === 'postedby' && (
                                  <div className={styles.subViewPanel}>
                                    <h4 className={styles.subViewPanelTitle}>Posted By</h4>
                                    <div className={styles.subViewPanelOptions}>
                                      {[
                                        { label: 'Owner', value: 'Owner' },
                                        { label: 'Dealer', value: 'Dealer' },
                                        { label: 'Builder', value: 'Builder' }
                                      ].map((opt) => {
                                        const isActive = selectedPostedBy === opt.value;
                                        return (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            className={`${styles.subViewOption} ${isActive ? styles.subViewOptionActive : ''}`}
                                            onClick={() => setSelectedPostedBy(isActive ? 'Any' : opt.value)}
                                          >
                                            <span style={{ fontWeight: 800 }}>{isActive ? '✓' : '+'}</span>
                                            <span>{opt.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.verticalDivider} />

                  {/* Search Query Pane */}
                  <div className={styles.searchQueryPane}>
                    <Search size={20} className={styles.searchQueryIcon} />
                    <input
                      type="text"
                      className={styles.searchQueryInput}
                      placeholder='Search "3 BHK for sale in Mumbai"'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className={styles.actionsGroup}>
                    {/* Locate Button with tooltip */}
                    <div className={styles.tooltipWrapper}>
                      <button
                        type="button"
                        onClick={handleLocateMe}
                        className={styles.actionCircleBtn}
                      >
                        <Navigation size={18} />
                      </button>
                      <div className={styles.tooltip}>
                        <Navigation size={14} style={{ flexShrink: 0 }} /> Search <strong>Near Me</strong>
                      </div>
                    </div>

                    {/* Voice search Button with tooltip */}
                    <div className={styles.tooltipWrapper}>
                      <button
                        type="button"
                        onClick={handleVoiceSearch}
                        className={styles.actionCircleBtn}
                      >
                        <Mic size={18} />
                      </button>
                      <div className={styles.tooltip}>
                        <Mic size={14} style={{ flexShrink: 0 }} /> Search by <strong>Voice</strong> <span className={styles.newBadge}>NEW</span>
                      </div>
                    </div>

                    {/* Search Button */}
                    <button type="submit" className={styles.solidBlueSearchBtn}>
                      Search
                    </button>
                  </div>
                </div>

              </form>

              {/* Trust indicators below search bar */}
              <div className={`${styles.bottomTrustStrip} bottom-trust-strip-animate`}>
                <div className={styles.stripCol}>
                  <div className={styles.stripIconCircle}>
                    <Tag size={14} />
                  </div>
                  <span className={styles.stripTitle}>100% Free for Buyers</span>
                </div>

                <div className={styles.stripDivider} />

                <div className={styles.stripCol}>
                  <div className={styles.stripIconCircle}>
                    <ArrowUp size={14} />
                  </div>
                  <span className={styles.stripTitle}>100% Free for Owners</span>
                </div>

                <div className={styles.stripDivider} />

                <div className={styles.stripCol}>
                  <div className={styles.stripIconCircle}>
                    <ShieldCheck size={14} />
                  </div>
                  <span className={styles.stripTitle}>Safe & Secure</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* --- Dynamic Categories Section --- */}
        <section className={styles.section} style={{ backgroundColor: 'var(--color-bg)', paddingTop: '4rem', paddingBottom: '2rem' }}>
          <div className="container">
            <div className={`${styles.featuredHeader} animate-fade-in`}>
              <div>
                <h2 className={styles.featuredTitle}>
                  Apartments, Villas & more
                </h2>
                <div className={styles.citySubtitle}>
                  IN <MapPin size={16} className={styles.citySubtitleIcon} /> <span className={styles.cityNameBold}>{searchLocation ? searchLocation.toUpperCase() : 'YOUR LOCATION'}</span>
                </div>
              </div>
              <div className={styles.scrollButtons}>
                <button className={styles.scrollBtn} onClick={() => scrollCategories('left')} aria-label="Scroll Left">
                  <ChevronLeft size={20} />
                </button>
                <button className={styles.scrollBtn} onClick={() => scrollCategories('right')} aria-label="Scroll Right">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div 
              className={`${styles.typesGrid} animate-fade-in`} 
              ref={categoriesRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              style={{ cursor: isDown ? 'grabbing' : 'grab', userSelect: 'none' }}
            >
              {/* 1. Apartments */}
              <div 
                className={styles.typeCard}
                onClick={() => {
                  if (dragged) return;
                  const url = searchLocation
                    ? `/listings?city=${encodeURIComponent(searchLocation)}&property_type=APARTMENT`
                    : '/listings?property_type=APARTMENT';
                  router.push(url);
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80" 
                  alt="Apartments" 
                  className={styles.typeCardImg}
                  draggable="false"
                />
                <div className={styles.typeCardOverlay} />
                <div className={styles.typeCardContent}>
                  <h3 className={styles.typeCardTitle}>Residential Apartments</h3>
                  <span className={styles.typeCardCount}>
                    {cityTrends?.counts?.apartments || 12}+ Properties
                  </span>
                </div>
              </div>

              {/* 2. Builder Floor */}
              <div 
                className={styles.typeCard}
                onClick={() => {
                  if (dragged) return;
                  const url = searchLocation
                    ? `/listings?city=${encodeURIComponent(searchLocation)}&property_type=BUILDER_FLOOR`
                    : '/listings?property_type=BUILDER_FLOOR';
                  router.push(url);
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" 
                  alt="Builder Floor" 
                  className={styles.typeCardImg}
                  draggable="false"
                />
                <div className={styles.typeCardOverlay} />
                <div className={styles.typeCardContent}>
                  <h3 className={styles.typeCardTitle}>Builder Floor</h3>
                  <span className={styles.typeCardCount}>
                    {cityTrends?.counts?.builderFloors || 8}+ Properties
                  </span>
                </div>
              </div>

              {/* 3. Residential Land */}
              <div 
                className={styles.typeCard}
                onClick={() => {
                  if (dragged) return;
                  const url = searchLocation
                    ? `/listings?city=${encodeURIComponent(searchLocation)}&property_type=PLOT`
                    : '/listings?property_type=PLOT';
                  router.push(url);
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80" 
                  alt="Land/Plots" 
                  className={styles.typeCardImg}
                  draggable="false"
                />
                <div className={styles.typeCardOverlay} />
                <div className={styles.typeCardContent}>
                  <h3 className={styles.typeCardTitle}>Residential Land</h3>
                  <span className={styles.typeCardCount}>
                    {cityTrends?.counts?.plots || 4}+ Properties
                  </span>
                </div>
              </div>

              {/* 4. Independent House/Villa */}
              <div 
                className={styles.typeCard}
                onClick={() => {
                  if (dragged) return;
                  const url = searchLocation
                    ? `/listings?city=${encodeURIComponent(searchLocation)}&property_type=VILLA`
                    : '/listings?property_type=VILLA';
                  router.push(url);
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80" 
                  alt="Villas" 
                  className={styles.typeCardImg}
                  draggable="false"
                />
                <div className={styles.typeCardOverlay} />
                <div className={styles.typeCardContent}>
                  <h3 className={styles.typeCardTitle}>Independent House/Villa</h3>
                  <span className={styles.typeCardCount}>
                    {cityTrends?.counts?.villas || 6}+ Properties
                  </span>
                </div>
              </div>

              {/* 5. 1 RK/ Studio Apartment */}
              <div 
                className={styles.typeCard}
                onClick={() => {
                  if (dragged) return;
                  const url = searchLocation
                    ? `/listings?city=${encodeURIComponent(searchLocation)}&property_type=STUDIO`
                    : '/listings?property_type=STUDIO';
                  router.push(url);
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80" 
                  alt="Studio" 
                  className={styles.typeCardImg}
                  draggable="false"
                />
                <div className={styles.typeCardOverlay} />
                <div className={styles.typeCardContent}>
                  <h3 className={styles.typeCardTitle}>1 RK / Studio Apt</h3>
                  <span className={styles.typeCardCount}>
                    {cityTrends?.counts?.studios || 5}+ Properties
                  </span>
                </div>
              </div>

              {/* 6. Serviced Apartments */}
              <div 
                className={styles.typeCard}
                onClick={() => {
                  if (dragged) return;
                  const url = searchLocation
                    ? `/listings?city=${encodeURIComponent(searchLocation)}&property_type=PENTHOUSE`
                    : '/listings?property_type=PENTHOUSE';
                  router.push(url);
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80" 
                  alt="Serviced Apartments" 
                  className={styles.typeCardImg}
                  draggable="false"
                />
                <div className={styles.typeCardOverlay} />
                <div className={styles.typeCardContent}>
                  <h3 className={styles.typeCardTitle}>Serviced Apartments</h3>
                  <span className={styles.typeCardCount}>
                    {cityTrends?.counts?.serviced || 3}+ Properties
                  </span>
                </div>
              </div>

              {/* 7. Farmhouse */}
              <div 
                className={styles.typeCard}
                onClick={() => {
                  if (dragged) return;
                  const url = searchLocation
                    ? `/listings?city=${encodeURIComponent(searchLocation)}&property_type=FARM_HOUSE`
                    : '/listings?property_type=FARM_HOUSE';
                  router.push(url);
                }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=800&q=80" 
                  alt="Farmhouse" 
                  className={styles.typeCardImg}
                  draggable="false"
                />
                <div className={styles.typeCardOverlay} />
                <div className={styles.typeCardContent}>
                  <h3 className={styles.typeCardTitle}>Farmhouse</h3>
                  <span className={styles.typeCardCount}>
                    {cityTrends?.counts?.farmhouses || 2}+ Properties
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- Featured Properties Section --- */}
        <section className={styles.section} id="featured-grid">
          <div className="container">
            {/* Section Header */}
            <div className={styles.featuredHeader}>
              <div className={styles.featuredHeaderLeft}>
                <span className={styles.sectionEyebrow}>Featured Properties</span>
                <h2 className={styles.featuredTitle}>Handpicked Properties For You</h2>
                <div className={styles.citySubtitle}>
                  IN <MapPin size={16} className={styles.citySubtitleIcon} /> <span className={styles.cityNameBold}>{searchLocation ? searchLocation.toUpperCase() : 'YOUR LOCATION'}</span>
                </div>
              </div>
              <div className={styles.featuredHeaderRight}>
                <Button 
                  href={searchLocation ? `/listings?city=${encodeURIComponent(searchLocation)}` : '/listings'} 
                  variant="outline" 
                  className={styles.viewAllBtn}
                >
                  View All Properties <span className={styles.arrow}>→</span>
                </Button>
              </div>
            </div>

            {/* BHK & Possession Capsules Row */}
            <div className={`${styles.filterBannersRow} animate-fade-in`}>
              <div className={styles.capsuleGroup}>
                <span className={styles.capsuleLabel}>
                  <Building2 size={16} /> Bedrooms:
                </span>
                <div className={styles.capsuleRow}>
                  <button
                    onClick={() => setSelectedBhk('ALL')}
                    className={`${styles.capsuleBtn} ${selectedBhk === 'ALL' ? styles.capsuleBtnActive : ''}`}
                  >
                    All BHKs
                  </button>
                  <button
                    onClick={() => setSelectedBhk('1')}
                    className={`${styles.capsuleBtn} ${selectedBhk === '1' ? styles.capsuleBtnActive : ''}`}
                  >
                    1 BHK
                  </button>
                  <button
                    onClick={() => setSelectedBhk('2')}
                    className={`${styles.capsuleBtn} ${selectedBhk === '2' ? styles.capsuleBtnActive : ''}`}
                  >
                    2 BHK
                  </button>
                  <button
                    onClick={() => setSelectedBhk('3')}
                    className={`${styles.capsuleBtn} ${selectedBhk === '3' ? styles.capsuleBtnActive : ''}`}
                  >
                    3 BHK
                  </button>
                  <button
                    onClick={() => setSelectedBhk('4')}
                    className={`${styles.capsuleBtn} ${selectedBhk === '4' ? styles.capsuleBtnActive : ''}`}
                  >
                    4+ BHK
                  </button>
                </div>
              </div>

              <div className={styles.capsuleGroup} style={{ marginTop: '12px' }}>
                <span className={styles.capsuleLabel}>
                  <ShieldCheck size={16} /> Possession:
                </span>
                <div className={styles.capsuleRow}>
                  <button
                    onClick={() => setSelectedPossession('ALL')}
                    className={`${styles.capsuleBtn} ${selectedPossession === 'ALL' ? styles.capsuleBtnActive : ''}`}
                  >
                    Any Status
                  </button>
                  <button
                    onClick={() => setSelectedPossession('READY')}
                    className={`${styles.capsuleBtn} ${selectedPossession === 'READY' ? styles.capsuleBtnActive : ''}`}
                  >
                    Ready To Move
                  </button>
                  <button
                    onClick={() => setSelectedPossession('UNDER_CONSTRUCTION')}
                    className={`${styles.capsuleBtn} ${selectedPossession === 'UNDER_CONSTRUCTION' ? styles.capsuleBtnActive : ''}`}
                  >
                    Under Construction
                  </button>
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            <div className={styles.listingsGrid}>
              {displayedProperties.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  No matching properties found in this location.
                </div>
              ) : (
                displayedProperties.slice(0, 4).map((prop) => {
                  const isRent = prop.tag === 'For Rent';
                  const isFav = !!favorites[prop.id];
                
                return (
                  <div key={prop.id} className={`${styles.propertyCard} property-card-item`}>
                    {/* Image Wrap */}
                    <div className={styles.cardImageWrap}>
                      <img
                        src={prop.image}
                        alt={prop.title}
                        className={styles.propertyImage}
                      />
                      <span className={`${styles.tagOverlay} ${isRent ? styles.tagRent : styles.tagSale}`}>
                        {prop.tag}
                      </span>
                    </div>

                    {/* Content */}
                    <div className={styles.cardBody}>
                      <div className={styles.priceRow}>
                        <span className={styles.propertyPrice}>{prop.price}</span>
                      </div>
                      <h3 className={styles.propertyTitle}>{prop.title}</h3>
                      
                      <div className={styles.locationRow}>
                        <MapPin size={15} className={styles.locationIcon} />
                        <span className={styles.locationText}>{prop.location}</span>
                      </div>

                      <div className={styles.paramsDivider} />

                      <div className={styles.paramsRow}>
                        <span className={styles.paramItem}>{prop.beds} Beds</span>
                        <span className={styles.paramSep}>|</span>
                        <span className={styles.paramItem}>{prop.baths} Baths</span>
                        <span className={styles.paramSep}>|</span>
                        <span className={styles.paramItem}>{prop.area}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className={styles.cardFooter}>
                      <div className={styles.verifiedBadge}>
                        <CheckCircle size={15} className={styles.verifiedIcon} />
                        <span>Owner Verified</span>
                      </div>
                      <button 
                        className={`${styles.heartButton} ${isFav ? styles.heartActive : ''}`} 
                        aria-label="Add to shortlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(prop.id);
                        }}
                      >
                        <Heart size={18} fill={isFav ? "currentColor" : "none"} className={styles.heartIcon} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          </div>
        </section>

        {/* --- Demand & Local Trends Section --- */}
        {cityTrends && (
          <section className={styles.section} style={{ backgroundColor: 'var(--color-bg)', paddingTop: '2rem', paddingBottom: '4rem' }}>
            <div className="container">
              <div className={`${styles.featuredHeader} animate-fade-in`}>
                <div>
                  <span className={styles.sectionEyebrow}>Market Insights</span>
                  <h2 className={styles.featuredTitle} style={{ textTransform: 'capitalize' }}>
                    Demand & Local Trends in {searchLocation || 'Your City'}
                  </h2>
                </div>
              </div>

              <div className={`${styles.trendsGrid} animate-fade-in`}>
                {/* Popular Localities (Search Demand) */}
                <div className={styles.trendCard}>
                  <h3 className={styles.trendCardTitle}>
                    <Users size={20} /> Popular Localities
                  </h3>
                  <p className={styles.trendCardSub}>Most searched neighborhoods in the city</p>
                  
                  <div className={styles.demandList}>
                    {cityTrends.localitiesDemand?.map((loc: any, idx: number) => (
                      <div key={idx} className={styles.demandRow}>
                        <div className={styles.demandHeader}>
                          <div>
                            <span className={styles.demandName}>#{idx + 1} {loc.name}</span>
                            <span className={styles.demandType}>({loc.type})</span>
                          </div>
                          <span className={styles.demandVal}>{loc.percentage}% Searches</span>
                        </div>
                        <div className={styles.progressBarBg}>
                          <div 
                            className={styles.progressBarFill} 
                            style={{ width: `${loc.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Trends ( appreciation YoY ) */}
                <div className={styles.trendCard}>
                  <h3 className={styles.trendCardTitle}>
                    <Star size={20} style={{ color: 'var(--color-success)' }} /> Top Gainers
                  </h3>
                  <p className={styles.trendCardSub}>Localities with highest annual price appreciation</p>
                  
                  <table className={styles.trendsTable}>
                    <thead>
                      <tr>
                        <th className={styles.trendsTh}>Locality</th>
                        <th className={styles.trendsTh}>Avg Rate</th>
                        <th className={styles.trendsTh}>YoY Growth</th>
                        <th className={styles.trendsTh}>Trend (6m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cityTrends.priceTrends?.map((trend: any, idx: number) => (
                        <tr key={idx}>
                          <td className={`${styles.trendsTd} ${styles.trendsTdLocality}`}>{trend.locality}</td>
                          <td className={`${styles.trendsTd} ${styles.trendsTdPrice}`}>{trend.rate}</td>
                          <td className={`${styles.trendsTd} ${styles.trendsTdTrend}`}>{trend.yoy}</td>
                          <td className={styles.trendsTd}>
                            <svg className={styles.sparklineSvg} width="60" height="20" viewBox="0 0 60 20">
                              <path 
                                d={`M ${trend.sparkline.map((val: number, i: number) => `${i * 10} ${20 - val}`).join(' L ')}`} 
                              />
                            </svg>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* --- How It Works Section --- */}
        <section className={`${styles.section} ${styles.howItWorksSection}`}>
          <div className={`${styles.howItWorksContainer} container`}>
            {/* Left Column: Heading and Info */}
            <div className={styles.howItWorksLeft}>
              <span className={styles.sectionEyebrow}>How It Works</span>
              <h2 className={styles.howItWorksTitle}>Simple Steps. Smart Moves.</h2>
              <p className={styles.howItWorksSubtitle}>
                ListMe makes finding, visiting, and buying properties extremely easy, direct, and completely broker-free.
              </p>
            </div>

            {/* Right Column: 2x2 Bento Grid */}
            <div className={styles.howItWorksRight}>
              <div className={styles.bentoGrid}>
                
                {/* Step 1 */}
                <div className={`${styles.bentoCard} how-it-works-step`}>
                  <div className={styles.bentoCardHeader}>
                    <span className={styles.stepNumber}>01</span>
                    <div className={styles.stepIconWrap}>
                      <Search size={20} />
                    </div>
                  </div>
                  <h3 className={styles.bentoCardTitle}>Search Properties</h3>
                  <p className={styles.bentoCardText}>
                    Explore listings in your preferred location with advanced filters.
                  </p>
                </div>

                {/* Step 2 */}
                <div className={`${styles.bentoCard} how-it-works-step`}>
                  <div className={styles.bentoCardHeader}>
                    <span className={styles.stepNumber}>02</span>
                    <div className={styles.stepIconWrap}>
                      <MessageSquare size={20} />
                    </div>
                  </div>
                  <h3 className={styles.bentoCardTitle}>Connect Directly</h3>
                  <p className={styles.bentoCardText}>
                    Get in touch with property owners directly. No middlemen.
                  </p>
                </div>

                {/* Step 3 */}
                <div className={`${styles.bentoCard} how-it-works-step`}>
                  <div className={styles.bentoCardHeader}>
                    <span className={styles.stepNumber}>03</span>
                    <div className={styles.stepIconWrap}>
                      <Calendar size={20} />
                    </div>
                  </div>
                  <h3 className={styles.bentoCardTitle}>Visit & Decide</h3>
                  <p className={styles.bentoCardText}>
                    Schedule a visit, explore the property, and make the right decision.
                  </p>
                </div>

                {/* Step 4 */}
                <div className={`${styles.bentoCard} how-it-works-step`}>
                  <div className={styles.bentoCardHeader}>
                    <span className={styles.stepNumber}>04</span>
                    <div className={styles.stepIconWrap}>
                      <HomeIcon size={20} />
                    </div>
                  </div>
                  <h3 className={styles.bentoCardTitle}>Own or Sell Freely</h3>
                  <p className={styles.bentoCardText}>
                    Buy your dream property or list yours for free on ListMe.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Features / Why Choose Us */}
        <section className={styles.whyChooseSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={`${styles.sectionTitle} ${styles.whiteText}`}>Why ListMe is different</h2>
              <p className={`${styles.sectionSubtitle} ${styles.whiteTextSecondary}`}>
                We are not brokers. We are a direct connection platform.
              </p>
            </div>

            <div className={styles.grid}>
              <Card className={`${styles.whyChooseCard} feature-card`} hoverable padding="lg">
                <div style={{ color: 'var(--color-secondary)', marginBottom: '1.25rem' }}>
                  <Building size={32} />
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontWeight: 700 }}>Direct Owner Listings</h3>
                <p>Skip the middleman. All properties are listed directly by owners, eliminating brokerage fees completely.</p>
              </Card>

              <Card className={`${styles.whyChooseCard} feature-card`} hoverable padding="lg">
                <div style={{ color: 'var(--color-secondary)', marginBottom: '1.25rem' }}>
                  <ShieldCheck size={32} />
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontWeight: 700 }}>Verified Phone Numbers</h3>
                <p>Every account is verified via phone OTP. No fake listings, no phantom owners, no spam brokers.</p>
              </Card>

              <Card className={`${styles.whyChooseCard} feature-card`} hoverable padding="lg">
                <div style={{ color: 'var(--color-secondary)', marginBottom: '1.25rem' }}>
                  <Heart size={32} />
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontWeight: 700 }}>Privacy Protection</h3>
                <p>We never display your phone number publicly. Seekers express interest, and the connection remains secure.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={`${styles.section} ${styles.statsSection}`}>
          <div className="container">
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statVal}>100%</div>
                <div className={styles.statLabel}>Free Platform</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statVal}>₹0</div>
                <div className={styles.statLabel}>Brokerage Charged</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statVal}>50k+</div>
                <div className={styles.statLabel}>Verified Listings</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statVal}>2%</div>
                <div className={styles.statLabel}>Sale Commission</div>
              </div>
            </div>
          </div>
        </section>

        {/* Browse Cities */}
        <section className={`${styles.section} container cities-section`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Explore popular cities</h2>
            <p className={styles.sectionSubtitle}>
              Find houses, plots, flats, and commercial properties in India's top markets.
            </p>
          </div>

          <div className={styles.grid}>
            {activeCities.map((city) => (
              <div
                key={city.name}
                className={`${styles.cityCard} city-card-item`}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  window.location.href = `/listings?city=${city.name.toLowerCase()}`;
                }}
              >
                <img
                  src={city.image}
                  alt={`${city.name} city skyline`}
                  className={styles.cityCardImage}
                />
                <div className={styles.cityCardContent}>
                  <div className={styles.cityName}>{city.name}</div>
                  <div className={styles.cityCount}>{city.count} listings</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Loved by Buyers & Owners Testimonials */}
        <section className={`${styles.section} ${styles.testimonialsSection}`}>
          <div className="container">
            {/* Header: Left is title/labels, Right is navigation buttons */}
            <div className={styles.testimonialsHeader}>
              <div className={styles.testimonialsHeaderLeft}>
                <span className={styles.testimonialsLabel}>TRUSTED BY THOUSANDS</span>
                <h2 className={styles.testimonialsTitle}>
                  Loved by Buyers & Owners <br />Across the Country
                </h2>
              </div>
              <div className={styles.testimonialsNav}>
                <button className={styles.navButton} aria-label="Previous testimonial">
                  &larr;
                </button>
                <button className={styles.navButton} aria-label="Next testimonial">
                  &rarr;
                </button>
              </div>
            </div>

            {/* Testimonial Cards Row */}
            <div className={styles.testimonialsRow}>
              {/* Testimonial 1 */}
              <div className={`${styles.testimonialCard} testimonial-card-item`}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.reviewText}>
                  "ListMe made it so easy to find my dream home. The direct contact with owners saved me time and money!"
                </p>
                <div className={styles.userProfile}>
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80"
                    alt="Rohan Mehta"
                    className={styles.userAvatar}
                  />
                  <div>
                    <h4 className={styles.userName}>Rohan Mehta</h4>
                    <span className={styles.userLocation}>Bangalore</span>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className={`${styles.testimonialCard} testimonial-card-item`}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.reviewText}>
                  "I listed my property in just a few minutes and got great responses. Totally free and super effective!"
                </p>
                <div className={styles.userProfile}>
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80"
                    alt="Neha Sharma"
                    className={styles.userAvatar}
                  />
                  <div>
                    <h4 className={styles.userName}>Neha Sharma</h4>
                    <span className={styles.userLocation}>Hyderabad</span>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className={`${styles.testimonialCard} testimonial-card-item`}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.reviewText}>
                  "As an owner, listing on ListMe was a breeze. I avoided paying a huge brokerage fee and got direct inquiries within hours!"
                </p>
                <div className={styles.userProfile}>
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80"
                    alt="Vikram Malhotra"
                    className={styles.userAvatar}
                  />
                  <div>
                    <h4 className={styles.userName}>Vikram Malhotra</h4>
                    <span className={styles.userLocation}>Mumbai</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* List Your Property Split CTA Banner */}
        <section className={styles.ctaSplitSection}>
          <div className={`${styles.ctaSplitContainer} container cta-card`}>
            {/* Left side info */}
            <div className={styles.ctaSplitLeft}>
              <span className={styles.ctaLabel}>POST YOUR PROPERTY</span>
              <h2 className={styles.ctaSplitTitle}>
                Post Your Property. <br />It's 100% Free.
              </h2>
              <p className={styles.ctaSplitSubtitle}>
                Reach thousands of genuine buyers and tenants. No fees, no commissions. Just real connections.
              </p>
              <Button href="/post-property" variant="secondary" size="lg" className={styles.ctaButton}>
                Post Property (Free) &rarr;
              </Button>
            </div>

            {/* Right side graphics & overlapping checklist cards */}
            <div className={styles.ctaSplitRight}>
              <div className={styles.villaGraphicContainer}>
                <img
                  src="/images/hero_bg.jpg"
                  alt="Modern house at night"
                  className={styles.villaGraphic}
                />
                <div className={styles.villaOverlay} />
              </div>

              {/* Overlapping Checklist Cards */}
              <div className={`${styles.checklistCard} ${styles.checklistCard1}`}>
                <div className={styles.checkIcon}>✓</div>
                <div>
                  <h4 className={styles.checkTitle}>Unlimited Listings</h4>
                  <p className={styles.checkDesc}>List as many properties as you want.</p>
                </div>
              </div>

              <div className={`${styles.checklistCard} ${styles.checklistCard2}`}>
                <div className={styles.checkIcon}>✓</div>
                <div>
                  <h4 className={styles.checkTitle}>Direct Owner Contact</h4>
                  <p className={styles.checkDesc}>Connect directly with interested buyers or tenants.</p>
                </div>
              </div>

              <div className={`${styles.checklistCard} ${styles.checklistCard3}`}>
                <div className={styles.checkIcon}>✓</div>
                <div>
                  <h4 className={styles.checkTitle}>Verified & Trusted</h4>
                  <p className={styles.checkDesc}>Build trust with verified listings and real connections.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
