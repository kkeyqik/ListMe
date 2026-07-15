'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  Heart, 
  IndianRupee, 
  ShieldAlert, 
  Check, 
  X, 
  ArrowRight,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { useToast, Button, Card, Badge, Modal } from '@/components/ui';
import styles from './admin.module.css';

export default function AdminHome() {
  const { showToast } = useToast();
  
  const [metrics, setMetrics] = useState<any>({
    totalListings: 0,
    activeListings: 0,
    pendingReview: 0,
    totalUsers: 0,
    totalInterests: 0,
    estimatedCommissions: 0,
  });
  
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [recentInterests, setRecentInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Rejection modal states
  const [rejectListingId, setRejectListingId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('Duplicate Listing / Spam');
  const [otherReason, setOtherReason] = useState<string>('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      // Fetch Metrics, Pending Listings, and Recent Interests in parallel
      const [metricsRes, listingsRes, interestsRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/listings?admin=true&status=PENDING_REVIEW&limit=5'),
        fetch('/api/interests?mode=all')
      ]);

      if (metricsRes.ok && listingsRes.ok && interestsRes.ok) {
        const metricsData = await metricsRes.json();
        const listingsData = await listingsRes.json();
        const interestsData = await interestsRes.json();

        setMetrics(metricsData.metrics);
        setPendingListings(listingsData.listings || []);
        setRecentInterests((interestsData.interests || []).slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching admin home data:', err);
      showToast('Error', 'Failed to retrieve admin control panel metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Moderation: Approve or Reject Property
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
        showToast(
          'Moderation Updated', 
          `Property has been successfully marked as ${newStatus.toLowerCase()}`, 
          'success'
        );
        // Remove item from pending local list
        setPendingListings((prev) => prev.filter((item) => item.id !== id));
        // Refresh general counts
        fetchAdminData();
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Action failed', 'error');
      }
    } catch (err) {
      console.error('Moderation error:', err);
      showToast('Error', 'Something went wrong. Please check connection.', 'error');
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

  const formatPrice = (price: any) => {
    if (price === undefined || price === null) return '₹0';
    const val = typeof price === 'string' ? parseFloat(price) : Number(price);
    if (isNaN(val)) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lk`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin Control Center</h1>
          <p className={styles.subText}>Monitor site activity, moderate listings, and track commission collections.</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-secondary-fade)', color: 'var(--color-secondary)' }}>
            <Building size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{metrics.totalListings}</span>
            <span className={styles.statLabel}>Total Listings ({metrics.activeListings} Active)</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'rgba(212, 163, 115, 0.12)', color: 'var(--color-accent)' }}>
            <ShieldAlert size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{metrics.pendingReview}</span>
            <span className={styles.statLabel}>Pending Moderation</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <Users size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{metrics.totalUsers}</span>
            <span className={styles.statLabel}>Registered Users</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-info)' }}>
            <IndianRupee size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{formatPrice(metrics.estimatedCommissions)}</span>
            <span className={styles.statLabel}>Commissions (Flat 2%)</span>
          </div>
        </div>
      </div>

      {/* Grid: Left column pending reviews, Right column recent interests */}
      <div className={styles.adminGrid}>
        
        {/* Left Side: Pending Reviews Queue */}
        <div>
          <div className={styles.sectionTitle}>
            <span>Pending Approvals Queue</span>
            <Link href="/admin/listings" className={styles.viewLink}>
              View All Queue <ArrowRight size={12} style={{ display: 'inline', marginLeft: '2px' }} />
            </Link>
          </div>

          {loading ? (
            <Card padding="md">Loading queue...</Card>
          ) : pendingListings.length === 0 ? (
            <Card padding="lg" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <Check size={40} style={{ color: 'var(--color-success)', margin: '0 auto 0.75rem' }} />
              <h3>Moderation queue is empty</h3>
              <p>All property listings have been verified and approved.</p>
            </Card>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Property details</th>
                    <th className={styles.th}>Price</th>
                    <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingListings.map((listing) => (
                    <tr key={listing.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.titleText}>{listing.title}</div>
                        <div className={styles.subTextInfo}>
                          {listing.propertyType.replace('_', ' ')} · {listing.locality}, {listing.city}
                        </div>
                      </td>
                      <td className={styles.td}>{formatPrice(listing.askingPrice)}</td>
                      <td className={styles.td} style={{ textAlign: 'right' }}>
                        <div className={styles.actionBtnGroup} style={{ justifyContent: 'flex-end' }}>
                          <Button
                            onClick={() => handleModerate(listing.id, 'ACTIVE')}
                            variant="primary"
                            size="sm"
                            style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                            disabled={actionId === listing.id}
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            onClick={() => setRejectListingId(listing.id)}
                            variant="danger"
                            size="sm"
                            style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                            disabled={actionId === listing.id}
                          >
                            <X size={14} />
                          </Button>
                          <Button
                            href={`/property/${listing.id}`}
                            variant="ghost"
                            size="sm"
                            style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                          >
                            <Eye size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Recent Connections Log */}
        <div>
          <div className={styles.sectionTitle}>
            <span>Recent Seeker Inquiries</span>
            <Link href="/admin/interests" className={styles.viewLink}>
              View Log <ArrowRight size={12} style={{ display: 'inline', marginLeft: '2px' }} />
            </Link>
          </div>

          {loading ? (
            <Card padding="md">Loading log...</Card>
          ) : recentInterests.length === 0 ? (
            <Card padding="md" style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <Heart size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
              <p>No seeker inquiries recorded yet.</p>
            </Card>
          ) : (
            <div className={styles.listContainer}>
              {recentInterests.map((interest) => (
                <div key={interest.id} className={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-neutral-900)' }}>
                      {interest.user.name || 'Anonymous User'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Interested in: <strong>{interest.listing.title}</strong>
                    </div>
                    {interest.commissionAmount && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 700, marginTop: '4px' }}>
                        Closed Deal Commission: {formatPrice(interest.commissionAmount)}
                      </div>
                    )}
                  </div>
                  <Badge 
                    variant={
                      interest.status === 'NEW' ? 'primary' :
                      interest.status === 'SOLD' ? 'success' : 'neutral'
                    }
                    size="sm"
                  >
                    {interest.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

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
    </div>
  );
}
