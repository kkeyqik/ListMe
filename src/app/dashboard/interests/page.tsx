'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Phone, Mail, Clock, Check, Building, MessageSquare } from 'lucide-react';
import { useToast, Button, Card, Badge } from '@/components/ui';
import styles from '../dashboard.module.css';

export default function Interests() {
  const { showToast } = useToast();
  
  const [mode, setMode] = useState<'received' | 'expressed'>('received');
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  // Update lead status (e.g., mark as Contacted)
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/interests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast('Status Updated', 'Lead status changed successfully', 'success');
        // Update local state list
        setInterests((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: newStatus } : item
          )
        );
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Failed to update status', 'error');
      }
    } catch (err) {
      console.error('Status update error:', err);
      showToast('Error', 'Something went wrong updating status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatPrice = (price: string) => {
    const val = parseFloat(price);
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
          <p className={styles.subText}>Track and connect with seekers interested in your listings.</p>
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
          {interests.map((item) => (
            <Card key={item.id} padding="md" variant="outlined">
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                {/* Left Side: Property and Seeker Details */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div 
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: 'var(--radius-full)', 
                      background: 'var(--color-primary-fade)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Building size={20} />
                  </div>
                  <div>
                    {/* Property title */}
                    <Link 
                      href={`/property/${item.listing.id}`}
                      style={{ 
                        fontFamily: 'var(--font-heading)', 
                        fontWeight: 700, 
                        fontSize: '1.062rem',
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
                        <div style={{ fontSize: '0.812rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          SEEKER CONTACT DETAILS
                        </div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.937rem', color: 'var(--color-neutral-900)' }}>
                          {item.user.name || 'Anonymous User'}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                          <a href={`tel:${item.user.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)' }}>
                            <Phone size={14} /> {item.user.phone}
                          </a>
                          <a href={`mailto:${item.user.email}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={14} /> {item.user.email}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Status badges & progress controls */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                  <Badge 
                    variant={
                      item.status === 'NEW' ? 'primary' :
                      item.status === 'ADMIN_CONTACTED' ? 'info' :
                      item.status === 'IN_PROGRESS' ? 'warning' :
                      item.status === 'SOLD' ? 'success' : 'neutral'
                    }
                    size="sm"
                  >
                    {item.status.replace('_', ' ')}
                  </Badge>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.812rem', color: 'var(--color-text-muted)' }}>
                    <Clock size={12} />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Actions (Owner marking contacted) */}
                  {mode === 'received' && item.status === 'NEW' && (
                    <Button
                      onClick={() => handleUpdateStatus(item.id, 'ADMIN_CONTACTED')}
                      variant="outline"
                      size="sm"
                      leftIcon={<Check size={14} />}
                      loading={updatingId === item.id}
                    >
                      Mark Contacted
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
