'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  Phone, 
  Mail, 
  Clock, 
  Building, 
  ChevronDown, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  AlertCircle,
  TrendingUp,
  Tag
} from 'lucide-react';
import { useToast, Button, Card, Badge, Modal, Input } from '@/components/ui';
import styles from '../dashboard.module.css';

interface InterestItem {
  id: string;
  userId: string;
  listingId: string;
  status: 'NEW' | 'ADMIN_CONTACTED' | 'IN_PROGRESS' | 'SOLD' | 'CLOSED';
  adminNotes?: string | null;
  commissionAmount?: number | null;
  createdAt: string;
  updatedAt: string;
  listing: {
    id: string;
    title: string;
    locality: string;
    city: string;
    askingPrice: string | number;
    listingFor?: string;
  };
  user: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}

const STATUS_CONFIG: Record<
  InterestItem['status'], 
  { label: string; badgeVariant: 'primary' | 'info' | 'warning' | 'success' | 'neutral' }
> = {
  NEW: { label: 'New Lead', badgeVariant: 'primary' },
  ADMIN_CONTACTED: { label: 'Contacted', badgeVariant: 'info' },
  IN_PROGRESS: { label: 'In Discussion / Site Visit', badgeVariant: 'warning' },
  SOLD: { label: 'Deal Closed (Sold/Rented)', badgeVariant: 'success' },
  CLOSED: { label: 'Not Interested / Closed', badgeVariant: 'neutral' },
};

const STATUS_OPTIONS: { value: InterestItem['status']; label: string }[] = [
  { value: 'NEW', label: 'New Lead' },
  { value: 'ADMIN_CONTACTED', label: 'Contacted' },
  { value: 'IN_PROGRESS', label: 'In Discussion / Site Visit' },
  { value: 'SOLD', label: 'Deal Closed (Sold/Rented)' },
  { value: 'CLOSED', label: 'Not Interested / Closed' },
];

