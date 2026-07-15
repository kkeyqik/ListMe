'use client';

import React, { useState, useEffect } from 'react';
import { Heart, IndianRupee, Clock, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useToast, Card, Badge, Button, Modal, Input } from '@/components/ui';
import styles from '../admin.module.css';

export default function AdminInterests() {
  const { showToast } = useToast();
  
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Stats summaries
  const [summary, setSummary] = useState({
    totalCount: 0,
    closedDeals: 0,
    activeMatches: 0,
    totalCommissions: 0,
  });

  // Sold modal states
  const [soldModalId, setSoldModalId] = useState<string | null>(null);
  const [soldPrice, setSoldPrice] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchInterests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/interests?mode=all');
      const data = await res.json();
      if (res.ok) {
        const fetchedInterests = data.interests || [];
        setInterests(fetchedInterests);

        // Compute metrics
        const total = fetchedInterests.length;
        const closed = fetchedInterests.filter((i: any) => i.status === 'SOLD').length;
        const active = fetchedInterests.filter((i: any) => i.status !== 'SOLD' && i.status !== 'DEACTIVATED').length;
        
        const commissions = fetchedInterests.reduce((sum: number, item: any) => {
          const comm = item.commissionAmount ? parseFloat(item.commissionAmount.toString()) : 0;
          return sum + comm;
        }, 0);

        setSummary({
          totalCount: total,
          closedDeals: closed,
          activeMatches: active,
          totalCommissions: commissions,
        });
      }
    } catch (err) {
      console.error('Error fetching admin interests:', err);
      showToast('Error', 'Failed to retrieve connection logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterests();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'SOLD') {
      setSoldModalId(id);
      setSoldPrice('');
      return;
    }

    try {
      const res = await fetch(`/api/interests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast('Success', 'Status updated successfully', 'success');
        fetchInterests();
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Failed to update status', 'error');
      }
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handleCloseDeal = async () => {
    if (!soldModalId || !soldPrice) return;
    
    setSubmitLoading(true);
    try {
      const res = await fetch(`/api/interests/${soldModalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'SOLD',
          soldPrice: parseFloat(soldPrice),
        }),
      });

      if (res.ok) {
        showToast('Deal Closed', 'Property sold and 2% commission recorded', 'success');
        setSoldModalId(null);
        fetchInterests();
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Failed to record sold price', 'error');
      }
    } catch (err) {
      console.error('Close deal error:', err);
      showToast('Error', 'Something went wrong closing the deal', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatPrice = (price: any) => {
    if (price === undefined || price === null) return '₹0';
    const val = typeof price === 'string' ? parseFloat(price) : Number(price);
    if (!val || isNaN(val)) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lk`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const filteredInterests = interests.filter((i) => {
    if (statusFilter === 'ALL') return true;
    return i.status === statusFilter;
  });

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Inquiry & Commissions Log</h1>
          <p className={styles.subText}>Track buyer-owner matches and monitor commission collection status.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-primary-fade)', color: 'var(--color-primary)' }}>
            <Heart size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{summary.totalCount}</span>
            <span className={styles.statLabel}>Total Connections</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-info)' }}>
            <Clock size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{summary.activeMatches}</span>
            <span className={styles.statLabel}>Active Leads</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <ShieldCheck size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{summary.closedDeals}</span>
            <span className={styles.statLabel}>Closed Deals</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-secondary-fade)', color: 'var(--color-secondary)' }}>
            <IndianRupee size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{formatPrice(summary.totalCommissions)}</span>
            <span className={styles.statLabel}>Commissions Earned</span>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <Card padding="md" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Filter by Status:</span>
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
            <option value="NEW">New Matches</option>
            <option value="ADMIN_CONTACTED">Contacted</option>
            <option value="IN_PROGRESS">Negotiations</option>
            <option value="SOLD">Sold (Closed Deals)</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </Card>

      {/* Data Table */}
      {loading ? (
        <Card padding="md">Loading log files...</Card>
      ) : filteredInterests.length === 0 ? (
        <div className={styles.emptyState}>
          <Heart size={48} style={{ opacity: 0.3 }} />
          <h3>No connection entries found</h3>
          <p>No records found matching this status filter.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Seeker</th>
                <th className={styles.th}>Property (Listing)</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Commission Collected</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterests.map((interest) => (
                <tr key={interest.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.titleText}>{interest.user.name || 'Anonymous seeker'}</div>
                    <div className={styles.subTextInfo}>{interest.user.phone}</div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.titleText}>{interest.listing.title}</div>
                    <div className={styles.subTextInfo}>
                      Owner Price: {formatPrice(interest.listing.askingPrice)}
                    </div>
                  </td>
                  <td className={styles.td}>
                    <Badge
                      variant={
                        interest.status === 'NEW' ? 'primary' :
                        interest.status === 'SOLD' ? 'success' : 'neutral'
                      }
                      size="sm"
                    >
                      {interest.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className={styles.td} style={{ fontWeight: 700, color: interest.commissionAmount ? 'var(--color-success)' : 'inherit' }}>
                    {interest.commissionAmount 
                      ? formatPrice(interest.commissionAmount)
                      : '—'}
                  </td>
                  <td className={styles.td} style={{ textAlign: 'right' }}>
                    {interest.status !== 'SOLD' && (
                      <div className={styles.actionBtnGroup} style={{ justifyContent: 'flex-end' }}>
                        {interest.status === 'NEW' && (
                          <Button
                            onClick={() => handleUpdateStatus(interest.id, 'ADMIN_CONTACTED')}
                            variant="ghost"
                            size="sm"
                            style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                          >
                            Contacted
                          </Button>
                        )}
                        {interest.status === 'ADMIN_CONTACTED' && (
                          <Button
                            onClick={() => handleUpdateStatus(interest.id, 'IN_PROGRESS')}
                            variant="ghost"
                            size="sm"
                            style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                          >
                            Progress
                          </Button>
                        )}
                        {interest.status !== 'SOLD' && (
                          <Button
                            onClick={() => handleUpdateStatus(interest.id, 'SOLD')}
                            variant="outline"
                            size="sm"
                            style={{ padding: '0.25rem 0.5rem', minHeight: 'auto', color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                          >
                            Mark Sold
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sold Price Inputs Modal */}
      <Modal
        isOpen={!!soldModalId}
        onClose={() => setSoldModalId(null)}
        title="Record Sold Transaction"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.937rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Please enter the final closed sale price (INR). The system will automatically compute the flat 2% commission fee and deactivate the property listing.
          </p>

          <Input
            label="Closing Sales Price (INR)"
            value={soldPrice}
            onChange={(e) => setSoldPrice(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 7200000"
            required
            fullWidth
          />

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button onClick={() => setSoldModalId(null)} variant="ghost" disabled={submitLoading}>
              Cancel
            </Button>
            <Button onClick={handleCloseDeal} variant="primary" loading={submitLoading} disabled={!soldPrice}>
              Record Deal Closed
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
