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
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Phone verification modal control
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  // Sync state with loaded profile
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAddress(profile.address || '');
      setPhone(profile.phone ? profile.phone.replace('+91', '').trim() : '');
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
      const payload: any = { name, address };
      if (!profile?.phoneVerified && phone.trim()) {
        payload.phone = phone.startsWith('+91') ? phone.trim() : `+91${phone.trim()}`;
      }
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
            {/* Phone */}
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.label}>Mobile Number</label>
                {profile?.phoneVerified ? (
                  <Badge variant="success" size="sm">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    Pending Verification
                  </Badge>
                )}
              </div>

              {profile?.phoneVerified ? (
                <div style={{ position: 'relative' }}>
                  <Input
                    value={profile?.phone ? profile.phone.replace('+91', '').trim() : ''}
                    readOnly
                    disabled
                    leftIcon={<Phone size={18} />}
                    fullWidth
                  />
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                    <Badge variant="success" size="sm">
                      Verified
                    </Badge>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit mobile number"
                      leftIcon={<Phone size={18} />}
                      fullWidth
                      disabled={submitting}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      const digits = phone.replace(/\D/g, '');
                      if (digits.length !== 10) {
                        showToast('Invalid Phone', 'Please enter a valid 10-digit mobile number', 'error');
                        return;
                      }
                      setPhoneModalOpen(true);
                    }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Verify via OTP
                  </Button>
                </div>
              )}
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
        initialPhone={phone}
        onSuccess={async (verifiedPhone?: string) => {
          const finalPhone = verifiedPhone || (phone.startsWith('+91') ? phone : `+91${phone}`);
          try {
            const res = await fetch('/api/users/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: finalPhone,
                phoneVerified: true,
              }),
            });
            if (res.ok) {
              await refreshProfile();
              showToast('Success', 'Phone number verified successfully!', 'success');
            } else {
              const err = await res.json();
              showToast('Error', err.message || 'Failed to update phone verification status', 'error');
            }
          } catch (err) {
            console.error('Failed to sync verified phone in profile:', err);
            await refreshProfile();
            showToast('Success', 'Phone number verified successfully!', 'success');
          }
        }}
      />
    </div>
  );
}
