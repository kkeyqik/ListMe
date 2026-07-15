'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Save, Mail, Phone, MapPin, Building2, RotateCcw } from 'lucide-react';
import { useToast, Button, Card, Input } from '@/components/ui';
import styles from './settings.module.css';
import { gsap } from 'gsap';

export default function AdminSettings() {
  const { showToast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    brandName: '',
    contactEmail: '',
    contactPhone: '',
    officeAddress: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch current system settings from DB
  const fetchSettings = async (showResetNotification = false) => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          brandName: data.brandName || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          officeAddress: data.officeAddress || '',
        });
        
        if (showResetNotification) {
          showToast('Settings Reset', 'Form values have been reverted to saved state.', 'info');
        }
      } else {
        showToast('Error', 'Failed to retrieve system settings.', 'error');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      showToast('Error', 'An unexpected error occurred while loading settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // GSAP animation for form entrance
  useEffect(() => {
    if (!loading && cardRef.current) {
      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add('(prefers-reduced-motion: no-preference)', () => {
          gsap.fromTo(
            cardRef.current,
            { y: 30, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power2.out' }
          );
        });

        mm.add('(prefers-reduced-motion: reduce)', () => {
          gsap.set(cardRef.current, { y: 0, autoAlpha: 1 });
        });
      }, cardRef);

      return () => ctx.revert();
    }
  }, [loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.brandName.trim()) {
      newErrors.brandName = 'Brand name is required';
    }

    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (!formData.contactPhone.trim()) {
      newErrors.contactPhone = 'Contact phone is required';
    }

    if (!formData.officeAddress.trim()) {
      newErrors.officeAddress = 'Office address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Validation Failed', 'Please correct the errors in the settings form.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast('Settings Saved', 'System settings have been successfully updated.', 'success');
      } else {
        const data = await res.json();
        showToast('Save Failed', data.message || 'Unable to update system settings.', 'error');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('Connection Error', 'Failed to save settings. Please verify connection.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Settings</h1>
        <p className={styles.subtitle}>
          Configure and manage global configurations, company contact details, and platform branding assets.
        </p>
      </div>

      {loading ? (
        <Card padding="lg" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid var(--color-neutral-200)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: 'var(--color-neutral-500)', fontSize: '0.875rem', fontWeight: 500 }}>
              Retrieving system settings...
            </p>
            <style jsx global>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </Card>
      ) : (
        <div ref={cardRef} className={styles.settingsCard}>
          <Card padding="lg">
            <form onSubmit={handleSubmit} className={styles.form}>
              
              {/* Branding Section */}
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.iconWrapper}>
                    <Building2 size={20} />
                  </span>
                  Branding Configuration
                </h2>
                <p className={styles.sectionDescription}>
                  Configure name and values used across pages and emails.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.fullWidthRow}>
                  <Input
                    name="brandName"
                    label="Brand Name"
                    placeholder="e.g. Listme"
                    value={formData.brandName}
                    onChange={handleInputChange}
                    error={errors.brandName}
                    leftIcon={<Building2 size={18} />}
                    fullWidth
                    required
                  />
                </div>
              </div>

              <div className={styles.sectionDivider} />

              {/* Contact Information Section */}
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.iconWrapper}>
                    <Settings size={20} />
                  </span>
                  Contact Information
                </h2>
                <p className={styles.sectionDescription}>
                  Provide corporate contact coordinates shown in footer and contact page.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div>
                  <Input
                    name="contactEmail"
                    type="email"
                    label="Contact Email Address"
                    placeholder="e.g. contact@listme.in"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    error={errors.contactEmail}
                    leftIcon={<Mail size={18} />}
                    fullWidth
                    required
                  />
                </div>

                <div>
                  <Input
                    name="contactPhone"
                    type="tel"
                    label="Contact Phone Number"
                    placeholder="e.g. +91 99999 99999"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    error={errors.contactPhone}
                    leftIcon={<Phone size={18} />}
                    fullWidth
                    required
                  />
                </div>

                <div className={styles.fullWidthRow}>
                  <Input
                    name="officeAddress"
                    label="Office Address"
                    placeholder="e.g. Listme Tech Space, Sector 62, Noida"
                    value={formData.officeAddress}
                    onChange={handleInputChange}
                    error={errors.officeAddress}
                    leftIcon={<MapPin size={18} />}
                    fullWidth
                    required
                  />
                </div>
              </div>

              <div className={styles.sectionDivider} />

              {/* Form Action Buttons */}
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchSettings(true)}
                  disabled={saving}
                  leftIcon={<RotateCcw size={16} />}
                  className={styles.resetButton}
                >
                  Reset
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  disabled={saving}
                  leftIcon={<Save size={16} />}
                  className={styles.saveButton}
                >
                  Save Changes
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
