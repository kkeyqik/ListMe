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
  Kolkata: [
    'Salt Lake',
    'New Town',
    'Rajarhat',
    'Ballygunge',
    'Alipore',
    'Garia',
  ],
};

const ALL_CITIES = Object.keys(POPULAR_LOCALITIES_BY_CITY);

const POPULAR_CITIES_INDIA = [
  'Delhi NCR',
  'Mumbai',
  'Bangalore',
  'Hyderabad',
  'Pune',
  'Kolkata',
];

function resolveCityFromCoords(latitude: number, longitude: number): string | null {
  // Ghaziabad: approx lat 28.62 to 28.78, lon 77.32 to 77.60 (Indirapuram, Vaishali, Vasundhara, Raj Nagar Ext)
  if (latitude >= 28.62 && latitude <= 28.78 && longitude >= 77.32 && longitude <= 77.60) {
    return 'Ghaziabad';
  }
  // Noida: approx lat 28.40 to 28.62, lon 77.28 to 77.55
  if (latitude >= 28.40 && latitude <= 28.62 && longitude >= 77.28 && longitude <= 77.55) {
    return 'Noida';
  }
  // Gurgaon: approx lat 28.35 to 28.55, lon 76.90 to 77.15
  if (latitude >= 28.35 && latitude <= 28.55 && longitude >= 76.90 && longitude <= 77.15) {
    return 'Gurgaon';
  }
  // Delhi: approx lat 28.50 to 28.88, lon 76.85 to 77.32
  if (latitude >= 28.50 && latitude <= 28.88 && longitude >= 76.85 && longitude <= 77.32) {
    return 'Delhi';
  }
  // Mumbai: approx lat 18.88 to 19.32, lon 72.75 to 73.10
  if (latitude >= 18.88 && latitude <= 19.32 && longitude >= 72.75 && longitude <= 73.10) {
    return 'Mumbai';
  }
  // Bangalore: approx lat 12.80 to 13.15, lon 77.45 to 77.80
  if (latitude >= 12.80 && latitude <= 13.15 && longitude >= 77.45 && longitude <= 77.80) {
    return 'Bangalore';
  }
  // Pune: approx lat 18.40 to 18.70, lon 73.70 to 74.00
  if (latitude >= 18.40 && latitude <= 18.70 && longitude >= 73.70 && longitude <= 74.00) {
    return 'Pune';
  }
  // Hyderabad: approx lat 17.25 to 17.55, lon 78.25 to 78.60
  if (latitude >= 17.25 && latitude <= 17.55 && longitude >= 78.25 && longitude <= 78.60) {
    return 'Hyderabad';
  }
  // Kolkata: approx lat 22.45 to 22.70, lon 88.25 to 88.50
  if (latitude >= 22.45 && latitude <= 22.70 && longitude >= 88.25 && longitude <= 88.50) {
    return 'Kolkata';
  }
  return null;
}

function matchCitySynonym(rawText: string): string | null {
  const lower = rawText.toLowerCase();
  if (lower.includes('ghaziabad')) return 'Ghaziabad';
  if (lower.includes('noida') || lower.includes('greater noida')) return 'Noida';
  if (lower.includes('gurgaon') || lower.includes('gurugram')) return 'Gurgaon';
  if (lower.includes('delhi')) return 'Delhi';
  if (lower.includes('mumbai') || lower.includes('bombay') || lower.includes('thane') || lower.includes('navi mumbai')) return 'Mumbai';
  if (lower.includes('bangalore') || lower.includes('bengaluru')) return 'Bangalore';
  if (lower.includes('pune')) return 'Pune';
  if (lower.includes('hyderabad') || lower.includes('secunderabad')) return 'Hyderabad';
  if (lower.includes('kolkata') || lower.includes('calcutta')) return 'Kolkata';
  return null;
}

