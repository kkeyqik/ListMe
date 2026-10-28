'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  RotateCcw,
  PauseCircle
} from 'lucide-react';
import { useToast, Button, Input, Card, Badge, Modal, Select } from '@/components/ui';
import styles from '../dashboard.module.css';

const PAGE_SIZE = 50;

export default function MyListings() {
  const { showToast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  // Search runs on the server across all pages (debounced), not just the loaded page.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delete listing state
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ owner: 'true', limit: String(PAGE_SIZE), page: String(page) });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (debouncedSearch.trim()) params.set('query', debouncedSearch.trim());
      setLoadError(null);

      const res = await fetch(`/api/listings?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setListings(data.listings || []);
        setTotalPages(Math.max(1, data.meta?.totalPages || 1));
        setTotalCount(data.meta?.total || 0);
      } else {
        setListings([]);
        setLoadError(data.message || `Your listings could not be loaded (error ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching own listings:', err);
      setLoadError('Your listings could not be loaded. Check your connection and try again.');
      showToast('Error', 'Failed to load property listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, debouncedSearch]);

  const handleStatusChange = async (listingId: string, status: 'PENDING_REVIEW' | 'DEACTIVATED') => {
    setStatusUpdatingId(listingId);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          'Success',
          status === 'PENDING_REVIEW'
            ? 'Listing resubmitted. It will go live once an admin approves it.'
            : 'Listing deactivated. It is no longer visible to seekers.',
          'success'
        );
        setListings((prev) => prev.map((l) => (l.id === listingId ? { ...l, status: data.listing?.status || status } : l)));
      } else {
        showToast('Error', data.message || 'Could not update the listing', 'error');
      }
    } catch (err) {
      console.error('Listing status change error:', err);
      showToast('Error', 'Something went wrong. Please check connection.', 'error');
    } finally {
      setStatusUpdatingId(null);
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
        const data = await res.json().catch(() => ({}));
        if (data.archived) {
          // Listings with enquiries are deactivated, not deleted, so lead history is kept.
          showToast('Listing deactivated', data.message, 'success');
          setListings((prev) => prev.map((l) => (l.id === deleteListingId ? { ...l, status: data.status || 'DEACTIVATED' } : l)));
        } else {
          showToast('Success', 'Listing deleted successfully', 'success');
          setListings((prev) => prev.filter((l) => l.id !== deleteListingId));
        }
        setDeleteListingId(null);
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Failed to delete listing', 'error');
      }
    } catch (err) {
      console.error('Delete listing error:', err);
      showToast('Error', 'Something went wrong. Please check connection.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    const val = parseFloat(price);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lk`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  // Search and status filtering happen on the server.
  const filteredListings = listings;

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.welcomeText}>My Properties</h1>
          <p className={styles.subText}>
            Manage, edit, and track statuses of all your listed properties.
            {!loading && !loadError && totalCount > 0 && ` ${totalCount} ${totalCount === 1 ? 'listing' : 'listings'}${searchQuery || statusFilter !== 'ALL' ? ' match' : ' in total'}.`}
          </p>
        </div>
        <Button href="/dashboard/listings/new" variant="primary" leftIcon={<Plus size={18} />}>
          Add New Property
        </Button>
      </div>

      {/* Filters Toolbar */}
      <Card padding="md" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1', minWidth: '260px' }}>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search listings by title, city, or locality..."
              leftIcon={<Search size={18} />}
              fullWidth
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Filter size={18} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
            <div style={{ minWidth: '170px' }}>
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                size="sm"
                fullWidth
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="REJECTED">Rejected</option>
                <option value="DEACTIVATED">Deactivated</option>
                <option value="EXPIRED">Expired</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Listings Table */}
      {loading ? (
        <Card padding="md">Loading property listings...</Card>
      ) : loadError ? (
        <div className={styles.errorBanner} role="alert">
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchListings()}>
            Try again
          </Button>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className={styles.emptyState}>
          <Building size={48} style={{ opacity: 0.3 }} />
          <h3>No properties found</h3>
          <p>
            {searchQuery || statusFilter !== 'ALL'
              ? 'No listings match your search filters.'
              : 'You have not added any properties yet.'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <Button href="/dashboard/listings/new" variant="outline" size="sm">
              List your first property
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Property Details</th>
                <th className={styles.th}>Type</th>
                <th className={styles.th}>Price</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredListings.map((listing) => (
                <tr key={listing.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.listingTitle}>{listing.title}</div>
                    <div className={styles.listingMeta}>
                      {listing.bedrooms ? `${listing.bedrooms} BHK · ` : ''} 
                      {listing.carpetArea ? `${listing.carpetArea} sqft · ` : ''} 
                      {listing.locality}, {listing.city}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <Badge variant="neutral" size="sm">
                      {listing.listingFor} · {listing.propertyType.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className={styles.td}>{formatPrice(listing.askingPrice)}</td>
                  <td className={styles.td}>
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
                    {listing.status === 'REJECTED' && (
                      <div style={{ marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--color-error)', maxWidth: '240px', lineHeight: 1.4 }}>
                        {listing.rejectionReason
                          ? <>Reason: {listing.rejectionReason}</>
                          : 'Not approved. Edit the listing and resubmit it for review.'}
                      </div>
                    )}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button href={`/dashboard/listings/${listing.id}`} variant="ghost" size="sm" leftIcon={<Eye size={14} />}>
                        View
                      </Button>
                      <Button href={`/dashboard/listings/${listing.id}/edit`} variant="ghost" size="sm" leftIcon={<Edit size={14} />}>
                        {listing.status === 'REJECTED' ? 'Fix & Edit' : 'Edit'}
                      </Button>
                      {['REJECTED', 'DEACTIVATED', 'EXPIRED'].includes(listing.status) && (
                        <Button
                          onClick={() => handleStatusChange(listing.id, 'PENDING_REVIEW')}
                          variant="ghost"
                          size="sm"
                          leftIcon={<RotateCcw size={14} />}
                          loading={statusUpdatingId === listing.id}
                        >
                          Resubmit
                        </Button>
                      )}
                      {listing.status === 'ACTIVE' && (
                        <Button
                          onClick={() => handleStatusChange(listing.id, 'DEACTIVATED')}
                          variant="ghost"
                          size="sm"
                          leftIcon={<PauseCircle size={14} />}
                          loading={statusUpdatingId === listing.id}
                        >
                          Deactivate
                        </Button>
                      )}
                      <Button 
                        onClick={() => setDeleteListingId(listing.id)} 
                        variant="ghost" 
                        size="sm" 
                        leftIcon={<Trash2 size={14} />}
                        style={{ color: 'var(--color-error)' }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem' }}>
          <Button onClick={() => setPage((p) => Math.max(1, p - 1))} variant="outline" size="sm" disabled={page <= 1}>
            Previous
          </Button>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} variant="outline" size="sm" disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteListingId}
        onClose={() => setDeleteListingId(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.937rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Are you sure you want to delete this property listing? If nobody has expressed interest yet, it is deleted permanently. If it has received enquiries, it is deactivated instead (hidden from search) so your enquiry history is kept.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDeleteListingId(null)} variant="ghost" disabled={deleteLoading}>
              Cancel
            </Button>
            <Button onClick={handleDeleteListing} variant="danger" loading={deleteLoading}>
              Delete Listing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
