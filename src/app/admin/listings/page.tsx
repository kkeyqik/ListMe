'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Building, 
  Search, 
  Filter, 
  Check, 
  X, 
  Eye, 
  Edit, 
  Trash2, 
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Calendar,
  MoreVertical,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { useToast, Button, Input, Card, Badge, Modal } from '@/components/ui';
import styles from '../admin.module.css';
import { downloadCSV } from '@/lib/export-utils';

export default function AdminListings() {
  const { showToast } = useToast();
  
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [forFilter, setForFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);
  
  // Sort and mobile UI states
  const [sortBy, setSortBy] = useState<'LATEST' | 'OLDEST' | 'PRICE_ASC' | 'PRICE_DESC'>('LATEST');
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [citiesList, setCitiesList] = useState<string[]>([
    'Delhi',
    'Noida',
    'Gurgaon',
    'Mumbai',
    'Bengaluru',
    'Pune',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Jaipur',
    'Ahmedabad'
  ]);
  
  // Moderate action states
  const [actionId, setActionId] = useState<string | null>(null);
  
  // Rejection modal states
  const [rejectListingId, setRejectListingId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('Duplicate Listing / Spam');
  const [otherReason, setOtherReason] = useState<string>('');
  const [rejectLoading, setRejectLoading] = useState(false);
  
  // Delete listing state
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load cities from API
  useEffect(() => {
    async function loadCities() {
      try {
        const res = await fetch('/api/cities');
        if (res.ok) {
          const data = await res.json();
          if (data.cities && Array.isArray(data.cities) && data.cities.length > 0) {
            const names = data.cities.map((c: any) => c.name).filter(Boolean);
            setCitiesList((prev) => Array.from(new Set([...prev, ...names])));
          }
        }
      } catch (err) {
        // keep fallback
      }
    }
    loadCities();
  }, []);

  // Close active card dropdown on click outside
  useEffect(() => {
    const handleWindowClick = () => {
      setActiveDropdownId(null);
    };
    if (activeDropdownId) {
      window.addEventListener('click', handleWindowClick);
      return () => window.removeEventListener('click', handleWindowClick);
    }
  }, [activeDropdownId]);

  const getFormattedTitle = (listing: any) => {
    if (listing.bedrooms && (listing.propertyType === 'APARTMENT' || listing.propertyType === 'BUILDER_FLOOR' || listing.propertyType === 'HOUSE' || listing.propertyType === 'VILLA')) {
      const typeLabel = 
        listing.propertyType === 'APARTMENT' ? 'Apartment' :
        listing.propertyType === 'BUILDER_FLOOR' ? 'Builder Floor' :
        listing.propertyType === 'HOUSE' ? 'House' : 'Villa';
      return `${listing.bedrooms} BHK ${typeLabel}`;
    }
    if (listing.propertyType === 'PLOT' || listing.propertyType === 'COMMERCIAL_LAND') {
      return 'Plot / Land';
    }
    if (listing.propertyType === 'BUILDER_FLOOR') {
      return 'Independent / Builder Floor';
    }
    return listing.title || 'Property';
  };

  const fetchListings = useCallback(async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        admin: 'true',
        page: targetPage.toString(),
        limit: targetPageSize.toString(),
      });

      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'COMMERCIAL') {
          params.append('type', 'commercial');
        } else {
          params.append('property_type', typeFilter);
        }
      }
      if (forFilter !== 'ALL') {
        params.append('listing_for', forFilter.toLowerCase());
        params.append('type', forFilter.toLowerCase());
      }
      if (cityFilter.trim()) {
        params.append('city', cityFilter.trim());
      }
      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      // Map sortBy to API sort parameter
      let sortParam = 'newest';
      if (sortBy === 'OLDEST') sortParam = 'oldest';
      else if (sortBy === 'PRICE_ASC') sortParam = 'price_asc';
      else if (sortBy === 'PRICE_DESC') sortParam = 'price_desc';
      params.append('sort', sortParam);
        
      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setListings(data.listings || []);
        if (data.meta) {
          setTotalCount(data.meta.total || 0);
          setTotalPages(data.meta.totalPages || 1);
        }
      } else {
        showToast('Error', data.message || 'Failed to retrieve listings', 'error');
      }
    } catch (err) {
      console.error('Error fetching admin listings:', err);
      showToast('Error', 'Failed to retrieve property listings database', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, typeFilter, forFilter, cityFilter, searchQuery, sortBy, startDate, endDate, showToast]);

  // Initial and pagination fetch
  useEffect(() => {
    fetchListings(page, pageSize);
  }, [page, pageSize]);

  // Refetch when filters or sort change (reset page to 1)
  const isFilterMounted = React.useRef(false);
  useEffect(() => {
    if (!isFilterMounted.current) {
      isFilterMounted.current = true;
      return;
    }
    if (page === 1) {
      fetchListings(1, pageSize);
    } else {
      setPage(1);
    }
  }, [statusFilter, typeFilter, forFilter, sortBy, startDate, endDate]);

  // Refetch when search query or city changes with debounce
  const isSearchMounted = React.useRef(false);
  useEffect(() => {
    if (!isSearchMounted.current) {
      isSearchMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchListings(1, pageSize);
      } else {
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, cityFilter]);

  const handleModerate = async (id: string, newStatus: 'ACTIVE' | 'REJECTED', reason?: string): Promise<boolean> => {
    setActionId(id);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          rejectionReason: newStatus === 'REJECTED' ? reason : null
        }),
      });

      if (res.ok) {
        showToast('Success', `Property has been marked as ${newStatus.toLowerCase()}`, 'success');
        // Update local listing status
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: newStatus, rejectionReason: newStatus === 'REJECTED' ? reason : null } : l))
        );
        return true;
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Action failed', 'error');
        return false;
      }
    } catch (err) {
      console.error('Moderation error:', err);
      showToast('Error', 'Something went wrong', 'error');
      return false;
    } finally {
      setActionId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectListingId) return;
    setRejectLoading(true);
    const finalReason = selectedReason === 'Other' ? otherReason : selectedReason;
    
    try {
      const success = await handleModerate(rejectListingId, 'REJECTED', finalReason);
      if (success) {
        setRejectListingId(null);
        setSelectedReason('Duplicate Listing / Spam');
        setOtherReason('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRejectLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!deleteListingId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/listings/${deleteListingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Success', 'Listing deleted successfully from system', 'success');
        setListings((prev) => prev.filter((l) => l.id !== deleteListingId));
        setTotalCount((prev) => Math.max(0, prev - 1));
        setDeleteListingId(null);
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Deletion failed', 'error');
      }
    } catch (err) {
      console.error('Deletion error:', err);
      showToast('Error', 'Something went wrong', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatPrice = (price: any) => {
    if (price === undefined || price === null) return '₹0';
    const val = typeof price === 'string' ? parseFloat(price) : Number(price);
    if (isNaN(val)) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lk`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Filter listings by text search
  const filteredListings = listings.filter((l) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = !searchLower ||
      (l.title || '').toLowerCase().includes(searchLower) ||
      (l.id || '').toLowerCase().includes(searchLower) ||
      (l.city || '').toLowerCase().includes(searchLower) ||
      (l.locality || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    const matchesType =
      typeFilter === 'ALL' ||
      l.propertyType === typeFilter ||
      (typeFilter === 'COMMERCIAL' && ['OFFICE', 'SHOP', 'WAREHOUSE', 'COMMERCIAL_LAND'].includes(l.propertyType));
    const matchesFor = forFilter === 'ALL' || l.listingFor === forFilter;
    const matchesCity = cityFilter === '' || (l.city || '').toLowerCase().includes(cityFilter.toLowerCase());

    let matchesDate = true;
    if (startDate || endDate) {
      const lDate = new Date(l.createdAt);
      if (!isNaN(lDate.getTime())) {
        if (startDate) {
          const sDate = new Date(startDate);
          if (!isNaN(sDate.getTime())) {
            sDate.setHours(0, 0, 0, 0);
            if (lDate < sDate) matchesDate = false;
          }
        }
        if (endDate) {
          const eDate = new Date(endDate);
          if (!isNaN(eDate.getTime())) {
            eDate.setHours(23, 59, 59, 999);
            if (lDate > eDate) matchesDate = false;
          }
        }
      }
    }

    return matchesSearch && matchesStatus && matchesType && matchesFor && matchesCity && matchesDate;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'OLDEST') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === 'PRICE_ASC') {
      return Number(a.askingPrice) - Number(b.askingPrice);
    }
    if (sortBy === 'PRICE_DESC') {
      return Number(b.askingPrice) - Number(a.askingPrice);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      showToast('Info', 'Preparing full listings dataset for CSV export...', 'info');
      const params = new URLSearchParams({
        admin: 'true',
        limit: '10000',
        page: '1',
      });

      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'COMMERCIAL') {
          params.append('type', 'commercial');
        } else {
          params.append('property_type', typeFilter);
        }
      }
      if (forFilter !== 'ALL') {
        params.append('listing_for', forFilter.toLowerCase());
        params.append('type', forFilter.toLowerCase());
      }
      if (cityFilter.trim()) {
        params.append('city', cityFilter.trim());
      }
      if (searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json();
      
      let exportItems = (data.listings && Array.isArray(data.listings)) ? data.listings : listings;
      
      if (startDate || endDate) {
        exportItems = exportItems.filter((l: any) => {
          const lDate = new Date(l.createdAt);
          if (startDate) {
            const sDate = new Date(startDate);
            sDate.setHours(0, 0, 0, 0);
            if (lDate < sDate) return false;
          }
          if (endDate) {
            const eDate = new Date(endDate);
            eDate.setHours(23, 59, 59, 999);
            if (lDate > eDate) return false;
          }
          return true;
        });
      }

      const exportData = exportItems.map((l: any) => ({
        ID: l.id,
        Title: l.title,
        PropertyType: l.propertyType,
        ListingFor: l.listingFor,
        City: l.city,
        Locality: l.locality,
        AskingPrice: l.askingPrice,
        Status: l.status,
        RejectionReason: l.rejectionReason || 'None',
        CreatedAt: new Date(l.createdAt).toISOString()
      }));
      
      downloadCSV(exportData, `ListMe_All_Listings_Export_${new Date().toISOString().split('T')[0]}.csv`);
      showToast('Success', `Exported ${exportData.length} listings to CSV successfully!`, 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      showToast('Error', 'Failed to export listings report', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Header matching reference mockup */}
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h1 className={styles.title}>All Properties</h1>
          <p className={styles.subText}>Moderate, review, edit, or delete any listing submitted on ListMe.</p>
        </div>
        <div>
          <button 
            type="button"
            onClick={handleExportCSV} 
            disabled={exporting || loading}
            className={styles.exportPillBtn}
            aria-label="Export all listings"
          >
            <Download size={15} />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Mobile Toolbar (Screens < 768px) matching reference mockup */}
      <div className={`${styles.mobileToolbarWrapper} ${styles.mobileOnly}`}>
        {/* Search Input Box */}
        <div className={styles.mobileSearchBox}>
          <Search size={18} className={styles.mobileSearchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search listings by title, ID, or location..."
            className={styles.mobileSearchInput}
            style={searchQuery ? { paddingRight: '2.25rem' } : undefined}
            aria-label="Search listings by title, ID, or location"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.625rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'manipulation'
              }}
              aria-label="Clear search input"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Pill Row 1 */}
        <div className={styles.filterPillRow1}>
          <div className={styles.pillSelectWrapper}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.pillSelect}
              aria-label="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_REVIEW">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>

          <div className={styles.pillSelectWrapper}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={styles.pillSelect}
              aria-label="Filter by Property Type"
            >
              <option value="ALL">All Types</option>
              <option value="APARTMENT">Apartment</option>
              <option value="HOUSE">House</option>
              <option value="VILLA">Villa</option>
              <option value="BUILDER_FLOOR">Builder Floor</option>
              <option value="PLOT">Plot / Land</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>

          <div className={styles.pillSelectWrapper}>
            <select
              value={forFilter}
              onChange={(e) => setForFilter(e.target.value)}
              className={styles.pillSelect}
              aria-label="Filter by Listing For"
            >
              <option value="ALL">All Listing For</option>
              <option value="SALE">For Sale</option>
              <option value="RENT">For Rent</option>
            </select>
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>
        </div>

        {/* Filter Pill Row 2 */}
        <div className={styles.filterPillRow2}>
          <div className={styles.pillSelectWrapper}>
            <MapPin size={14} className={styles.pillLeftIcon} />
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className={`${styles.pillSelect} ${styles.pillSelectWithIcon}`}
              aria-label="Filter by City"
            >
              <option value="">All Cities</option>
              {citiesList.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>

          <div className={styles.pillSelectWrapper}>
            <Calendar size={14} className={styles.pillLeftIcon} />
            <button
              type="button"
              onClick={() => setShowDateModal(true)}
              className={`${styles.pillSelect} ${styles.pillSelectWithIcon} ${(startDate || endDate) ? styles.dateRangeActivePill : ''}`}
              style={{ textAlign: 'left', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              aria-label="Select Date Range"
            >
              {startDate || endDate ? `${startDate ? startDate.slice(5) : 'Start'} - ${endDate ? endDate.slice(5) : 'End'}` : 'Date Range'}
            </button>
            <ChevronDown size={14} className={styles.pillChevron} />
          </div>
        </div>

        {/* Results Count & Sort Row */}
        <div className={styles.resultsSortRow}>
          <div className={styles.resultsCount}>
            <strong>{totalCount || filteredListings.length}</strong> Properties
          </div>
          <div className={styles.sortWrapper}>
            <span>Sort by</span>
            <div style={{ position: 'relative' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={styles.sortPillSelect}
                aria-label="Sort listings"
              >
                <option value="LATEST">Latest</option>
                <option value="OLDEST">Oldest</option>
                <option value="PRICE_ASC">Price: Low to High</option>
                <option value="PRICE_DESC">Price: High to Low</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Toolbar (Screens >= 768px) */}
      <div className={styles.desktopOnly}>
        <Card padding="md" style={{ marginBottom: '1.5rem' }}>
        <div className={styles.filterContainer}>
          {/* Top row: Search input + Clear filters */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '260px' }}>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search listings by title, ID, or location..."
                aria-label="Search listings by title, ID, or location"
                leftIcon={<Search size={18} />}
                fullWidth
              />
            </div>
            {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || forFilter !== 'ALL' || cityFilter || startDate || endDate || searchQuery) && (
              <button
                type="button"
                className={styles.clearFilterBtn}
                onClick={() => {
                  setPage(1);
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                  setForFilter('ALL');
                  setCityFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
                title="Reset all search queries and filters"
                aria-label="Reset all search queries and filters"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Row 2: Categorical and date filters */}
          <div className={styles.filterRow}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
              title="Filter by Status"
              aria-label="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="REJECTED">Rejected</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={styles.filterSelect}
              title="Filter by Property Type"
              aria-label="Filter by Property Type"
            >
              <option value="ALL">All Types</option>
              <option value="APARTMENT">Apartment</option>
              <option value="HOUSE">House</option>
              <option value="VILLA">Villa</option>
              <option value="BUILDER_FLOOR">Builder Floor</option>
              <option value="PLOT">Plot/Land</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>

            <select
              value={forFilter}
              onChange={(e) => setForFilter(e.target.value)}
              className={styles.filterSelect}
              title="Filter by Listing For"
              aria-label="Filter by Listing For"
            >
              <option value="ALL">All Listing For</option>
              <option value="SALE">For Sale</option>
              <option value="RENT">For Rent</option>
            </select>

            <div style={{ flex: 1, minWidth: '140px' }} className={styles.cityFilterInput}>
              <Input
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Filter by City..."
                aria-label="Filter by City"
                fullWidth
              />
            </div>

            <div className={styles.dateFilterGroup}>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Listed After"
                className={styles.dateInput}
              />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>to</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="Listed Before"
                className={styles.dateInput}
              />
            </div>
          </div>
        </div>
      </Card>
      </div>

      {/* Table grid */}
      {loading ? (
        <Card padding="md">Loading listings...</Card>
      ) : filteredListings.length === 0 ? (
        <div className={styles.emptyState}>
          <Building size={48} style={{ opacity: 0.3 }} />
          <h3>No property listings found</h3>
          <p>Try changing your filters or searching keywords.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={`${styles.tableContainer} ${styles.desktopOnly}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ width: '38%' }}>Property details</th>
                  <th className={styles.th} style={{ width: '16%' }}>Type</th>
                  <th className={styles.th} style={{ width: '16%' }}>Price</th>
                  <th className={styles.th} style={{ width: '14%' }}>Status</th>
                  <th className={styles.th} style={{ width: '16%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedListings.map((listing) => (
                  <tr key={listing.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.titleText}>{listing.title}</div>
                      <div className={styles.subTextInfo}>
                        {listing.locality}, {listing.city} · ID: {listing.id.substring(0, 8)}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <Badge variant="neutral" size="sm">
                        {listing.listingFor} · {listing.propertyType.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className={styles.td}>{formatPrice(listing.askingPrice)}</td>
                    <td className={styles.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                        <Badge 
                          variant={
                            listing.status === 'ACTIVE' ? 'success' :
                            listing.status === 'PENDING_REVIEW' ? 'warning' :
                            listing.status === 'REJECTED' ? 'error' : 'neutral'
                          }
                          size="sm"
                        >
                          {listing.status.replace('_', ' ')}
                        </Badge>
                        {listing.status === 'REJECTED' && listing.rejectionReason && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic', maxWidth: '200px', display: 'block' }}>
                            Reason: {listing.rejectionReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'right' }}>
                      <div className={styles.actionBtnGroup} style={{ justifyContent: 'flex-end' }}>
                        {/* Moderation approval triggers */}
                        {listing.status === 'PENDING_REVIEW' && (
                          <>
                            <Button
                              onClick={() => handleModerate(listing.id, 'ACTIVE')}
                              variant="primary"
                              size="sm"
                              style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                              disabled={actionId === listing.id}
                              aria-label="Approve listing"
                              title="Approve Listing"
                            >
                              <Check size={14} /> Approve
                            </Button>
                            <Button
                              onClick={() => setRejectListingId(listing.id)}
                              variant="danger"
                              size="sm"
                              style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                              disabled={actionId === listing.id}
                              aria-label="Reject listing"
                              title="Reject Listing"
                            >
                              <X size={14} /> Reject
                            </Button>
                          </>
                        )}
                        
                        <Button href={`/property/${listing.id}`} variant="ghost" size="sm" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }} aria-label="View property" title="View Property">
                          <Eye size={14} />
                        </Button>
                        <Button href={`/dashboard/listings/${listing.id}/edit`} variant="ghost" size="sm" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }} aria-label="Edit property" title="Edit Property">
                          <Edit size={14} />
                        </Button>
                        <Button
                          onClick={() => setDeleteListingId(listing.id)}
                          variant="ghost"
                          size="sm"
                          style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', color: 'var(--color-error)' }}
                          aria-label="Delete property"
                          title="Delete Property"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (Screens < 768px) matching reference mockup */}
          <div className={`${styles.mobileCardsList} ${styles.mobileOnly}`}>
            {sortedListings.map((listing) => {
              const primaryImage = listing.images?.find((img: any) => img.isPrimary)?.imageUrl || listing.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop&q=80';
              const photoCount = listing.images?.length || 0;
              const formattedTitle = getFormattedTitle(listing);
              const shortId = listing.id ? listing.id.substring(0, 8) : '12742133';
              const ownerName = listing.owner?.name || 'Unknown Owner';
              const listedDate = new Date(listing.createdAt).toLocaleDateString('en-GB');
              const isDropdownOpen = activeDropdownId === listing.id;

              return (
                <div key={listing.id} className={styles.propertyCard}>
                  {/* Top Content Block */}
                  <div className={styles.cardTopBlock}>
                    {/* Left: Thumbnail with status and photo counter */}
                    <div className={styles.thumbnailWrapper}>
                      <img
                        src={primaryImage}
                        alt={listing.title}
                        className={styles.thumbnailImg}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                      <span className={`${styles.statusBadgeTop} ${
                        listing.status === 'ACTIVE' ? styles.statusActive :
                        listing.status === 'PENDING_REVIEW' ? styles.statusPending :
                        listing.status === 'REJECTED' ? styles.statusRejected :
                        styles.statusInactive
                      }`}>
                        {listing.status === 'ACTIVE' ? 'ACTIVE' :
                         listing.status === 'PENDING_REVIEW' ? 'PENDING' :
                         listing.status === 'REJECTED' ? 'REJECTED' : 'INACTIVE'}
                      </span>
                      {photoCount > 0 && (
                        <span className={styles.photoCountBadge}>
                          <ImageIcon size={11} /> {photoCount}
                        </span>
                      )}
                    </div>

                    {/* Right: Info Block */}
                    <div className={styles.cardInfoBlock}>
                      <div className={styles.cardTitleRow}>
                        <h3 className={styles.cardPropertyTitle} title={listing.title}>
                          {formattedTitle}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(isDropdownOpen ? null : listing.id);
                          }}
                          className={styles.cardMoreBtn}
                          aria-label="More options"
                          aria-expanded={isDropdownOpen}
                          aria-haspopup="true"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* 3-dots Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className={styles.cardDropdownMenu} onClick={(e) => e.stopPropagation()}>
                            {listing.status === 'PENDING_REVIEW' && (
                              <>
                                <button
                                  type="button"
                                  className={styles.cardDropdownItem}
                                  style={{ color: '#10b981' }}
                                  disabled={actionId === listing.id}
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleModerate(listing.id, 'ACTIVE');
                                  }}
                                >
                                  <Check size={14} /> Approve
                                </button>
                                <button
                                  type="button"
                                  className={styles.cardDropdownItem}
                                  style={{ color: '#ef4444' }}
                                  disabled={actionId === listing.id}
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setRejectListingId(listing.id);
                                  }}
                                >
                                  <X size={14} /> Reject
                                </button>
                              </>
                            )}
                            <Link
                              href={`/dashboard/listings/${listing.id}/edit`}
                              className={styles.cardDropdownItem}
                              onClick={() => setActiveDropdownId(null)}
                            >
                              <Edit size={14} /> Edit Details
                            </Link>
                            <button
                              type="button"
                              className={styles.cardDropdownItem}
                              style={{ color: '#ef4444' }}
                              onClick={() => {
                                setActiveDropdownId(null);
                                setDeleteListingId(listing.id);
                              }}
                            >
                              <Trash2 size={14} /> Delete Listing
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Price Row */}
                      <div className={styles.cardPriceRow}>
                        <span className={styles.cardPrice}>{formatPrice(listing.askingPrice)}</span>
                        <span className={styles.cardTypeBadge}>
                          {listing.listingFor} · {listing.propertyType.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Location */}
                      <div className={styles.cardMetaLocation}>
                        <MapPin size={12} />
                        <span>{listing.locality ? `${listing.locality}, ${listing.city}` : listing.city}</span>
                      </div>

                      {/* ID */}
                      <div className={styles.cardMetaId}>
                        <FileText size={12} />
                        <span>ID: {shortId}</span>
                      </div>

                      {/* Divider */}
                      <div className={styles.cardFooterDivider} />

                      {/* Owner and Date */}
                      <div className={styles.cardOwnerDateRow}>
                        <div className={styles.cardMetaCol}>
                          <span className={styles.cardMetaSubLabel}>Owner</span>
                          <span className={styles.cardMetaSubVal}>{ownerName}</span>
                        </div>
                        <div className={styles.cardMetaCol} style={{ textAlign: 'right' }}>
                          <span className={styles.cardMetaSubLabel}>Listed Date</span>
                          <span className={styles.cardMetaSubVal}>{listedDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection notice if rejected */}
                  {listing.status === 'REJECTED' && listing.rejectionReason && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-error)', backgroundColor: 'rgba(239, 68, 68, 0.06)', padding: '0.375rem 0.625rem', borderRadius: '6px', borderLeft: '3px solid var(--color-error)', marginTop: '0.625rem' }}>
                      <strong>Reason:</strong> {listing.rejectionReason}
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className={styles.cardActionRow}>
                    <Link
                      href={`/property/${listing.id}`}
                      className={styles.viewPropertyBtn}
                      aria-label="View property details"
                    >
                      <Eye size={16} /> View Property
                    </Link>
                    <Link
                      href={`/dashboard/listings/${listing.id}/edit`}
                      className={styles.editActionBtn}
                      aria-label="Edit listing"
                      title="Edit Listing"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteListingId(listing.id);
                      }}
                      className={styles.deleteActionBtn}
                      title="Delete Listing"
                      aria-label="Delete Listing"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        {/* Desktop Pagination Controls */}
        <div className={styles.desktopOnly} style={{
          marginTop: '1.5rem',
          padding: '1rem 1.25rem',
          backgroundColor: '#fff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
              <span>
                Showing <strong>{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to <strong>{Math.min(page * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> listings
              </span>
              <span style={{ color: 'var(--color-neutral-300)' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.375rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.812rem',
                    background: '#fff',
                    outline: 'none',
                    cursor: 'pointer',
                    minHeight: '40px',
                    minWidth: '40px'
                  }}
                  aria-label="Listings per page"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.375rem 0.75rem', fontSize: '0.812rem', minHeight: '40px' }}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-neutral-700)'
              }}>
                Page {page} of {Math.max(1, totalPages)}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.375rem 0.75rem', fontSize: '0.812rem', minHeight: '40px' }}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Pagination Controls */}
        <div className={`${styles.mobilePaginationWrapper} ${styles.mobileOnly}`}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className={styles.mobilePageBtn}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className={styles.mobilePageIndicator}>
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className={styles.mobilePageBtn}
            aria-label="Next page"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </>
      )}

      {/* Rejection Reason Modal */}
      <Modal
        isOpen={!!rejectListingId}
        onClose={() => {
          setRejectListingId(null);
          setSelectedReason('Duplicate Listing / Spam');
          setOtherReason('');
        }}
        title="Reject Listing"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', color: 'var(--color-neutral-800)' }}>
              Select Rejection Reason
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-neutral-300)',
                background: '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                minHeight: '44px',
                outline: 'none'
              }}
            >
              <option value="Duplicate Listing / Spam">Duplicate Listing / Spam</option>
              <option value="Fake / Low Quality Photos">Fake / Low Quality Photos</option>
              <option value="Incorrect / Exaggerated Price">Incorrect / Exaggerated Price</option>
              <option value="Broker posing as Direct Owner">Broker posing as Direct Owner</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {selectedReason === 'Other' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', color: 'var(--color-neutral-800)' }}>
                Please specify:
              </label>
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Enter custom rejection reason..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-neutral-300)',
                  background: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button
              onClick={() => {
                setRejectListingId(null);
                setSelectedReason('Duplicate Listing / Spam');
                setOtherReason('');
              }}
              variant="ghost"
              disabled={rejectLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectSubmit}
              variant="danger"
              loading={rejectLoading}
              disabled={selectedReason === 'Other' && !otherReason.trim()}
            >
              Submit Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Date Range Selector Modal for Mobile */}
      <Modal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        title="Select Date Range"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: '#0f172a' }}>
              Listed After (From)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.dateInput}
              style={{ width: '100%', height: '44px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: '#0f172a' }}>
              Listed Before (To)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.dateInput}
              style={{ width: '100%', height: '44px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setShowDateModal(false);
              }}
            >
              Clear Dates
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowDateModal(false)}
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteListingId}
        onClose={() => setDeleteListingId(null)}
        title="Confirm Administrative Deletion"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.937rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Are you sure you want to administratively delete this property listing? This will permanently wipe all database logs, images, and seeker leads for this property.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDeleteListingId(null)} variant="ghost" disabled={deleteLoading}>
              Cancel
            </Button>
            <Button onClick={handleDeleteListing} variant="danger" loading={deleteLoading}>
              Admin Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