async function detectCityFromCoords(latitude: number, longitude: number): Promise<string> {
  const boundingMatch = resolveCityFromCoords(latitude, longitude);
  if (boundingMatch) return boundingMatch;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const combined = `${data.city || ''} ${data.locality || ''} ${data.principalSubdivision || ''}`;
      const matched = matchCitySynonym(combined);
      if (matched) return matched;
    }
  } catch {
    // Ignore network or abort errors
  }
  return 'Ghaziabad';
}

export const MobileSearchDrawer: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isSearchOpen, closeSearch } = useMobileMenu();

  const [activeTab, setActiveTab] = useState<SearchTabType>('Buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Ghaziabad');
  const [hasLocationAccess, setHasLocationAccess] = useState<boolean>(true);
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
        inputRef.current?.focus({ preventScroll: true });
      }, 150);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        previousActiveElement.current?.focus({ preventScroll: true });
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

  // Check location permission & auto-detect user's confirmed city
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    // 1. Initialize from localStorage cache if available
    try {
      const cachedAccess = localStorage.getItem('listme_location_access');
      const cachedCity = localStorage.getItem('listme_user_city');
      if (cachedAccess === 'false') {
        setHasLocationAccess(false);
      } else if (cachedCity && POPULAR_LOCALITIES_BY_CITY[cachedCity]) {
        setSelectedCity(cachedCity);
        setHasLocationAccess(true);
      }
    } catch {
      // Ignore localStorage errors
    }

    const nav = window.navigator;
    if (!nav?.geolocation) {
      setHasLocationAccess(false);
      return;
    }

    const processCoords = async (latitude: number, longitude: number) => {
      setHasLocationAccess(true);
      try { localStorage.setItem('listme_location_access', 'true'); } catch {}

      const finalCity = await detectCityFromCoords(latitude, longitude);
      if (isMounted) {
        setSelectedCity(finalCity);
        try { localStorage.setItem('listme_user_city', finalCity); } catch {}
      }
    };

    const requestPosition = () => {
      nav.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          if (!isMounted) return;
          processCoords(position.coords.latitude, position.coords.longitude);
        },
        (error: GeolocationPositionError) => {
          if (!isMounted) return;
          if (error.code === error.PERMISSION_DENIED) {
            setHasLocationAccess(false);
            try { localStorage.setItem('listme_location_access', 'false'); } catch {}
          }
        },
        { timeout: 6000, maximumAge: 300000 }
      );
    };

    let permissionStatus: PermissionStatus | null = null;
    if ('permissions' in nav && typeof nav.permissions.query === 'function') {
      nav.permissions.query({ name: 'geolocation' }).then((status) => {
        if (!isMounted) return;
        permissionStatus = status;
        const evaluatePermission = () => {
          if (!isMounted) return;
          if (status.state === 'denied') {
            setHasLocationAccess(false);
            try { localStorage.setItem('listme_location_access', 'false'); } catch {}
          } else if (status.state === 'granted') {
            setHasLocationAccess(true);
            try { localStorage.setItem('listme_location_access', 'true'); } catch {}
            requestPosition();
          } else {
            requestPosition();
          }
        };

        evaluatePermission();
        status.onchange = evaluatePermission;
      }).catch(() => {
        requestPosition();
      });
    } else {
      requestPosition();
    }

    return () => {
      isMounted = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  // Re-verify permission whenever search drawer opens
  useEffect(() => {
    if (!isSearchOpen || typeof window === 'undefined') return;
    const nav = window.navigator;
    if (!nav?.geolocation) {
      setHasLocationAccess(false);
      return;
    }
    if ('permissions' in nav && typeof nav.permissions.query === 'function') {
      nav.permissions.query({ name: 'geolocation' }).then((status) => {
        if (status.state === 'denied') {
          setHasLocationAccess(false);
          try { localStorage.setItem('listme_location_access', 'false'); } catch {}
        } else if (status.state === 'granted') {
          setHasLocationAccess(true);
          try { localStorage.setItem('listme_location_access', 'true'); } catch {}
        }
      }).catch(() => {});
    }
  }, [isSearchOpen]);

  const getListingTypeParam = (tab: SearchTabType) => {
    if (tab === 'Rent/PG') return 'rent';
    if (tab === 'Commercial') return 'commercial';
    return 'sale';
  };

  const handleCityClick = (city: string) => {
    const typeParam = getListingTypeParam(activeTab);
    saveRecentSearch(city);
    closeSearch();
    router.push(`/listings?type=${typeParam}&city=${encodeURIComponent(city)}`);
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
    if (ALL_CITIES.includes(term) || POPULAR_CITIES_INDIA.includes(term)) {
      router.push(`/listings?type=${typeParam}&city=${encodeURIComponent(term)}`);
      return;
    }
    router.push(`/listings?type=${typeParam}&query=${encodeURIComponent(term)}`);
  };

  const handleGeolocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setHasLocationAccess(false);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setHasLocationAccess(true);
          try { localStorage.setItem('listme_location_access', 'true'); } catch {}

          const finalCity = await detectCityFromCoords(latitude, longitude);
          setSelectedCity(finalCity);
          setSearchQuery('');
          try { localStorage.setItem('listme_user_city', finalCity); } catch {}
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setHasLocationAccess(false);
          try { localStorage.setItem('listme_location_access', 'false'); } catch {}
        }
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
  const isDelhiNcrQuery = queryLower === 'delhi ncr' || queryLower === 'ncr';
  const matchedLocalities: { city: string; locality: string }[] = [];
  if (queryLower.length >= 2) {
    for (const [city, localities] of Object.entries(POPULAR_LOCALITIES_BY_CITY)) {
      const cityMatches =
        city.toLowerCase().includes(queryLower) ||
        (city === 'Delhi' && (isDelhiNcrQuery || 'delhi ncr'.includes(queryLower)));
      if (cityMatches) {
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
          onTouchCancel={() => { touchStartY.current = null; }}
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
              placeholder={hasLocationAccess ? `Search in ${selectedCity}...` : "Try - Delhi NCR"}
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
              aria-label={isLocating ? 'Detecting your location...' : 'Use current location'}
              aria-busy={isLocating}
              title="Detect my current location"
            >
              <LocateFixed size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </form>
        </div>

        {/* Drawer Body */}
        <div className={styles.drawerBody}>
          {/* Real-time Query Suggestions */}
          {queryLower.length >= 2 && matchedLocalities.length > 0 && (
            <div className={styles.suggestionsList} role="listbox" aria-label="Search suggestions">
              {matchedLocalities.slice(0, 6).map((item, idx) => (
                <button
                  key={`${item.city}-${item.locality}-${idx}`}
                  type="button"
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
                  <MapPin size={18} className={styles.suggestionIcon} aria-hidden="true" />
                  <div className={styles.suggestionText}>
                    <span className={styles.suggestionPrimary}>{item.locality}</span>
                    <span className={styles.suggestionSecondary}>{item.city}</span>
                  </div>
                  <ChevronRight size={16} className={styles.suggestionArrow} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {/* Popular Section: Localities (if location accessible) OR Cities in India (if location blocked) */}
          {queryLower.length < 2 && (
            <div className={styles.popularCard}>
              {hasLocationAccess ? (
                <>
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
                          const nextCity = ALL_CITIES[nextIndex];
                          setSelectedCity(nextCity);
                          try { localStorage.setItem('listme_user_city', nextCity); } catch {}
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
                        aria-label={`Explore properties in ${locality}, ${selectedCity}`}
                      >
                        <span className={styles.plusIcon} aria-hidden="true">+</span>
                        <span className={styles.localityLabel}>{locality}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.popularTitle}>
                    <span>
                      Popular Cities in <span className={styles.boldCity}>India</span>
                    </span>
                  </div>

                  <div className={styles.localityGrid}>
                    {POPULAR_CITIES_INDIA.map((city) => (
                      <button
                        key={city}
                        type="button"
                        className={styles.localityPill}
                        onClick={() => handleCityClick(city)}
                        aria-label={`Explore properties in ${city}`}
                      >
                        <span className={styles.plusIcon} aria-hidden="true">+</span>
                        <span className={styles.localityLabel}>{city}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
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