export default function Interests() {
  const { showToast } = useToast();
  
  const [mode, setMode] = useState<'received' | 'expressed'>('received');
  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Sold confirmation modal state
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<InterestItem | null>(null);
  const [soldPriceInput, setSoldPriceInput] = useState<string>('');

  const fetchInterests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/interests?mode=${mode}`);
      const data = await res.json();
      if (res.ok) {
        setInterests(data.interests || []);
      }
    } catch (err) {
      console.error('Error fetching interests:', err);
      showToast('Error', 'Failed to retrieve interest requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterests();
  }, [mode]);

  // Initiate status change (intercepts 'SOLD' to open price/confirmation modal)
  const handleStatusSelectChange = (item: InterestItem, targetStatus: InterestItem['status']) => {
    if (targetStatus === item.status) return;

    if (targetStatus === 'SOLD') {
      setSelectedLead(item);
      setSoldPriceInput(
        item.listing.askingPrice ? String(item.listing.askingPrice) : ''
      );
      setSoldModalOpen(true);
    } else {
      executeStatusUpdate(item.id, targetStatus);
    }
  };

  // Perform optimistic update and call backend
  const executeStatusUpdate = async (
    id: string, 
    newStatus: InterestItem['status'], 
    soldPrice?: number
  ) => {
    const previousInterests = [...interests];
    
    // 1. Immediate optimistic UI update
    setInterests((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );
    setUpdatingId(id);

    try {
      const body: { status: string; soldPrice?: number } = { status: newStatus };
      if (soldPrice !== undefined && !isNaN(soldPrice)) {
        body.soldPrice = soldPrice;
      }

      const res = await fetch(`/api/interests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const label = STATUS_CONFIG[newStatus]?.label || newStatus;
        showToast(
          'Status Updated', 
          newStatus === 'SOLD' 
            ? `Deal successfully marked as closed! Listing deactivated.`
            : `Lead status updated to "${label}"`, 
          'success'
        );
      } else {
        const data = await res.json();
        // Rollback state on error
        setInterests(previousInterests);
        showToast('Update Failed', data.message || 'Failed to update status', 'error');
      }
    } catch (err) {
      console.error('Status update error:', err);
      // Rollback state on exception
      setInterests(previousInterests);
      showToast('Error', 'Something went wrong updating status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle confirming the deal closed from the modal
  const handleConfirmSold = async () => {
    if (!selectedLead) return;
    
    let parsedPrice: number | undefined = undefined;
    if (soldPriceInput.trim()) {
      parsedPrice = parseFloat(soldPriceInput);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        showToast('Invalid Price', 'Please enter a valid closing price amount', 'warning');
        return;
      }
    }

    const leadToUpdate = selectedLead;
    setSoldModalOpen(false);
    setSelectedLead(null);
    await executeStatusUpdate(leadToUpdate.id, 'SOLD', parsedPrice);
  };

  const formatPrice = (price: string | number) => {
    const val = typeof price === 'string' ? parseFloat(price) : price;
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
          <h1 className={styles.welcomeText}>Property Inquiries</h1>
          <p className={styles.subText}>Track, manage, and close deals directly with seekers interested in your listings.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <Button
          onClick={() => setMode('received')}
          variant={mode === 'received' ? 'primary' : 'outline'}
          size="sm"
        >
          Inquiries Received
        </Button>
        <Button
          onClick={() => setMode('expressed')}
          variant={mode === 'expressed' ? 'primary' : 'outline'}
          size="sm"
        >
          My Expressed Interests
        </Button>
      </div>

      {/* Grid List */}
      {loading ? (
        <Card padding="md">Loading inquiries...</Card>
      ) : interests.length === 0 ? (
        <div className={styles.emptyState}>
          <Heart size={48} style={{ opacity: 0.3 }} />
          <h3>No inquiries found</h3>
          <p>
            {mode === 'received'
              ? 'When seekers express interest in your properties, they will show up here.'
              : 'You have not expressed interest in any property listings yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {interests.map((item) => {
            const currentConfig = STATUS_CONFIG[item.status] || {
              label: item.status,
              badgeVariant: 'neutral' as const,
            };

            return (
              <Card key={item.id} padding="md" variant="outlined">
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '1.25rem'
                  }}
                >
                  {/* Left Side: Property and Seeker Details */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: '280px' }}>
                    <div 
                      style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: 'var(--radius-full)', 
                        background: 'var(--color-primary-fade)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Building size={22} />
                    </div>
                    <div>
                      {/* Property title */}
                      <Link 
                        href={`/property/${item.listing.id}`}
                        style={{ 
                          fontFamily: 'var(--font-heading)', 
                          fontWeight: 700, 
                          fontSize: '1.0625rem',
                          color: 'var(--color-neutral-900)'
                        }}
                        className={styles.viewAllLink}
                      >
                        {item.listing.title}
                      </Link>
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                        {item.listing.locality}, {item.listing.city} ·{' '}
                        <strong>{formatPrice(item.listing.askingPrice)}</strong>
                      </div>

                      {/* Contact Seeker Info (if mode is received) */}
                      {mode === 'received' && (
                        <div 
                          style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.75rem', 
                            background: 'var(--color-neutral-50)', 
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
                            SEEKER CONTACT DETAILS
                          </div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.937rem', color: 'var(--color-neutral-900)' }}>
                            {item.user.name || 'Genuine Verified Seeker'}
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            {item.user.phone && (
                              <a href={`tel:${item.user.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-primary)', fontWeight: 600 }}>
                                <Phone size={14} /> {item.user.phone}
                              </a>
                            )}
                            {item.user.email && (
                              <a href={`mailto:${item.user.email}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Mail size={14} /> {item.user.email}
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Status badges & progress controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge 
                        variant={currentConfig.badgeVariant}
                        size="md"
                      >
                        {currentConfig.label}
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      <Clock size={13} />
                      <span>{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    {/* Owner Status Controls (mode === received) */}
                    {mode === 'received' && (
                      <div className={styles.statusControlGroup}>
                        <label className={styles.statusLabel}>Update Lead Stage</label>
                        <div className={styles.statusSelectWrapper}>
                          <select
                            value={item.status}
                            disabled={updatingId === item.id}
                            onChange={(e) => handleStatusSelectChange(item, e.target.value as InterestItem['status'])}
                            className={styles.statusSelect}
                            aria-label="Update lead status"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className={styles.statusChevron} />
                        </div>
                      </div>
                    )}

                    {/* Seeker Actions (mode === expressed) */}
                    {mode === 'expressed' && item.status !== 'CLOSED' && item.status !== 'SOLD' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => executeStatusUpdate(item.id, 'CLOSED')}
                        loading={updatingId === item.id}
                        style={{ color: 'var(--color-neutral-600)', fontSize: '0.8125rem' }}
                      >
                        Withdraw Inquiry
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Deal Closed (SOLD) Confirmation Modal */}
      <Modal
        isOpen={soldModalOpen}
        onClose={() => {
          setSoldModalOpen(false);
          setSelectedLead(null);
        }}
        title="Confirm Deal Closed (Sold / Rented)"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSoldModalOpen(false);
                setSelectedLead(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSold}
              leftIcon={<CheckCircle size={15} />}
            >
              Confirm Deal Closed
            </Button>
          </div>
        }
      >
        <div className={styles.dealModalContent}>
          {selectedLead && (
            <div className={styles.dealModalSummary}>
              <div className={styles.dealSummaryTitle}>{selectedLead.listing.title}</div>
              <div className={styles.dealSummaryMeta}>
                {selectedLead.listing.locality}, {selectedLead.listing.city} · Asking Price: <strong>{formatPrice(selectedLead.listing.askingPrice)}</strong>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Buyer/Seeker: <strong>{selectedLead.user.name || 'Genuine Verified Seeker'}</strong>
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-neutral-800)', marginBottom: '0.375rem' }}>
              Final Closing / Deal Price (₹)
            </label>
            <Input
              type="number"
              value={soldPriceInput}
              onChange={(e) => setSoldPriceInput(e.target.value)}
              placeholder="e.g. 8500000"
              helperText="Optional: Defaults to the listed asking price if left unchanged."
            />
          </div>

          <div className={styles.dealCommissionAlert}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              Marking as <strong>Deal Closed</strong> will finalize the transaction record, record the platform commission (2%), and automatically deactivate the listing from public view.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
