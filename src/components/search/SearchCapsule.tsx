'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, Navigation, Mic, ArrowLeft } from 'lucide-react';
import styles from './SearchCapsule.module.css';

interface SearchCapsuleProps {
  searchLocation?: string;
}

export const SearchCapsule: React.FC<SearchCapsuleProps> = ({ searchLocation }) => {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState('Buy');
  const [searchQuery, setSearchQuery] = useState('');

  // Residential Categories
  const defaultCategories = new Set([
    'Flat/Apartment', 'Builder Floor', 'Independent House/Villa', 
    'Residential Land', '1 RK/ Studio Apartment', 'Farm House', 
    'Serviced Apartments', 'Other'
  ]);
  const [checkedCategories, setCheckedCategories] = useState<Set<string>>(new Set(defaultCategories));
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Sub-filter views
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
  const [leaseSeats, setLeaseSeats] = useState<string>('Any');
  const [isGradeAOnly, setIsGradeAOnly] = useState<boolean>(false);

  const [selectedBuySubtypes, setSelectedBuySubtypes] = useState<Set<string>>(new Set([
    'Ready to move offices', 'Shops & Retail', 'Agricultural/Farm Land', 'Warehouse', 
    'Factory & Manufacturing', 'Others', 'Bare shell offices', 'Commercial/Inst. Land', 
    'Industrial Land/Plots', 'Cold Storage', 'Hotel/Resorts'
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

  // Refs for click outside handling
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const commercialTradeMenuRef = useRef<HTMLDivElement>(null);
  const commercialTypeMenuRef = useRef<HTMLDivElement>(null);
  const plotsTypeMenuRef = useRef<HTMLDivElement>(null);
  const plotsTradeMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

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
      const target = e.target as Node;

      // If the click is inside any full-width dropdown panel, don't close anything
      if (target instanceof HTMLElement && target.closest('[data-dropdown-panel]')) {
        return;
      }

      if (categoryMenuRef.current && !categoryMenuRef.current.contains(target)) {
        setIsCategoryOpen(false);
        setActiveDropdownView('main');
      }
      if (commercialTradeMenuRef.current && !commercialTradeMenuRef.current.contains(target)) {
        setIsCommercialTradeOpen(false);
        setCommercialActiveView('main');
      }
      if (commercialTypeMenuRef.current && !commercialTypeMenuRef.current.contains(target)) {
        setIsCommercialTypeOpen(false);
        setCommercialActiveView('main');
      }
      if (plotsTypeMenuRef.current && !plotsTypeMenuRef.current.contains(target)) {
        setIsPlotsTypeOpen(false);
      }
      if (plotsTradeMenuRef.current && !plotsTradeMenuRef.current.contains(target)) {
        setIsPlotsTradeOpen(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(target)) {
        setIsProjectTypeOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsCategoryOpen(false);
        setIsCommercialTradeOpen(false);
        setIsCommercialTypeOpen(false);
        setIsPlotsTypeOpen(false);
        setIsPlotsTradeOpen(false);
        setIsProjectTypeOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setSearchQuery(searchLocation ? searchLocation.charAt(0).toUpperCase() + searchLocation.slice(1) : 'Mumbai');
        },
        () => {
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
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    // 1. Resolve Location
    const queryLower = searchQuery.toLowerCase();
    let resolvedCity = '';
    if (queryLower.includes('mumbai')) resolvedCity = 'mumbai';
    else if (queryLower.includes('pune')) resolvedCity = 'pune';
    else if (queryLower.includes('delhi')) resolvedCity = 'delhi';
    else if (queryLower.includes('ghaziabad')) resolvedCity = 'ghaziabad';
    else if (searchLocation) resolvedCity = searchLocation;

    if (resolvedCity) params.set('city', resolvedCity);

    // 2. Resolve BHK
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
        else if (commercialType === 'Factory & Manufacturing') params.set('property_type', 'FACTORY');
      } else {
        params.set('property_type', 'COMMERCIAL');
        if (selectedBuySubtypes.size > 0) {
          params.set('commercial_subtypes', Array.from(selectedBuySubtypes).join(','));
        }
        if (selectedBuyInvestmentOptions.size > 0) {
          params.set('investment_options', Array.from(selectedBuyInvestmentOptions).join(','));
        }
      }

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
    const isRental = activeTab === 'Rent' || (activeTab === 'Commercial' && commercialTrade === 'Lease');
    const priceMultiplier = isRental ? 10000 : 10000000;
    if (budgetRange[0] > 0) {
      params.set('min_price', (budgetRange[0] * priceMultiplier).toString());
    }
    if (budgetRange[1] < 100) {
      params.set('max_price', (budgetRange[1] * priceMultiplier).toString());
    }

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
        // Ignores storage write errors safely
      }
    }

    router.push(`/listings?${params.toString()}`);
  };

  const renderCommercialSubView = () => (
    <>
      <div className={styles.subViewHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => setCommercialActiveView('main')}
          aria-label="Back to main commercial options"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className={styles.subViewPills} role="group" aria-label="Sub-filter categories">
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
              <span className={styles.budgetSubtext}>
                {budgetRange[0]} - {budgetRange[1] >= 100 ? '100+' : budgetRange[1]} Crore
              </span>
            </div>
            <div className={styles.budgetSliderContainer}>
              <span className={styles.budgetLabel}>{budgetRange[0]}</span>
              <div className={styles.budgetSliderTrack}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={budgetRange[0]}
                  aria-label="Minimum price range"
                  onChange={(e) => setBudgetRange([Math.min(Number(e.target.value), budgetRange[1] - 1), budgetRange[1]])}
                  className={styles.budgetRangeInput}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={budgetRange[1]}
                  aria-label="Maximum price range"
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
              <span className={styles.budgetSubtext}>
                {commercialArea[0]} - {commercialArea[1] >= 10000 ? '10,000+' : commercialArea[1]} sq ft
              </span>
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
                  aria-label="Minimum area in square feet"
                  onChange={(e) => setCommercialArea([Math.min(Number(e.target.value), commercialArea[1] - 100), commercialArea[1]])}
                  className={styles.budgetRangeInput}
                />
                <input
                  type="range"
                  min={0}
                  max={10000}
                  step={100}
                  value={commercialArea[1]}
                  aria-label="Maximum area in square feet"
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
            <div className={styles.subViewPanelOptions} role="radiogroup" aria-label="Number of seats selection">
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
                    role="radio"
                    aria-checked={isActive}
                    className={`${styles.subViewOption} ${isActive ? styles.subViewOptionActive : ''}`}
                    onClick={() => setLeaseSeats(opt.value)}
                  >
                    <span className={styles.optionCheck}>{isActive ? '✓' : '+'}</span>
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
              aria-pressed={isGradeAOnly}
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

  const isDropdownOpen = isCategoryOpen || isCommercialTradeOpen || isCommercialTypeOpen || isPlotsTypeOpen || isPlotsTradeOpen || isProjectTypeOpen;

  return (
    <div className={`${styles.searchCapsuleContainer} search-capsule-animate`}>
      <form
        onSubmit={handleSearchSubmit}
        className={`${styles.premiumSearchBox} ${isDropdownOpen ? styles.premiumSearchBoxDropdownOpen : ''}`}
        aria-label="Property Search Engine"
      >
        {/* 1. First Row: Tabs */}
        <div className={styles.searchTabsRow} role="tablist" aria-label="Search Categories">
          <div className={styles.searchTabsLeft}>
            {['Buy', 'Rent', 'New Launch', 'Commercial', 'Plots/Land', 'Projects'].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab.toLowerCase().replace('/', '-')}`}
                className={`${styles.searchTabItem} ${activeTab === tab ? styles.searchTabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === 'New Launch' && <span className={styles.tabNotificationDot} aria-hidden="true" />}
              </button>
            ))}
          </div>

          <div className={styles.searchTabsRight}>
            <div className={styles.tabsSeparator} aria-hidden="true" />
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
                  aria-expanded={isCommercialTradeOpen}
                  aria-haspopup="listbox"
                  className={styles.categorySelectPane}
                  onClick={() => {
                    setIsCommercialTradeOpen(!isCommercialTradeOpen);
                    setIsCommercialTypeOpen(false);
                  }}
                >
                  <span>{commercialTrade}</span>
                  <ChevronDown
                    size={16}
                    className={`${styles.chevronIcon} ${isCommercialTradeOpen ? styles.chevronRotated : ''}`}
                  />
                </button>
              </div>

              {commercialTrade !== 'Invest' && (
                <>
                  <div className={styles.verticalDivider} aria-hidden="true" />
                  <div className={styles.categorySelectWrapper} ref={commercialTypeMenuRef}>
                    <button
                      type="button"
                      aria-expanded={isCommercialTypeOpen}
                      aria-haspopup="listbox"
                      className={styles.categorySelectPane}
                      onClick={() => {
                        setIsCommercialTypeOpen(!isCommercialTypeOpen);
                        setIsCommercialTradeOpen(false);
                      }}
                    >
                      <span>{commercialType}</span>
                      <ChevronDown
                        size={16}
                        className={`${styles.chevronIcon} ${isCommercialTypeOpen ? styles.chevronRotated : ''}`}
                      />
                    </button>
                  </div>
                </>
              )}
            </>
          ) : activeTab === 'Plots/Land' ? (
            <>
              {/* Plots type: Residential / Commercial */}
              <div className={styles.categorySelectWrapper} ref={plotsTypeMenuRef}>
                <button
                  type="button"
                  aria-expanded={isPlotsTypeOpen}
                  aria-haspopup="listbox"
                  className={styles.categorySelectPane}
                  onClick={() => {
                    setIsPlotsTypeOpen(!isPlotsTypeOpen);
                    setIsPlotsTradeOpen(false);
                  }}
                >
                  <span>{plotsType}</span>
                  <ChevronDown
                    size={16}
                    className={`${styles.chevronIcon} ${isPlotsTypeOpen ? styles.chevronRotated : ''}`}
                  />
                </button>
              </div>

              {plotsType === 'Commercial' && (
                <>
                  <div className={styles.verticalDivider} aria-hidden="true" />
                  <div className={styles.categorySelectWrapper} ref={plotsTradeMenuRef}>
                    <button
                      type="button"
                      aria-expanded={isPlotsTradeOpen}
                      aria-haspopup="listbox"
                      className={styles.categorySelectPane}
                      onClick={() => {
                        setIsPlotsTradeOpen(!isPlotsTradeOpen);
                        setIsPlotsTypeOpen(false);
                      }}
                    >
                      <span>{plotsTrade}</span>
                      <ChevronDown
                        size={16}
                        className={`${styles.chevronIcon} ${isPlotsTradeOpen ? styles.chevronRotated : ''}`}
                      />
                    </button>
                  </div>
                </>
              )}
            </>
          ) : activeTab === 'Projects' ? (
            <div className={styles.categorySelectWrapper} ref={projectMenuRef}>
              <button
                type="button"
                aria-expanded={isProjectTypeOpen}
                aria-haspopup="listbox"
                className={styles.categorySelectPane}
                onClick={() => setIsProjectTypeOpen(!isProjectTypeOpen)}
              >
                <span>{projectType}</span>
                <ChevronDown
                  size={16}
                  className={`${styles.chevronIcon} ${isProjectTypeOpen ? styles.chevronRotated : ''}`}
                />
              </button>
            </div>
          ) : (
            <div className={styles.categorySelectWrapper} ref={categoryMenuRef}>
              <button
                type="button"
                aria-expanded={isCategoryOpen}
                aria-haspopup="listbox"
                className={styles.categorySelectPane}
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              >
                <span>{categoryLabel}</span>
                <ChevronDown
                  size={16}
                  className={`${styles.chevronIcon} ${isCategoryOpen ? styles.chevronRotated : ''}`}
                />
              </button>
            </div>
          )}

          <div className={styles.verticalDivider} aria-hidden="true" />

          {/* Search Query Pane */}
          <div className={styles.searchQueryPane}>
            <Search size={20} className={styles.searchQueryIcon} />
            <input
              type="text"
              className={styles.searchQueryInput}
              placeholder='Search "3 BHK for sale in Mumbai"'
              aria-label="Search properties input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.actionsGroup}>
            <div className={styles.tooltipWrapper}>
              <button
                type="button"
                onClick={handleLocateMe}
                aria-label="Locate Me"
                className={styles.actionCircleBtn}
              >
                <Navigation size={18} />
              </button>
              <div className={styles.tooltip} role="tooltip">
                <Navigation size={14} className={styles.tooltipIcon} /> Search <strong>Near Me</strong>
              </div>
            </div>

            <div className={styles.tooltipWrapper}>
              <button
                type="button"
                onClick={handleVoiceSearch}
                aria-label="Voice Search"
                className={styles.actionCircleBtn}
              >
                <Mic size={18} />
              </button>
              <div className={styles.tooltip} role="tooltip">
                <Mic size={14} className={styles.tooltipIcon} /> Search by <strong>Voice</strong>{' '}
                <span className={styles.newBadge}>NEW</span>
              </div>
            </div>

            <button type="submit" className={styles.solidBlueSearchBtn}>
              Search
            </button>
          </div>
        </div>

        {/* ========== FULL-WIDTH DROPDOWN PANELS (rendered outside searchInputsRow) ========== */}

        {/* Buy / Rent / New Launch dropdown */}
        {isCategoryOpen && (activeTab === 'Buy' || activeTab === 'Rent' || activeTab === 'New Launch') && (
          <div
            className={styles.categoryDropdownFullWidth}
            data-dropdown-panel
            role="listbox"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {activeDropdownView === 'main' ? (
              <div className={styles.dropdownPaddingBox}>
                <div className={styles.columnHeaderRow}>
                  <button
                    type="button"
                    className={styles.categoryClearBtn}
                    onClick={() => setCheckedCategories(new Set())}
                  >
                    Clear
                  </button>
                </div>

                <div className={styles.checkboxGridThreeCol}>
                  {Array.from(defaultCategories).map((cat) => {
                    const isChecked = checkedCategories.has(cat);
                    return (
                      <label key={cat} className={styles.categoryCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(cat)}
                          className={styles.categoryCheckbox}
                        />
                        <span className={styles.categoryCheckboxCustom}>
                          {isChecked && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </span>
                        <span className={styles.categoryCheckboxText}>{cat}</span>
                      </label>
                    );
                  })}
                </div>

                <div className={styles.commercialLinkBox}>
                  Looking for commercial properties ?{' '}
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
              </div>
            ) : (
              <>
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
                        <span className={styles.budgetSubtext}>
                          {budgetRange[0]} - {budgetRange[1] >= 100 ? '100+' : budgetRange[1]} Crore
                        </span>
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
                          { label: '1 BHK', value: '1' },
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
                              <span className={styles.optionCheck}>{isActive ? '✓' : '+'}</span>
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

        {/* Commercial Trade dropdown (Buy/Lease/Invest) — full-width */}
        {isCommercialTradeOpen && activeTab === 'Commercial' && (
          <div
            className={styles.categoryDropdownFullWidth}
            data-dropdown-panel
            role="listbox"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {commercialActiveView === 'main' ? (
              <div className={styles.dropdownPaddingBox}>
                <div className={styles.radioRow}>
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
                <div className={styles.investmentLinkBox}>
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
                <div className={styles.dropdownDivider} />
                {renderCommercialPills()}
              </div>
            ) : (
              renderCommercialSubView()
            )}
          </div>
        )}

        {/* Commercial Type dropdown (Office Spaces, Shops, etc.) — full-width */}
        {isCommercialTypeOpen && activeTab === 'Commercial' && commercialTrade !== 'Invest' && (
          <div
            className={styles.categoryDropdownFullWidth}
            data-dropdown-panel
            role="listbox"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {commercialActiveView === 'main' ? (
              <div className={styles.dropdownPaddingBox}>
                {commercialTrade === 'Buy' ? (
                  <div className={styles.splitLayoutRow}>
                    <div className={styles.leftColumnPane}>
                      <div className={styles.columnHeaderRow}>
                        <strong className={styles.columnTitle}>Property Types</strong>
                        <button
                          type="button"
                          className={styles.categoryClearBtn}
                          onClick={() => setSelectedBuySubtypes(new Set())}
                        >
                          Clear
                        </button>
                      </div>
                      <div className={styles.checkboxGridTwoCol}>
                        {[
                          'Ready to move offices', 'Shops & Retail', 'Agricultural/Farm Land', 
                          'Warehouse', 'Factory & Manufacturing', 'Others', 
                          'Bare shell offices', 'Commercial/Inst. Land', 'Industrial Land/Plots', 
                          'Cold Storage', 'Hotel/Resorts'
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
                    <div className={styles.rightColumnPane}>
                      <div className={styles.columnHeaderRow}>
                        <strong className={styles.columnTitle}>Investment Options</strong>
                        <span className={styles.newBadgeMini}>New</span>
                      </div>
                      <div className={styles.checkboxStackCol}>
                        {[
                          'Pre Leased Spaces', 'Food Courts', 'Restaurants', 
                          'Multiplexes', 'SCO Plots', 'Co-working', 'Business Center'
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
                  <>
                    <div className={styles.columnHeaderRow}>
                      <strong className={styles.columnTitle}>Property Types</strong>
                    </div>
                    <div className={styles.radioFlexRow}>
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

                    {commercialType === 'Office Spaces' && (
                      <div className={styles.officeTypeSubBox}>
                        <h5 className={styles.officeTypeTitle}>
                          Office space type <span className={styles.requiredAsterisk}>*</span>
                        </h5>
                        <div className={styles.radioRowGap}>
                          {['Ready to move offices', 'Bare shell offices', 'Co-working office space'].map((ost) => (
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

                <div className={styles.dropdownDivider} />
                {renderCommercialPills()}
              </div>
            ) : (
              renderCommercialSubView()
            )}
          </div>
        )}

        {/* Plots/Land Type dropdown (Residential / Commercial) — full-width */}
        {isPlotsTypeOpen && activeTab === 'Plots/Land' && (
          <div
            className={styles.categoryDropdownFullWidth}
            data-dropdown-panel
            role="listbox"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.dropdownPaddingBox}>
              <div className={styles.columnHeaderRow}>
                <strong className={styles.columnTitle}>Plot / Land Type</strong>
              </div>
              <div className={styles.radioRow}>
                {(['Residential', 'Commercial'] as const).map((pt) => (
                  <label key={pt} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="plotsType"
                      checked={plotsType === pt}
                      onChange={() => setPlotsType(pt)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>{pt}</span>
                  </label>
                ))}
              </div>

              {plotsType === 'Commercial' && (
                <>
                  <div className={styles.dropdownDivider} />
                  <div className={styles.columnHeaderRow}>
                    <strong className={styles.columnTitle}>Commercial Plot Subtypes</strong>
                    <button
                      type="button"
                      className={styles.categoryClearBtn}
                      onClick={() => setSelectedPlotsSubtypes(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                  <div className={styles.checkboxGridThreeCol}>
                    {['Agricultural / Farm Land', 'Industrial Plots/Land', 'Commercial / Inst. Land'].map((sub) => {
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
                </>
              )}
            </div>
          </div>
        )}

        {/* Plots/Land Trade dropdown (Buy / Lease / Invest) — full-width */}
        {isPlotsTradeOpen && activeTab === 'Plots/Land' && plotsType === 'Commercial' && (
          <div
            className={styles.categoryDropdownFullWidth}
            data-dropdown-panel
            role="listbox"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.dropdownPaddingBox}>
              <div className={styles.columnHeaderRow}>
                <strong className={styles.columnTitle}>Trade Type</strong>
              </div>
              <div className={styles.radioRow}>
                {(['Buy', 'Lease', 'Invest'] as const).map((t) => (
                  <label key={t} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="plotsTrade"
                      checked={plotsTrade === t}
                      onChange={() => setPlotsTrade(t)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Projects dropdown (Residential Project / Commercial Project + statuses) — full-width */}
        {isProjectTypeOpen && activeTab === 'Projects' && (
          <div
            className={styles.categoryDropdownFullWidth}
            data-dropdown-panel
            role="listbox"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.dropdownPaddingBox}>
              <div className={styles.columnHeaderRow}>
                <strong className={styles.columnTitle}>Project Type</strong>
              </div>
              <div className={styles.radioRow}>
                {(['Residential Project', 'Commercial Project'] as const).map((pt) => (
                  <label key={pt} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="projectType"
                      checked={projectType === pt}
                      onChange={() => setProjectType(pt)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioText}>{pt}</span>
                  </label>
                ))}
              </div>

              <div className={styles.dropdownDivider} />

              <div className={styles.columnHeaderRow}>
                <strong className={styles.columnTitle}>Construction Status</strong>
                <button
                  type="button"
                  className={styles.categoryClearBtn}
                  onClick={() => setSelectedProjectStatuses(new Set())}
                >
                  Clear
                </button>
              </div>
              <div className={styles.checkboxGridThreeCol}>
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
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
