'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Search,
  Filter
} from 'lucide-react';
import { useToast, Button, Input, Card, Badge, Modal } from '@/components/ui';
import styles from '../dashboard.module.css';

export default function MyListings() {
  const { showToast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Delete listing state
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' 
        ? '/api/listings?owner=true' 
        : `/api/listings?owner=true&status=${statusFilter}`;
        
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error('Error fetching own listings:', err);
      showToast('Error', 'Failed to load property listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [statusFilter]);

  const handleDeleteListing = async () => {
    if (!deleteListingId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/listings/${deleteListingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Success', 'Listing deleted successfully', 'success');
        setListings((prev) => prev.filter((l) => l.id !== deleteListingId));
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

  // Filter listings by text search query
  const filteredListings = listings.filter((l) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(searchLower) ||
      l.city.toLowerCase().includes(searchLower) ||
      l.locality.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.welcomeText}>My Properties</h1>
          <p className={styles.subText}>Manage, edit, and track statuses of all your listed properties.</p>
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
            <Filter size={18} style={{ color: 'var(--color-text-secondary)' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-neutral-300)',
                background: '#fff',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="REJECTED">Rejected</option>
              <option value="DEACTIVATED">Deactivated</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Listings Table */}
      {loading ? (
        <Card padding="md">Loading property listings...</Card>
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
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <Button href={`/property/${listing.id}`} variant="ghost" size="sm" leftIcon={<Eye size={14} />}>
                        View
                      </Button>
                      <Button href={`/dashboard/listings/${listing.id}/edit`} variant="ghost" size="sm" leftIcon={<Edit size={14} />}>
                        Edit
                      </Button>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteListingId}
        onClose={() => setDeleteListingId(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.937rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Are you sure you want to delete this property listing? This action is permanent and cannot be undone. All interest requests associated with this listing will also be deleted.
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
