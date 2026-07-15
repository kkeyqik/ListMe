'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Save, Mail, Phone, MapPin, Building2, RotateCcw, Share2, DollarSign, Key, Globe, FileText, Image as ImageIcon } from 'lucide-react';
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
    logoUrl: '',
    faviconPath: '',
    companyName: '',
    copyrightYear: '',
    privacyPolicyUrl: '',
    termsOfServiceUrl: '',
    twitterUrl: '',
    facebookUrl: '',
    linkedinUrl: '',
    instagramUrl: '',
    commissionPercentage: '',
    pricingPlanRate: '',
    promoRibbonText: '',
    googleAnalyticsId: '',
    enableIntercom: '',
    enableRecaptcha: '',
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
          logoUrl: data.logoUrl || '',
          faviconPath: data.faviconPath || '',
          companyName: data.companyName || '',
          copyrightYear: data.copyrightYear || '',
          privacyPolicyUrl: data.privacyPolicyUrl || '',
          termsOfServiceUrl: data.termsOfServiceUrl || '',
          twitterUrl: data.twitterUrl || '',
          facebookUrl: data.facebookUrl || '',
          linkedinUrl: data.linkedinUrl || '',
          instagramUrl: data.instagramUrl || '',
          commissionPercentage: data.commissionPercentage || '',
          pricingPlanRate: data.pricingPlanRate || '',
          promoRibbonText: data.promoRibbonText || '',
          googleAnalyticsId: data.googleAnalyticsId || '',
          enableIntercom: data.enableIntercom || '',
          enableRecaptcha: data.enableRecaptcha || '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          Configure and manage global configurations, platform branding assets, legal agreements, social handles, monetization rates, and external script integrations.
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
                  Configure name, logos, and values used across pages and emails.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div>
                  <Input
                    name="brandName"
                    label="Brand Name"
                    placeholder="e.g. ListMe"
                    value={formData.brandName}
                    onChange={handleInputChange}
                    error={errors.brandName}
                    leftIcon={<Building2 size={18} />}
                    fullWidth
                    required
                  />
                </div>

                <div>
                  <Input
                    name="companyName"
                    label="Company Name"
                    placeholder="e.g. ListMe Technologies Private Limited"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    leftIcon={<Building2 size={18} />}
                    fullWidth
                  />
                </div>

                <div>
                  <Input
                    name="logoUrl"
                    label="Logo URL Path"
                    placeholder="e.g. /images/logo.png"
                    value={formData.logoUrl}
                    onChange={handleInputChange}
                    leftIcon={<ImageIcon size={18} />}
                    fullWidth
                  />
                </div>

                <div>
                  <Input
                    name="faviconPath"
                    label="Favicon File Path"
                    placeholder="e.g. /favicon.ico"
                    value={formData.faviconPath}
                    onChange={handleInputChange}
                    leftIcon={<Globe size={18} />}
                    fullWidth
                  />
                </div>
              </div>

              <div className={styles.sectionDivider} />

              {/* Contact & Legal Section */}
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.iconWrapper}>
                    <FileText size={20} />
                  </span>
                  Support & Legal Information
                </h2>
                <p className={styles.sectionDescription}>
                  Provide corporate contact coordinates, copyright, and policy page links.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div>
                  <Input
                    name="contactEmail"
                    type="email"
                    label="Support Email Address"
                    placeholder="e.g. support@listme.in"
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
                    label="Support Phone Number"
                    placeholder="e.g. +91 99999 99999"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    error={errors.contactPhone}
                    leftIcon={<Phone size={18} />}
                    fullWidth
                    required
                  />
                </div>

                <div>
                  <Input
                    name="copyrightYear"
                    label="Copyright Year"
                    placeholder="e.g. 2026"
                    value={formData.copyrightYear}
                    onChange={handleInputChange}
                    leftIcon={<FileText size={18} />}
                    fullWidth
                  />
                </div>

                <div className={styles.fullWidthRow}>
                  <Input
                    name="officeAddress"
                    label="Office Address"
                    placeholder="e.g. 80 Feet Road, Indiranagar, Bangalore"
                    value={formData.officeAddress}
                    onChange={handleInputChange}
                    error={errors.officeAddress}
                    leftIcon={<MapPin size={18} />}
                    fullWidth
                    required
                  />
                </div>

                <div>
                  <Input
                    name="privacyPolicyUrl"
                    label="Privacy Policy Link"
                    placeholder="e.g. /privacy"
                    value={formData.privacyPolicyUrl}
                    onChange={handleInputChange}
                    leftIcon={<Globe size={18} />}
                    fullWidth
                  />
                </div>

                <div>
                  <Input
                    name="termsOfServiceUrl"
                    label="Terms of Service Link"
                    placeholder="e.g. /terms"
                    value={formData.termsOfServiceUrl}
                    onChange={handleInputChange}
                    leftIcon={<Globe size={18} />}
                    fullWidth
                  />
                </div>
              </div>

              <div className={styles.sectionDivider} />

              {/* Social links section */}
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.iconWrapper}>
                    <Share2 size={20} />
                  </span>
                  Social Media Links
                </h2>
                <p className={styles.sectionDescription}>
                  URLs for your platform's official social profile pages.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div>
                  <Input
                    name="twitterUrl"
                    label="Twitter / X Profile Link"
                    placeholder="e.g. https://twitter.com/listme"
                    value={formData.twitterUrl}
                    onChange={handleInputChange}
                    leftIcon={<Share2 size={18} />}
                    fullWidth
                  />
                </div>

                <div>
                  <Input
                    name="facebookUrl"
                    label="Facebook Page Link"
                    placeholder="e.g. https://facebook.com/listme"
                    value={formData.facebookUrl}
                    onChange={handleInputChange}
                    leftIcon={<Share2 size={18} />}
                    fullWidth
                  />
                </div>

                <div>
                  <Input
                    name="linkedinUrl"
                    label="LinkedIn Company Link"
                    placeholder="e.g. https://linkedin.com/company/listme"
                    value={formData.linkedinUrl}
                    onChange={handleInputChange}
                    leftIcon={<Share2 size={18} />}
                    fullWidth
                  />
                </div>

                <div>
                  <Input
                    name="instagramUrl"
                    label="Instagram Account Link"
                    placeholder="e.g. https://instagram.com/listme"
                    value={formData.instagramUrl}
                    onChange={handleInputChange}
                    leftIcon={<Share2 size={18} />}
                    fullWidth
                  />
                </div>
              </div>

              <div className={styles.sectionDivider} />

              {/* Pricing & Monetization Section */}
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.iconWrapper}>
                    <DollarSign size={20} />
                  </span>
                  Pricing & Monetization
                </h2>
                <p className={styles.sectionDescription}>
                  Manage platform fee structures, subscription pricing rates, and promos.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div>
                  <Input
                    name="commissionPercentage"
                    label="Commission Rate (%)"
                    placeholder="e.g. 2"
                    value={formData.commissionPercentage}
                    onChange={handleInputChange}
                    leftIcon={<DollarSign size={18} />}
                    fullWidth
                  />
                </div>

                <div>
                  <Input
                    name="pricingPlanRate"
                    label="Premium Listing Price Rate (INR)"
                    placeholder="e.g. 0"
                    value={formData.pricingPlanRate}
                    onChange={handleInputChange}
                    leftIcon={<DollarSign size={18} />}
                    fullWidth
                  />
                </div>

                <div className={styles.fullWidthRow}>
                  <Input
                    name="promoRibbonText"
                    label="Promo Ribbon Header Text"
                    placeholder="e.g. Launch Offer: 100% Free Listing"
                    value={formData.promoRibbonText}
                    onChange={handleInputChange}
                    leftIcon={<FileText size={18} />}
                    fullWidth
                  />
                </div>
              </div>

              <div className={styles.sectionDivider} />

              {/* External Scripts & Integrations */}
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.iconWrapper}>
                    <Key size={20} />
                  </span>
                  Script Integrations & Keys
                </h2>
                <p className={styles.sectionDescription}>
                  Toggle third-party integrations and configure tracker script IDs.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div>
                  <Input
                    name="googleAnalyticsId"
                    label="Google Analytics Measurement ID (G-XXXXX)"
                    placeholder="e.g. G-123456789"
                    value={formData.googleAnalyticsId}
                    onChange={handleInputChange}
                    leftIcon={<Key size={18} />}
                    fullWidth
                  />
                </div>

                <div>
                  <label 
                    style={{ 
                      fontFamily: 'var(--font-heading)', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: 'var(--color-neutral-700)',
                      display: 'block',
                      marginBottom: '0.375rem'
                    }}
                  >
                    Enable Intercom Support Widget
                  </label>
                  <select
                    name="enableIntercom"
                    value={formData.enableIntercom}
                    onChange={handleInputChange}
                    className={styles.customInputField}
                    style={{ 
                      width: '100%', 
                      border: '1.5px solid var(--color-border)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: '12px',
                      outline: 'none',
                      fontSize: '0.95rem',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </div>

                <div>
                  <label 
                    style={{ 
                      fontFamily: 'var(--font-heading)', 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      color: 'var(--color-neutral-700)',
                      display: 'block',
                      marginBottom: '0.375rem'
                    }}
                  >
                    Enable Google Recaptcha v3
                  </label>
                  <select
                    name="enableRecaptcha"
                    value={formData.enableRecaptcha}
                    onChange={handleInputChange}
                    className={styles.customInputField}
                    style={{ 
                      width: '100%', 
                      border: '1.5px solid var(--color-border)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: '12px',
                      outline: 'none',
                      fontSize: '0.95rem',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
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
