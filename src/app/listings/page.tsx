'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, MapPin, Building, Bed, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { Card, Badge, Button, Input } from '@/components/ui';
import styles from './listings.module.css';

function ListingsSearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search parameters states
  const type = searchParams.get('type') || '';
  const city = searchParams.get('city') || searchParams.get('location') || '';
  const queryParam = searchParams.get('query') || '';
  
  const [listings, setListings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState(queryParam);
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
    setPropertyType(searchParams.get('property_type') || 'ALL');
    setMinPrice(searchParams.get('min_price') || '');
    setMaxPrice(searchParams.get('max_price') || '');
    setBhk(searchParams.get('bhk') || 'ALL');
    setFurnishing(searchParams.get('furnishing') || 'ALL');
    setSort(searchParams.get('sort') || 'newest');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  // Construct URL and fetch listings
  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (city) params.append('city', city);
      if (searchQuery) params.append('query', searchQuery);
      if (propertyType !== 'ALL') params.append('property_type', propertyType);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      if (bhk !== 'ALL') params.append('bhk', bhk);
      if (furnishing !== 'ALL') params.append('furnishing', furnishing);
      if (sort) params.append('sort', sort);
      params.append('page', page.toString());
      params.append('limit', '12');

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setListings(data.listings || []);
        setTotal(data.meta?.total || 0);
        setTotalPages(data.meta?.totalPages || 1);
      }
    } catch (err) {
      console.error('Search fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [type, city, searchQuery, propertyType, minPrice, maxPrice, bhk, furnishing, sort, page]);

  // Apply filters by pushing to URL router
  const applyFilters = () => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (city) params.append('city', city);
    if (searchQuery) params.append('query', searchQuery);
    if (propertyType !== 'ALL') params.append('property_type', propertyType);
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
        if (city) {
          parts.push(city.charAt(0).toUpperCase() + city.slice(1));
        }
        if (type) {
          parts.push(type === 'sale' ? 'For Sale' : type === 'rent' ? 'For Rent' : type);
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

  return (
    <div className={`${styles.container} container`}>
      {/* Title */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800 }}>
          Properties for {type === 'sale' ? 'Sale' : type === 'rent' ? 'Rent' : 'Commercial'} 
          {city ? ` in ${city.charAt(0).toUpperCase() + city.slice(1)}` : ''}
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
              placeholder="Search keyword..."
              leftIcon={<Search size={16} />}
              fullWidth
            />
          </div>

          {/* Property Type */}
          <div className={styles.filterGroup}>
            <label className={styles.filterTitle}>Property Type</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={styles.sortingSelect}
              style={{ width: '100%' }}
            >
              <option value="ALL">All Categories</option>
              <option value="APARTMENT">Apartment / Flat</option>
              <option value="HOUSE">Independent House</option>
              <option value="VILLA">Villa</option>
              <option value="PLOT">Plot / Land</option>
              <option value="OFFICE">Office Space</option>
              <option value="SHOP">Shop / Retail</option>
              <option value="PG">PG / Hostel</option>
            </select>
          </div>

          {/* Pricing Range */}
          <div className={styles.filterGroup}>
            <label className={styles.filterTitle}>Price Range (INR)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="Min"
                fullWidth
              />
              <Input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
                placeholder="Max"
                fullWidth
              />
            </div>
          </div>

          {/* BHK Configuration */}
          <div className={styles.filterGroup}>
            <label className={styles.filterTitle}>Configuration</label>
            <select
              value={bhk}
              onChange={(e) => setBhk(e.target.value)}
              className={styles.sortingSelect}
              style={{ width: '100%' }}
            >
              <option value="ALL">Any BHK</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4 BHK</option>
              <option value="5">5+ BHK</option>
            </select>
          </div>

          {/* Furnishing Status */}
          <div className={styles.filterGroup}>
            <label className={styles.filterTitle}>Furnishing</label>
            <select
              value={furnishing}
              onChange={(e) => setFurnishing(e.target.value)}
              className={styles.sortingSelect}
              style={{ width: '100%' }}
            >
              <option value="ALL">Any Furnishing</option>
              <option value="FURNISHED">Fully Furnished</option>
              <option value="SEMI_FURNISHED">Semi Furnished</option>
              <option value="UNFURNISHED">Unfurnished</option>
            </select>
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
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sort By:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={styles.sortingSelect}
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="area_desc">Area: High to Low</option>
              </select>
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
              {listings.map((item) => (
                <Card 
                  key={item.id} 
                  className={styles.propertyCard} 
                  hoverable 
                  clickable
                  onClick={() => router.push(`/property/${item.id}`)}
                >
                  <div className={styles.cardImageArea}>
                    <Badge variant="secondary" className={styles.cardBadge}>
                      {item.listingFor}
                    </Badge>
                    <div className={styles.cardPrice}>
                      {formatPrice(item.askingPrice)}
                    </div>
                    {item.images?.[0]?.imageUrl ? (
                      <img
                        src={item.images[0].imageUrl}
                        alt={item.title}
                        className={styles.cardImage}
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
                      {item.bedrooms && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Bed size={14} /> {item.bedrooms} BHK
                          </div>
                          <span className={styles.specDivider} />
                        </>
                      )}
                      {item.carpetArea && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Square size={12} /> {item.carpetArea} sqft
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-secondary-dark)' }}>
                      DIRECT FROM OWNER
                    </span>
                    <Button variant="ghost" size="sm" style={{ padding: '0 0.5rem', minHeight: 'auto' }}>
                      View Details
                    </Button>
                  </div>
                </Card>
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
