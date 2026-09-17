'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X, Search, LocateFixed, MapPin, ChevronRight, Clock } from 'lucide-react';
import { useMobileMenu } from '@/context/MobileMenuContext';
import styles from './MobileSearchDrawer.module.css';

type SearchTabType = 'Buy' | 'Rent/PG' | 'Commercial';

const POPULAR_LOCALITIES_BY_CITY: Record<string, string[]> = {
  Ghaziabad: [
    'Indirapuram',
    'Raj Nagar Extension',
    'Vaishali',
    'NH 24 Highway',
    'Vasundhara',
    'Ahinsa Khand',
  ],
  Noida: [
    'Sector 62',
    'Sector 150',
    'Sector 137',
    'Noida Extension',
    'Sector 75',
    'Sector 128',
  ],
  Delhi: [
    'Dwarka',
    'Rohini',
    'Vasant Kunj',
    'Saket',
    'Uttam Nagar',
    'Janakpuri',
  ],
  Gurgaon: [
    'Golf Course Road',
    'Sohna Road',
    'Cyber City',
    'Sector 57',
    'DLF Phase 5',
    'New Gurgaon',
  ],
  Mumbai: [
    'Andheri West',
    'Bandra West',
    'Thane West',
    'Powai',
    'Malad West',
    'Borivali West',
  ],
  Bangalore: [
    'Whitefield',
    'Indiranagar',
    'Electronic City',
    'HSR Layout',
    'Koramangala',
    'Bellandur',
  ],
  Pune: [
    'Hinjewadi',
    'Baner',
    'Koregaon Park',
    'Wakad',
    'Kharadi',
    'Viman Nagar',
  ],
  Hyderabad: [
    'Gachibowli',
    'Hitec City',
    'Madhapur',
    'Kondapur',
    'Banjara Hills',
    'Jubilee Hills',
  ],
};

const ALL_CITIES = Object.keys(POPULAR_LOCALITIES_BY_CITY);

