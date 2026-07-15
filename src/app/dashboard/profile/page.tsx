'use client';

import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, ShieldCheck, ShieldAlert, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast, Card, Input, Button, Badge } from '@/components/ui';
import { PhoneVerificationModal } from '@/components/auth/PhoneVerificationModal';
import styles from '../dashboard.module.css';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Phone verification modal control
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  // Sync state with loaded profile
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Error', 'Name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Success', 'Profile settings updated successfully', 'success');
        await refreshProfile();
      } else {
        showToast('Error', data.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      showToast('Error', 'Something went wrong. Please check connection.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.welcomeText}>Profile Settings</h1>
          <p className={styles.subText}>Manage your personal details and account verification status.</p>
        </div>
      </div>

      {/* Account Verification Status */}
      <Card padding="md" style={{ marginBottom: '2rem', borderLeft: profile?.phoneVerified ? '4px solid var(--color-success)' : '4px solid var(--color-warning)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {profile?.phoneVerified ? (
              <ShieldCheck size={32} style={{ color: 'var(--color-success)' }} />
            ) : (
              <ShieldAlert size={32} style={{ color: 'var(--color-warning)' }} />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-neutral-900)' }}>
                {profile?.phoneVerified ? 'Verified Account' : 'Action Required: Verify Phone'}
              </div>
              <div style={{ fontSize: '0.812rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {profile?.phoneVerified 
                  ? 'Your account is in good standing and you can express interest in listings.'
                  : 'You must verify your phone number to show interest in properties.'
                }
              </div>
            </div>
          </div>

          {!profile?.phoneVerified && (
            <Button onClick={() => setPhoneModalOpen(true)} variant="primary" size="sm">
              Verify Now
            </Button>
          )}
        </div>
      </Card>

      {/* Profile Form */}
      <Card padding="lg">
        <form onSubmit={handleSaveProfile} className={styles.form}>
          <Input
            label="Full Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            leftIcon={<User size={18} />}
            required
            disabled={submitting}
            fullWidth
          />

          <div className={styles.formGrid}>
            {/* Phone (Read Only) */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Mobile Number</label>
              <div style={{ position: 'relative' }}>
                <Input
                  value={profile?.phone ? profile.phone.replace('+91', '').trim() : ''}
                  readOnly
                  disabled
                  leftIcon={<Phone size={18} />}
                  fullWidth
                />
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                  <Badge variant={profile?.phoneVerified ? 'success' : 'warning'} size="sm">
                    {profile?.phoneVerified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Email (Read Only) */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Email Address</label>
              <Input
                value={profile?.email || ''}
                readOnly
                disabled
                leftIcon={<Mail size={18} />}
                fullWidth
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Communication Address</label>
            <textarea
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={styles.textarea}
              placeholder="Enter your billing/postal address..."
              rows={3}
              disabled={submitting}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              leftIcon={<Save size={16} />}
            >
              Save Profile Settings
            </Button>
          </div>
        </form>
      </Card>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onSuccess={() => {
          showToast('Verified', 'Your mobile number is verified.', 'success');
          refreshProfile();
        }}
      />
    </div>
  );
}
