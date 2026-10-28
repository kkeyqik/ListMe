'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, Building, Bed, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { Card, Badge, Button, Input, Select } from '@/components/ui';
import { SaveButton } from '@/components/ui/SaveButton';
import styles from './listings.module.css';

// Params that must never be forwarded from the public URL to the API
// (owner/admin modes need auth and would 401/403 for visitors).
const PRIVATE_API_PARAMS = new Set(['owner', 'admin', 'status', 'limit', 'source']);

// Params managed by the sidebar form; everything else in the URL is preserved as-is.
const SIDEBAR_PARAMS = ['type', 'city', 'location', 'query', 'property_type', 'property_types', 'min_price', 'max_price', 'bhk', 'furnishing', 'sort', 'page'];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartment / Flat',
  BUILDER_FLOOR: 'Builder Floor',
  HOUSE: 'Independent House',
  VILLA: 'Villa',
  PENTHOUSE: 'Penthouse',
  STUDIO: 'Studio / 1 RK',
  FARM_HOUSE: 'Farm House',
  PLOT: 'Plot / Land',
  PG: 'PG / Hostel',
  OFFICE: 'Office Space',
  SHOP: 'Shop / Retail',
  WAREHOUSE: 'Warehouse / Industrial',
  COMMERCIAL_LAND: 'Commercial Land',
};

const titleCase = (value: string) =>
  value.replace(/\b\w/g, (c) => c.toUpperCase());

function ListingsSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search parameters states
  const type = searchParams.get('type') || '';
  const city = searchParams.get('city') || searchParams.get('location') || '';
  const locality = searchParams.get('locality') || '';
  const queryParam = searchParams.get('query') || '';

  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [listingType, setListingType] = useState(type || 'ALL');
  const [cityInput, setCityInput] = useState(city);
  const [propertyType, setPropertyType] = useState(searchParams.get('property_type') || 'ALL');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [bhk, setBhk] = useState(searchParams.get('bhk') || 'ALL');
  const [furnishing, setFurnishing] = useState(searchParams.get('furnishing') || 'ALL');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Sync state with URL change
  useEffect(() => {
    setSearchQuery(searchParams.get('query') || '');
    setListingType(searchParams.get('type') || 'ALL');
    setCityInput(searchParams.get('city') || searchParams.get('location') || '');
    setPropertyType(searchParams.get('property_type') || 'ALL');
    setMinPrice(searchParams.get('min_price') || '');
    setMaxPrice(searchParams.get('max_price') || '');
    setBhk(searchParams.get('bhk') || 'ALL');
    setFurnishing(searchParams.get('furnishing') || 'ALL');
    setSort(searchParams.get('sort') || 'newest');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  // Construct URL and fetch listings
  const fetchResults = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      // Forward every filter in the URL (locality, possession, area, commercial_trade, ...)
      // so nothing chosen in the search UI is silently dropped.
      const params = new URLSearchParams();
      searchParams.forEach((value, key) => {
        if (!value || value === 'ALL' || PRIVATE_API_PARAMS.has(key)) return;
        if (key === 'location') {
          if (!searchParams.get('city')) params.set('city', value);
          return;
        }
        params.append(key, value);
      });
      if (!params.get('sort')) params.set('sort', 'newest');
      if (!params.get('page')) params.set('page', '1');
      params.set('limit', '12');

      const res = await fetch(`/api/listings?${params.toString()}`, { signal });
      const data = await res.json();
      if (res.ok) {
        setListings(data.listings || []);
        setTotal(data.meta?.total || 0);
        setTotalPages(data.meta?.totalPages || 1);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Search fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchResults(controller.signal);
    return () => controller.abort();
  }, [searchParams]);

  // Apply filters by pushing to URL router
  const applyFilters = () => {
    // Keep URL filters the sidebar doesn't manage (locality, possession, area, ...)
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (!SIDEBAR_PARAMS.includes(key)) params.append(key, value);
    });
    const nextCity = cityInput.trim();
    if (listingType !== 'ALL') params.append('type', listingType);
    else if (type === 'project') params.append('type', type);
    if (nextCity) params.append('city', nextCity);
    if (nextCity.toLowerCase() !== city.toLowerCase()) params.delete('locality');
    if (searchQuery) params.append('query', searchQuery);
    if (propertyType !== 'ALL') params.append('property_type', propertyType);
    else if (searchParams.get('property_types')) params.append('property_types', searchParams.get('property_types') as string);
    if (minPrice) params.append('min_price', minPrice);
    if (maxPrice) params.append('max_price', maxPrice);
    if (bhk !== 'ALL') params.append('bhk', bhk);
    if (furnishing !== 'ALL') params.append('furnishing', furnishing);
    if (sort) params.append('sort', sort);
    params.append('page', '1'); // reset page on search

    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        const existing = localStorage.getItem('listme_recent_searches');
        let searches = existing ? JSON.parse(existing) : [];
        if (!Array.isArray(searches)) searches = [];

        const parts = [];
        if (searchQuery) {
          parts.push(`"${searchQuery}"`);
        }
        if (nextCity) {
          parts.push(nextCity.charAt(0).toUpperCase() + nextCity.slice(1));
        }
        if (listingType !== 'ALL') {
          parts.push(listingType === 'sale' ? 'For Sale' : listingType === 'rent' ? 'For Rent' : listingType);
        }
        if (propertyType !== 'ALL') {
          parts.push(propertyType.charAt(0).toUpperCase() + propertyType.slice(1).toLowerCase());
        }
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

    router.push(`/listings?${params.toString()}`);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    params.set('page', '1');
    router.push(`/listings?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/listings?${params.toString()}`);
  };

  const formatPrice = (price: string) => {
    const val = parseFloat(price);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lk`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Heading reflects the actual filters instead of defaulting to "Commercial"
  const activePropertyType = (searchParams.get('property_type') || '').toUpperCase();
  const typeNoun = PROPERTY_TYPE_LABELS[activePropertyType]
    || (type === 'commercial' ? 'Commercial Properties' : type === 'project' ? 'New Projects' : 'Properties');
  const bhkNum = parseInt(searchParams.get('bhk') || '', 10);
  const bhkPrefix = Number.isFinite(bhkNum) && bhkNum > 0 ? `${bhkNum >= 5 ? '5+' : bhkNum} BHK ` : '';
  const purpose = type === 'sale' ? ' for Sale' : type === 'rent' ? ' for Rent' : '';
  const place = [locality, city].filter(Boolean).map(titleCase).join(', ');
  const heading = `${bhkPrefix}${typeNoun}${purpose}${place ? ` in ${place}` : ''}`;

  return (
    <div className={`${styles.container} container`}>
      {/* Title */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800 }}>
          {heading}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.937rem', marginTop: '0.25rem' }}>
          Browse verified owner property listings with zero brokerage fee.
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className={styles.layout}>
        {/* Left Side: Filter form */}
        <aside className={styles.filtersSidebar}>
          <div className={styles.filterGroup} style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
              aria-label="Search keyword"
              placeholder="Search keyword..."
              leftIcon={<Search size={16} />}
              fullWidth
            />
          </div>

          {/* Buy / Rent / Commercial */}
          <div className={styles.filterGroup}>
            <label className={styles.filterTitle} htmlFor="filter-looking-to">Looking To</label>
            <Select
              size="sm"
              fullWidth
              id="filter-looking-to"
              value={listingType}
              onChange={(e) => setListingType(e.target.value)}
              options={[
                { value: 'ALL', label: type === 'project' ? 'New Projects' : 'Buy or Rent' },
                { value: 'sale', label: 'Buy' },
                { value: 'rent', label: 'Rent' },
                { value: 'commercial', label: 'Commercial' },
              ]}
            />
          </div>

          {/* City */}
          <div className={styles.filterGroup}>
            <label className={styles.filterTitle} htmlFor="filter-city">City</label>
            <Input
              id="filter-city"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
              placeholder="Any city"
              leftIcon={<MapPin size={16} />}
              fullWidth
            />
          </div>

          {/* Property Type */}
          <div className={styles.filterGroup}>
            <label className={styles.filterTitle} htmlFor="filter-property-type">Property Type</label>
            <Select
              size="sm"
              fullWidth
              id="filter-property-type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Categories' },
                ...Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </div>

          {/* Pricing Range */}
          <div className={styles.filterGroup}>
            <span className={styles.filterTitle} id="filter-price-label">Price Range (INR)</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                placeholder="Min"
                aria-label="Minimum price (INR)"
                inputMode="numeric"
                fullWidth
              />
              <Input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                placeholder="Max"
                aria-label="Maximum price (INR)"
                inputMode="numeric"
                fullWidth
              />
            </div>
          </div>

          {/* BHK Configuration */}
          <div className={styles.filterGroup}>
            <label className={styles.filterTitle} htmlFor="filter-bhk">Configuration</label>
            <Select
              size="sm"
              fullWidth
              id="filter-bhk"
              value={bhk}
              onChange={(e) => setBhk(e.target.value)}
              options={[
                { value: 'ALL', label: 'Any BHK' },
                { value: '1', label: '1 BHK' },
                { value: '2', label: '2 BHK' },
                { value: '3', label: '3 BHK' },
                { value: '4', label: '4 BHK' },
                { value: '5', label: '5+ BHK' },
              ]}
            />
          </div>

          {/* Furnishing Status */}
          <div className={styles.filterGroup}>
            <label className={styles.filterTitle} htmlFor="filter-furnishing">Furnishing</label>
            <Select
              size="sm"
              fullWidth
              id="filter-furnishing"
              value={furnishing}
              onChange={(e) => setFurnishing(e.target.value)}
              options={[
                { value: 'ALL', label: 'Any Furnishing' },
                { value: 'FURNISHED', label: 'Fully Furnished' },
                { value: 'SEMI_FURNISHED', label: 'Semi Furnished' },
                { value: 'UNFURNISHED', label: 'Unfurnished' },
              ]}
            />
          </div>

          <Button onClick={applyFilters} variant="primary" fullWidth>
            Apply Filters
          </Button>
        </aside>

        {/* Right Side: Results Area */}
        <div className={styles.mainArea}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.resultsCount}>
              Showing <strong>{listings.length}</strong> of <strong>{total}</strong> listings
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Sort By:</span>
              <Select
                size="sm"
                value={sort}
                aria-label="Sort listings"
                onChange={(e) => handleSortChange(e.target.value)}
                options={[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'price_asc', label: 'Price: Low to High' },
                  { value: 'price_desc', label: 'Price: High to Low' },
                  { value: 'area_desc', label: 'Area: High to Low' },
                ]}
              />
            </div>
          </div>

          {/* Listings Cards Grid */}
          {loading ? (
            <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading properties...
            </div>
          ) : listings.length === 0 ? (
            <Card padding="lg" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <Building size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
              <h3>No matching listings found</h3>
              <p>Try loosening your search filters to find more properties.</p>
            </Card>
          ) : (
            <div className={styles.grid}>
              {listings.map((item, index) => (
                <div key={item.id} className={styles.cardWrap}>
                <Link href={`/property/${item.id}`} className={styles.cardLink}>
                <Card
                  className={styles.propertyCard}
                  hoverable
                >
                  <div className={styles.cardImageArea}>
                    <Badge variant="secondary" className={styles.cardBadge}>
                      {item.listingFor === 'RENT' ? 'For Rent' : item.listingFor === 'SALE' ? 'For Sale' : item.listingFor}
                    </Badge>
                    <div className={styles.cardPrice}>
                      {formatPrice(item.askingPrice)}
                      {item.listingFor === 'RENT' && <span className={styles.priceUnit}>/month</span>}
                    </div>
                    {item.images?.[0]?.imageUrl ? (
                      <img
                        src={item.images[0].imageUrl}
                        alt={item.title}
                        className={styles.cardImage}
                        loading={index < 3 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    ) : (
                      <Building size={64} style={{ color: 'var(--color-neutral-300)' }} />
                    )}
                  </div>

                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <div className={styles.cardLocation}>
                      <MapPin size={12} style={{ color: 'var(--color-primary)' }} />
                      <span>{item.locality}, {item.city}</span>
                    </div>

                    <div className={styles.cardSpecs}>
                      {item.bedrooms > 0 && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Bed size={14} /> {item.bedrooms} BHK
                          </div>
                          <span className={styles.specDivider} />
                        </>
                      )}
                      {(item.carpetArea || item.plotArea) > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Square size={12} /> {item.carpetArea || item.plotArea} sqft
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-secondary-dark)' }}>
                      DIRECT FROM OWNER
                    </span>
                    <span className={styles.viewDetails} aria-hidden="true">
                      View Details
                    </span>
                  </div>
                </Card>
                </Link>
                <SaveButton
                  listingId={item.id}
                  className={styles.saveButton}
                  activeClassName={styles.saveButtonActive}
                />
                </div>
              ))}
            </div>
          )}

          {/* Pagination Toolbar */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className={styles.pageNumber}>
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                variant="outline"
                size="sm"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ListingsSearch() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Suspense fallback={<div className="container" style={{ paddingTop: '8rem', textAlign: 'center' }}>Loading Search Portal...</div>}>
          <ListingsSearchContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