export const MobileSearchDrawer: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isSearchOpen, closeSearch } = useMobileMenu();

  const [activeTab, setActiveTab] = useState<SearchTabType>('Buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Ghaziabad');
  const [isLocating, setIsLocating] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Auto-close only when pathname actually changes (navigation occurred)
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      closeSearch();
    }
  }, [pathname, closeSearch]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('listme_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    try {
      const updated = [
        term.trim(),
        ...recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase().trim()),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('listme_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('listme_recent_searches');
    } catch {
      // Ignore localStorage errors
    }
  };

  // Body scroll lock, autofocus & focus restoration
  useEffect(() => {
    if (isSearchOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setSearchQuery('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        previousActiveElement.current?.focus();
      };
    }
  }, [isSearchOpen]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, closeSearch]);

  const getListingTypeParam = (tab: SearchTabType) => {
    if (tab === 'Rent/PG') return 'rent';
    if (tab === 'Commercial') return 'commercial';
    return 'sale';
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const typeParam = getListingTypeParam(activeTab);
    const query = searchQuery.trim();

    saveRecentSearch(query || selectedCity);

    const params = new URLSearchParams();
    params.set('type', typeParam);
    if (query) {
      params.set('query', query);
    } else if (selectedCity) {
      params.set('city', selectedCity);
    }

    closeSearch();
    router.push(`/listings?${params.toString()}`);
  };

  const handleLocalityClick = (locality: string, cityOverride?: string) => {
    const effectiveCity = cityOverride || selectedCity;
    const typeParam = getListingTypeParam(activeTab);
    saveRecentSearch(`${locality}, ${effectiveCity}`);

    const params = new URLSearchParams();
    params.set('type', typeParam);
    params.set('city', effectiveCity);
    params.set('query', locality);

    closeSearch();
    router.push(`/listings?${params.toString()}`);
  };

  const handleRecentClick = (term: string) => {
    const typeParam = getListingTypeParam(activeTab);
    closeSearch();
    if (term.includes(',')) {
      const parts = term.split(',').map((s) => s.trim());
      const localityPart = parts[0];
      const cityPart = parts[1];
      if (ALL_CITIES.includes(cityPart)) {
        router.push(
          `/listings?type=${typeParam}&city=${encodeURIComponent(cityPart)}&query=${encodeURIComponent(localityPart)}`
        );
        return;
      }
    }
    router.push(`/listings?type=${typeParam}&query=${encodeURIComponent(term)}`);
  };

  const handleGeolocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocating(false);
        // NCR & Metro bounds heuristic
        if (latitude > 28.3 && latitude < 28.9 && longitude > 76.8 && longitude < 77.6) {
          if (longitude > 77.38 && latitude > 28.62) {
            setSelectedCity('Ghaziabad');
            setSearchQuery('Ghaziabad');
          } else if (longitude > 77.30 && latitude < 28.62) {
            setSelectedCity('Noida');
            setSearchQuery('Noida');
          } else if (longitude < 77.12) {
            setSelectedCity('Gurgaon');
            setSearchQuery('Gurgaon');
          } else {
            setSelectedCity('Delhi');
            setSearchQuery('Delhi');
          }
        } else if (latitude > 18.8 && latitude < 19.3 && longitude > 72.7 && longitude < 73.2) {
          setSelectedCity('Mumbai');
          setSearchQuery('Mumbai');
        } else if (latitude > 12.8 && latitude < 13.2 && longitude > 77.4 && longitude < 77.8) {
          setSelectedCity('Bangalore');
          setSearchQuery('Bangalore');
        } else if (latitude > 17.2 && latitude < 17.6 && longitude > 78.2 && longitude < 78.6) {
          setSelectedCity('Hyderabad');
          setSearchQuery('Hyderabad');
        } else if (latitude > 18.4 && latitude < 18.7 && longitude > 73.7 && longitude < 74.0) {
          setSelectedCity('Pune');
          setSearchQuery('Pune');
        } else {
          setSearchQuery('Current Location');
        }
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Keyboard navigation for tablist
  const handleTabKeyDown = (e: React.KeyboardEvent, tab: SearchTabType) => {
    const tabs: SearchTabType[] = ['Buy', 'Rent/PG', 'Commercial'];
    const currentIndex = tabs.indexOf(tab);
    if (e.key === 'ArrowRight') {
      const nextTab = tabs[(currentIndex + 1) % tabs.length];
      setActiveTab(nextTab);
    } else if (e.key === 'ArrowLeft') {
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      setActiveTab(prevTab);
    }
  };

  // Swipe-to-dismiss gesture handlers on header bar
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (deltaY > 60) {
        closeSearch();
      }
      touchStartY.current = null;
    }
  };

  // Filtered suggestions when typing
  const queryLower = searchQuery.toLowerCase().trim();
  const matchedLocalities: { city: string; locality: string }[] = [];
  if (queryLower.length >= 2) {
    for (const [city, localities] of Object.entries(POPULAR_LOCALITIES_BY_CITY)) {
      if (city.toLowerCase().includes(queryLower)) {
        matchedLocalities.push({ city, locality: `All in ${city}` });
      }
      for (const loc of localities) {
        if (loc.toLowerCase().includes(queryLower)) {
          matchedLocalities.push({ city, locality: loc });
        }
      }
    }
  }

  const currentLocalities = POPULAR_LOCALITIES_BY_CITY[selectedCity] || POPULAR_LOCALITIES_BY_CITY['Ghaziabad'];

  return (
    <div 
      className={`${styles.overlay} ${isSearchOpen ? styles.open : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeSearch();
        }
      }}
      role="dialog"
      aria-modal={isSearchOpen ? 'true' : 'false'}
      aria-hidden={!isSearchOpen}
      aria-label="Property Search Drawer"
    >
      <div className={styles.drawer}>
        {/* Top Header Bar */}
        <div 
          className={styles.headerBar}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.dragHandle} aria-hidden="true" />
          
          <div className={styles.segmentedTabs} role="tablist" aria-label="Listing Category">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'Buy'}
              tabIndex={activeTab === 'Buy' ? 0 : -1}
              onKeyDown={(e) => handleTabKeyDown(e, 'Buy')}
              className={`${styles.tabBtn} ${activeTab === 'Buy' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('Buy')}
            >
              Buy
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'Rent/PG'}
              tabIndex={activeTab === 'Rent/PG' ? 0 : -1}
              onKeyDown={(e) => handleTabKeyDown(e, 'Rent/PG')}
              className={`${styles.tabBtn} ${activeTab === 'Rent/PG' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('Rent/PG')}
            >
              Rent/PG
            </button>
            <div className={styles.tabDivider} aria-hidden="true" />
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'Commercial'}
              tabIndex={activeTab === 'Commercial' ? 0 : -1}
              onKeyDown={(e) => handleTabKeyDown(e, 'Commercial')}
              className={`${styles.tabBtn} ${activeTab === 'Commercial' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('Commercial')}
            >
              Commercial
            </button>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={closeSearch}
            aria-label="Close search drawer"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Search Input Box */}
        <div className={styles.searchBoxWrapper}>
          <form onSubmit={handleSearchSubmit} className={styles.searchBox}>
            <Search size={18} className={styles.inputSearchIcon} aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try - Delhi"
              className={styles.searchInput}
              aria-label="Search city, locality, or project"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search text"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="button"
              className={`${styles.gpsBtn} ${isLocating ? styles.loading : ''}`}
              onClick={handleGeolocation}
              aria-label="Use current location"
              title="Detect my current location"
            >
              <LocateFixed size={20} strokeWidth={2.2} />
            </button>
          </form>
        </div>

        {/* Drawer Body */}
        <div className={styles.drawerBody}>
          {/* Real-time Query Suggestions */}
          {queryLower.length >= 2 && matchedLocalities.length > 0 && (
            <div className={styles.suggestionsList} role="listbox" aria-label="Search suggestions">
              {matchedLocalities.slice(0, 6).map((item, idx) => (
                <div
                  key={`${item.city}-${item.locality}-${idx}`}
                  role="option"
                  aria-selected={false}
                  className={styles.suggestionItem}
                  onClick={() => {
                    if (item.locality.startsWith('All in ')) {
                      setSelectedCity(item.city);
                      const typeParam = getListingTypeParam(activeTab);
                      closeSearch();
                      router.push(`/listings?type=${typeParam}&city=${encodeURIComponent(item.city)}`);
                    } else {
                      setSelectedCity(item.city);
                      handleLocalityClick(item.locality, item.city);
                    }
                  }}
                >
                  <MapPin size={18} className={styles.suggestionIcon} />
                  <div className={styles.suggestionText}>
                    <span className={styles.suggestionPrimary}>{item.locality}</span>
                    <span className={styles.suggestionSecondary}>{item.city}</span>
                  </div>
                  <ChevronRight size={16} className={styles.suggestionArrow} />
                </div>
              ))}
            </div>
          )}

          {/* Popular Localities in City */}
          {queryLower.length < 2 && (
            <div className={styles.popularCard}>
              <div className={styles.popularTitle}>
                <span>
                  Popular Localities in <span className={styles.boldCity}>{selectedCity}</span>
                </span>
                {ALL_CITIES.length > 1 && (
                  <button 
                    type="button" 
                    className={styles.cityChangeBtn}
                    onClick={() => {
                      const nextIndex = (ALL_CITIES.indexOf(selectedCity) + 1) % ALL_CITIES.length;
                      setSelectedCity(ALL_CITIES[nextIndex]);
                    }}
                    aria-label={`Change city, currently ${selectedCity}`}
                  >
                    Change City ⌵
                  </button>
                )}
              </div>

              <div className={styles.localityGrid}>
                {currentLocalities.map((locality) => (
                  <button
                    key={locality}
                    type="button"
                    className={styles.localityPill}
                    onClick={() => handleLocalityClick(locality)}
                    aria-label={`Explore properties in ${locality}`}
                  >
                    <span className={styles.plusIcon}>+</span>
                    <span className={styles.localityLabel}>{locality}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {queryLower.length < 2 && recentSearches.length > 0 && (
            <div className={styles.popularCard} style={{ marginTop: '12px' }}>
              <div className={styles.popularTitle}>
                <span>Recent Searches</span>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className={styles.recentClearBtn}
                  aria-label="Clear recent searches"
                >
                  Clear
                </button>
              </div>
              <div className={styles.recentList}>
                {recentSearches.map((term, index) => (
                  <button
                    key={`${term}-${index}`}
                    type="button"
                    className={styles.recentItem}
                    onClick={() => handleRecentClick(term)}
                    aria-label={`Search again for ${term}`}
                  >
                    <Clock size={15} className={styles.recentClockIcon} />
                    <span className={styles.recentText}>{term}</span>
                    <ChevronRight size={14} className={styles.recentArrowIcon} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
