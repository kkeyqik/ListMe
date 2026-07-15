'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Search, 
  Filter, 
  Check, 
  X, 
  Eye, 
  Edit, 
  Trash2 
} from 'lucide-react';
import { useToast, Button, Input, Card, Badge, Modal } from '@/components/ui';
import styles from '../admin.module.css';

export default function AdminListings() {
  const { showToast } = useToast();
  
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const fetchListings = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL'
        ? '/api/listings?admin=true'
        : `/api/listings?admin=true&status=${statusFilter}`;
        
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setListings(data.listings || []);
      }
    } catch (err) {
      console.error('Error fetching admin listings:', err);
      showToast('Error', 'Failed to retrieve property listings database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [statusFilter]);

  const handleModerate = async (id: string, newStatus: 'ACTIVE' | 'REJECTED', reason?: string) => {
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
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Action failed', 'error');
      }
    } catch (err) {
      console.error('Moderation error:', err);
      showToast('Error', 'Something went wrong', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectListingId) return;
    setRejectLoading(true);
    const finalReason = selectedReason === 'Other' ? otherReason : selectedReason;
    
    try {
      await handleModerate(rejectListingId, 'REJECTED', finalReason);
      setRejectListingId(null);
      setSelectedReason('Duplicate Listing / Spam');
      setOtherReason('');
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
          <h1 className={styles.title}>All Properties Database</h1>
          <p className={styles.subText}>Moderate, review, edit, or delete any listing submitted on ListMe.</p>
        </div>
      </div>

      {/* Toolbar filters */}
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
              <option value="PENDING_REVIEW">Pending Review (Queue)</option>
              <option value="ACTIVE">Active</option>
              <option value="REJECTED">Rejected</option>
              <option value="DEACTIVATED">Deactivated</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
      </Card>

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
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Property details</th>
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
                          >
                            <Check size={14} /> Approve
                          </Button>
                          <Button
                            onClick={() => setRejectListingId(listing.id)}
                            variant="danger"
                            size="sm"
                            style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                            disabled={actionId === listing.id}
                          >
                            <X size={14} /> Reject
                          </Button>
                        </>
                      )}
                      
                      <Button href={`/property/${listing.id}`} variant="ghost" size="sm" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}>
                        <Eye size={14} />
                      </Button>
                      <Button href={`/dashboard/listings/${listing.id}/edit`} variant="ghost" size="sm" style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}>
                        <Edit size={14} />
                      </Button>
                      <Button
                        onClick={() => setDeleteListingId(listing.id)}
                        variant="ghost"
                        size="sm"
                        style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', color: 'var(--color-error)' }}
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
                minHeight: '40px',
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
