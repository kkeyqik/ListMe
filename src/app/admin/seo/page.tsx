'use client';

import React, { useState, useEffect } from 'react';
import { Search, Globe, FileText, BarChart, CheckCircle } from 'lucide-react';
import { Card, Button, Badge, useToast } from '@/components/ui';
import styles from '../admin.module.css';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
export default function SeoDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [siteName, setSiteName] = useState('ListMe — List it. Find it. Own it.');
  const [defaultDesc, setDefaultDesc] = useState('Browse, sell, or rent properties across India for free with direct owner listings and zero brokerage.');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.seo_site_name) setSiteName(data.seo_site_name);
          if (data.seo_default_desc) setDefaultDesc(data.seo_default_desc);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    // Basic RBAC guard
    const isSuper = profile?.role === 'SUPER_ADMIN';
    const hasSeoPerm = profile?.roleMetadata?.permissions?.seo === true;
    
    if (profile && !isSuper && !hasSeoPerm) {
      router.push('/admin');
    }
  }, [profile, router]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seo_site_name: siteName,
          seo_default_desc: defaultDesc
        })
      });
      if (res.ok) {
        showToast('Success', 'SEO Settings updated successfully', 'success');
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Failed to update settings', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'An unexpected error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>SEO Dashboard</h1>
          <p className={styles.subText}>Manage search engine optimization and visibility.</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <Globe size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal} style={{ fontSize: '1.25rem' }}>Active</span>
            <span className={styles.statLabel}>Sitemap Status</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>/sitemap.xml is auto-generating</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-info)' }}>
            <FileText size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal} style={{ fontSize: '1.25rem' }}>Configured</span>
            <span className={styles.statLabel}>Robots.txt</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>All bots allowed, admin blocked</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-secondary-fade)', color: 'var(--color-secondary)' }}>
            <Search size={22} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal} style={{ fontSize: '1.25rem' }}>Enabled</span>
            <span className={styles.statLabel}>Schema.org</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Property & Breadcrumb structured data</span>
          </div>
        </div>
      </div>

      <div className={styles.adminGrid}>
        <Card padding="lg">
          <div className={styles.sectionTitle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart size={18} style={{ color: 'var(--color-text-secondary)' }} />
              Global Meta Configuration
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Default OpenGraph and Twitter card settings for the platform.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <div style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>Loading configuration...</div>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>Site Name</label>
                  <input 
                    type="text" 
                    disabled={saving} 
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', color: 'var(--color-neutral-900)' }} 
                    value={siteName} 
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-neutral-700)', marginBottom: '4px' }}>Default Description</label>
                  <textarea 
                    disabled={saving} 
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#fff', color: 'var(--color-neutral-900)', resize: 'vertical' }} 
                    rows={3} 
                    value={defaultDesc} 
                    onChange={(e) => setDefaultDesc(e.target.value)}
                  />
                </div>
                
                <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Connected to Database
                  </span>
                  <Button variant="primary" onClick={handleSaveSettings} loading={saving}>Save Settings</Button>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card padding="lg">
          <div className={styles.sectionTitle}>
            <span>Indexing Links</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <a href="/sitemap.xml" target="_blank" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div>
                <div style={{ fontWeight: 600 }}>View XML Sitemap</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Live dynamic sitemap</div>
              </div>
              <Globe size={18} style={{ color: 'var(--color-text-muted)' }} />
            </a>
            
            <a href="/robots.txt" target="_blank" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div>
                <div style={{ fontWeight: 600 }}>View Robots.txt</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Search engine crawler rules</div>
              </div>
              <FileText size={18} style={{ color: 'var(--color-text-muted)' }} />
            </a>
          </div>

          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-warning)', marginBottom: '4px' }}>Google Search Console</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>Remember to submit your sitemap.xml to Google Search Console to speed up indexing of new properties.</p>
            <Button variant="outline" size="sm" onClick={() => window.open('https://search.google.com/search-console', '_blank')} style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}>Open Search Console</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
