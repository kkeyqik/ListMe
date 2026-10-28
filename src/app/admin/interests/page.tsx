'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Heart, IndianRupee, Clock, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useToast, Card, Badge, Button, Modal, Input } from '@/components/ui';
import styles from '../admin.module.css';

const PAGE_SIZE = 50;

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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Admin notes modal
  const [notesInterest, setNotesInterest] = useState<any | null>(null);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const fetchInterests = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Paginated, permission-checked admin endpoint; status is filtered on the
      // server and the summary is computed over all leads, not just this page.
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/interests?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInterests(data.interests || []);
        setFilteredTotal(data.meta?.total || 0);
        setTotalPages(data.meta?.totalPages || 1);
        setSummary({
          totalCount: data.summary?.total || 0,
          closedDeals: data.summary?.closedDeals || 0,
          activeMatches: data.summary?.activeLeads || 0,
          totalCommissions: data.summary?.commissionEarned || 0,
        });
      } else {
        setLoadError(data.message || `Leads could not be loaded (error ${res.status}).`);
      }
    } catch (err) {
      console.error('Error fetching admin interests:', err);
      setLoadError('Leads could not be loaded. Check your connection and try again.');
      showToast('Error', 'Failed to retrieve connection logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, showToast]);

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  const handleSaveNotes = async () => {
    if (!notesInterest) return;
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/interests/${notesInterest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: notesText.trim() }),
      });
      if (res.ok) {
        showToast('Saved', 'Admin notes updated', 'success');
        setInterests((prev) =>
          prev.map((i) => (i.id === notesInterest.id ? { ...i, adminNotes: notesText.trim() } : i))
        );
        setNotesInterest(null);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast('Error', data.message || 'Failed to save notes', 'error');
      }
    } catch (err) {
      console.error('Save notes error:', err);
      showToast('Error', 'Something went wrong saving the notes', 'error');
    } finally {
      setNotesSaving(false);
    }
  };

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
      showToast('Error', 'Something went wrong updating the status', 'error');
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

  // Status filtering happens on the server.
  const filteredInterests = interests;

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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Filter by Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className={styles.filterSelect}
            title="Filter by Status"
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New Matches</option>
            <option value="ADMIN_CONTACTED">Contacted</option>
            <option value="IN_PROGRESS">Negotiations</option>
            <option value="SOLD">Sold (Closed Deals)</option>
            <option value="CLOSED">Closed (Lost)</option>
          </select>

          {statusFilter !== 'ALL' && (
            <button
              type="button"
              className={styles.clearFilterBtn}
              onClick={() => { setStatusFilter('ALL'); setPage(1); }}
              title="Reset status filter"
              aria-label="Reset status filter"
            >
              Reset Filter
            </button>
          )}
        </div>
      </Card>

      {/* Data Table */}
      {loadError && !loading ? (
        <div className={styles.emptyState} role="alert">
          <Heart size={48} style={{ opacity: 0.3 }} />
          <h3>Leads could not be loaded</h3>
          <p>{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => fetchInterests()}>
            Retry
          </Button>
        </div>
      ) : loading ? (
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
                <th className={styles.th} style={{ width: '24%' }}>Seeker</th>
                <th className={styles.th} style={{ width: '32%' }}>Property (Listing)</th>
                <th className={styles.th} style={{ width: '16%' }}>Status</th>
                <th className={styles.th} style={{ width: '16%' }}>Commission Collected</th>
                <th className={styles.th} style={{ width: '12%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterests.map((interest) => (
                <tr key={interest.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.titleText}>{interest.user?.name || 'Anonymous seeker'}</div>
                    <div className={styles.subTextInfo}>{interest.user?.phone || 'No phone on file'}</div>
                    {interest.adminNotes && (
                      <div className={styles.subTextInfo} title={interest.adminNotes} style={{ fontStyle: 'italic' }}>
                        Note: {interest.adminNotes.length > 60 ? `${interest.adminNotes.slice(0, 60)}…` : interest.adminNotes}
                      </div>
                    )}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.titleText}>{interest.listing?.title || 'Deleted listing'}</div>
                    <div className={styles.subTextInfo}>
                      Owner Price: {formatPrice(interest.listing?.askingPrice)}{interest.listing?.listingFor === 'RENT' ? ' / month' : ''}
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
                    <div className={styles.actionBtnGroup} style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
                      {interest.status !== 'SOLD' && interest.status !== 'CLOSED' && (
                        <Button
                          onClick={() => handleUpdateStatus(interest.id, 'CLOSED')}
                          variant="ghost"
                          size="sm"
                          style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                          aria-label={`Mark lead from ${interest.user?.name || 'seeker'} as lost`}
                        >
                          Mark Lost
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
                      <Button
                        onClick={() => {
                          setNotesInterest(interest);
                          setNotesText(interest.adminNotes || '');
                        }}
                        variant="ghost"
                        size="sm"
                        style={{ padding: '0.25rem 0.5rem', minHeight: 'auto' }}
                        aria-label={`Edit admin notes for lead from ${interest.user?.name || 'seeker'}`}
                      >
                        Notes
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !loadError && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span className={styles.subTextInfo}>
            Page {page} of {totalPages} ({filteredTotal} leads)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Admin Notes Modal */}
      <Modal
        isOpen={!!notesInterest}
        onClose={() => setNotesInterest(null)}
        title="Admin Notes"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Internal notes for this lead. Only admins can see them.
          </p>
          <label htmlFor="admin-lead-notes" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            Notes
          </label>
          <textarea
            id="admin-lead-notes"
            value={notesText}
            onChange={(e) => setNotesText(e.target.value.slice(0, 2000))}
            rows={5}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontFamily: 'inherit', fontSize: '0.875rem', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button onClick={() => setNotesInterest(null)} variant="ghost" disabled={notesSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes} variant="primary" loading={notesSaving}>
              Save Notes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sold Price Inputs Modal */}
      <Modal
        isOpen={!!soldModalId}
        onClose={() => setSoldModalId(null)}
        title="Record Sold Transaction"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.937rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
            Enter the final closing price (INR). The system records a 2% commission on it and deactivates the property listing.
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
