'use client';

import React, { useState, useEffect } from 'react';
import { 
  Type, 
  Code, 
  Network, 
  Settings as SettingsIcon, 
  LayoutTemplate,
  Save,
  AlertCircle
} from 'lucide-react';
import { Card, Button, Input, useToast } from '@/components/ui';
import styles from './seo.module.css';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function SeoDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('title_meta');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    // Title & Meta
    seo_site_name: '',
    seo_default_desc: '',
    seo_title_template: '%title% | %site_name%',
    
    // Global Schema
    seo_org_name: '',
    seo_org_logo: '',
    seo_org_email: '',
    seo_org_phone: '',
    seo_social_fb: '',
    seo_social_tw: '',
    seo_social_li: '',
    seo_social_ig: '',
    
    // Listing Schema
    seo_schema_price: 'true',
    seo_schema_location: 'true',
    seo_schema_property_type: 'true',
    seo_schema_images: 'true',
    
    // Knowledge Graph
    seo_kg_brand: '',
    seo_kg_wiki: '',
    seo_kg_website: '',
    
    // Technical SEO
    seo_robots_txt: 'User-agent: *\nDisallow: /admin/\nAllow: /',
    seo_sitemap_freq: 'daily',
    seo_canonical_base: 'https://listme.in',
    
    // On-Page SEO
    seo_breadcrumbs: 'true',
    seo_auto_alt: 'true',
  });

  useEffect(() => {
    // Basic RBAC guard
    const isSuper = profile?.role === 'SUPER_ADMIN';
    const hasSeoPerm = profile?.roleMetadata?.permissions?.seo === true;
    
    if (profile && !isSuper && !hasSeoPerm) {
      router.push('/admin');
    }
  }, [profile, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          // Update formData with values from db, keeping defaults if undefined
          setFormData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(key => {
              if (data[key] !== undefined) {
                (updated as any)[key] = data[key];
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name: string) => {
    setFormData(prev => ({ ...prev, [name]: (prev as any)[name] === 'true' ? 'false' : 'true' }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        showToast('Success', 'SEO Configurations saved successfully.', 'success');
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Failed to save configurations', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'An unexpected error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'title_meta', label: 'Title & Meta', icon: <Type size={18} /> },
    { id: 'schema', label: 'Schema & Structured Data', icon: <Code size={18} /> },
    { id: 'knowledge_graph', label: 'Knowledge Graph', icon: <Network size={18} /> },
    { id: 'technical', label: 'Technical SEO', icon: <SettingsIcon size={18} /> },
    { id: 'onpage', label: 'On-Page SEO', icon: <LayoutTemplate size={18} /> },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>SEO Control Center</h1>
        <p className={styles.subText}>Manage search engine optimization, schemas, and visibility settings.</p>
      </div>

      {loading ? (
        <Card padding="lg">Loading SEO Configurations...</Card>
      ) : (
        <div className={styles.layoutGrid}>
          {/* Sub Sidebar */}
          <div className={styles.subSidebar}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={styles.navIcon}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Configuration Panels */}
          <Card padding="lg" className={styles.panelContainer}>
            
            {/* Title & Meta Panel */}
            {activeTab === 'title_meta' && (
              <div>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Title & Meta Settings</h2>
                  <p className={styles.sectionDescription}>Configure default formats for browser titles and search engine snippets.</p>
                </div>
                
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Global Site Name</label>
                    <Input 
                      name="seo_site_name" 
                      value={formData.seo_site_name} 
                      onChange={handleChange} 
                      placeholder="e.g. ListMe"
                      fullWidth 
                    />
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Title Template</label>
                    <Input 
                      name="seo_title_template" 
                      value={formData.seo_title_template} 
                      onChange={handleChange} 
                      placeholder="%title% | %site_name%"
                      fullWidth 
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Variables: %title%, %site_name%</span>
                  </div>
                  
                  <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Default Meta Description</label>
                    <textarea 
                      name="seo_default_desc"
                      value={formData.seo_default_desc}
                      onChange={handleChange}
                      className={styles.textarea}
                      placeholder="Browse, sell, or rent properties..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Schema & Structured Data */}
            {activeTab === 'schema' && (
              <div>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Global Organization Schema</h2>
                  <p className={styles.sectionDescription}>Data used to represent your business as an entity to search engines.</p>
                </div>
                
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Organization Name</label>
                    <Input name="seo_org_name" value={formData.seo_org_name} onChange={handleChange} placeholder="ListMe Technologies" fullWidth />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Organization Logo URL</label>
                    <Input name="seo_org_logo" value={formData.seo_org_logo} onChange={handleChange} placeholder="https://listme.in/logo.png" fullWidth />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Contact Email</label>
                    <Input name="seo_org_email" value={formData.seo_org_email} onChange={handleChange} placeholder="contact@listme.in" fullWidth />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Contact Phone</label>
                    <Input name="seo_org_phone" value={formData.seo_org_phone} onChange={handleChange} placeholder="+91 99999 99999" fullWidth />
                  </div>
                </div>

                <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
                  <h2 className={styles.sectionTitle}>Social Profiles (SameAs)</h2>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Facebook URL</label>
                    <Input name="seo_social_fb" value={formData.seo_social_fb} onChange={handleChange} placeholder="https://facebook.com/listme" fullWidth />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Twitter / X URL</label>
                    <Input name="seo_social_tw" value={formData.seo_social_tw} onChange={handleChange} placeholder="https://twitter.com/listme" fullWidth />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>LinkedIn URL</label>
                    <Input name="seo_social_li" value={formData.seo_social_li} onChange={handleChange} placeholder="https://linkedin.com/company/listme" fullWidth />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Instagram URL</label>
                    <Input name="seo_social_ig" value={formData.seo_social_ig} onChange={handleChange} placeholder="https://instagram.com/listme" fullWidth />
                  </div>
                </div>

                <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
                  <h2 className={styles.sectionTitle}>Property Listing Schema Controls</h2>
                  <p className={styles.sectionDescription}>Choose what listing attributes should be exposed to Google Bots via JSON-LD structured data.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Include Price</span>
                      <span className={styles.toggleDesc}>Show asking price in rich results</span>
                    </div>
                    <Button variant={formData.seo_schema_price === 'true' ? 'primary' : 'outline'} size="sm" onClick={() => handleToggle('seo_schema_price')}>
                      {formData.seo_schema_price === 'true' ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Include Location</span>
                      <span className={styles.toggleDesc}>Show city and locality data</span>
                    </div>
                    <Button variant={formData.seo_schema_location === 'true' ? 'primary' : 'outline'} size="sm" onClick={() => handleToggle('seo_schema_location')}>
                      {formData.seo_schema_location === 'true' ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Include Property Type</span>
                      <span className={styles.toggleDesc}>E.g. Apartment, Villa</span>
                    </div>
                    <Button variant={formData.seo_schema_property_type === 'true' ? 'primary' : 'outline'} size="sm" onClick={() => handleToggle('seo_schema_property_type')}>
                      {formData.seo_schema_property_type === 'true' ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Include Images</span>
                      <span className={styles.toggleDesc}>Provide cover images to the schema array</span>
                    </div>
                    <Button variant={formData.seo_schema_images === 'true' ? 'primary' : 'outline'} size="sm" onClick={() => handleToggle('seo_schema_images')}>
                      {formData.seo_schema_images === 'true' ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Graph Panel */}
            {activeTab === 'knowledge_graph' && (
              <div>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Knowledge Graph Metadata</h2>
                  <p className={styles.sectionDescription}>Enhance your chances of generating a Google Knowledge Panel when users search for your brand.</p>
                </div>
                
                <div className={styles.formGrid}>
                  <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Brand Entity Name</label>
                    <Input name="seo_kg_brand" value={formData.seo_kg_brand} onChange={handleChange} placeholder="ListMe" fullWidth />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Official Website</label>
                    <Input name="seo_kg_website" value={formData.seo_kg_website} onChange={handleChange} placeholder="https://listme.in" fullWidth />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Wikipedia Article (Optional)</label>
                    <Input name="seo_kg_wiki" value={formData.seo_kg_wiki} onChange={handleChange} placeholder="https://en.wikipedia.org/wiki/..." fullWidth />
                  </div>
                </div>
              </div>
            )}

            {/* Technical SEO Panel */}
            {activeTab === 'technical' && (
              <div>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Technical SEO</h2>
                  <p className={styles.sectionDescription}>Configure crawler rules, indexing strategies, and canonical bases.</p>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Canonical URL Base</label>
                    <Input name="seo_canonical_base" value={formData.seo_canonical_base} onChange={handleChange} placeholder="https://listme.in" fullWidth />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Sitemap Update Frequency</label>
                    <select name="seo_sitemap_freq" value={formData.seo_sitemap_freq} onChange={handleChange} className={styles.customSelect}>
                      <option value="always">Always</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div className={`${styles.inputGroup} ${styles.fullWidth}`} style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label className={styles.label}>Robots.txt Editor</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-warning)', fontSize: '0.75rem', fontWeight: 600 }}>
                        <AlertCircle size={14} /> Handle with extreme care
                      </div>
                    </div>
                    <textarea 
                      name="seo_robots_txt"
                      value={formData.seo_robots_txt}
                      onChange={handleChange}
                      className={styles.textarea}
                      style={{ fontFamily: 'monospace', minHeight: '150px', backgroundColor: 'var(--color-neutral-50)' }}
                      placeholder="User-agent: *\nDisallow: /admin/"
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Improper rules can accidentally de-index the entire website from Google.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* On-Page SEO Panel */}
            {activeTab === 'onpage' && (
              <div>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>On-Page SEO Configuration</h2>
                  <p className={styles.sectionDescription}>Manage automated on-page markup optimizations.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Breadcrumbs Schema</span>
                      <span className={styles.toggleDesc}>Inject breadcrumb JSON-LD structured data into property pages</span>
                    </div>
                    <Button variant={formData.seo_breadcrumbs === 'true' ? 'primary' : 'outline'} size="sm" onClick={() => handleToggle('seo_breadcrumbs')}>
                      {formData.seo_breadcrumbs === 'true' ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  <div className={styles.toggleRow}>
                    <div className={styles.toggleInfo}>
                      <span className={styles.toggleTitle}>Auto-generate Image Alt Text</span>
                      <span className={styles.toggleDesc}>Automatically inject property title as alt text if none is provided</span>
                    </div>
                    <Button variant={formData.seo_auto_alt === 'true' ? 'primary' : 'outline'} size="sm" onClick={() => handleToggle('seo_auto_alt')}>
                      {formData.seo_auto_alt === 'true' ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Row */}
            <div className={styles.saveActionRow}>
              <Button onClick={handleSave} variant="primary" loading={saving} style={{ minWidth: '150px' }}>
                <Save size={16} style={{ marginRight: '8px' }} />
                Save {tabs.find(t => t.id === activeTab)?.label}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
