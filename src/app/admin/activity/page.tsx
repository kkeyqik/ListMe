'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Eye, 
  Heart, 
  Settings, 
  User, 
  Clock, 
  Globe, 
  Laptop, 
  ShieldAlert,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { useToast, Card, Badge, Input, Button } from '@/components/ui';
import styles from '../admin.module.css';
import pageStyles from './activity.module.css';
import { gsap } from 'gsap';

export default function AdminActivityLog() {
  const { showToast } = useToast();
  const pageRef = useRef<HTMLDivElement>(null);

  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'seeker' | 'operations' | 'emails' | 'errors'>('seeker');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/activity');
      if (res.ok) {
        const data = await res.json();
        setUserLogs(data.userLogs || []);
        setAdminLogs(data.adminLogs || []);
        setEmailLogs(data.emailLogs || []);
      } else {
        const data = await res.json();
        showToast('Error', data.message || 'Failed to fetch logs', 'error');
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      showToast('Error', 'An unexpected error occurred while loading logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // GSAP animation for page elements
  useEffect(() => {
    if (!loading && pageRef.current) {
      const ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add('(prefers-reduced-motion: no-preference)', () => {
          gsap.fromTo(
            pageRef.current?.querySelectorAll('.animate-fade-in') || [],
            { y: 15, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
          );
        });

        mm.add('(prefers-reduced-motion: reduce)', () => {
          gsap.set(pageRef.current?.querySelectorAll('.animate-fade-in') || [], { y: 0, autoAlpha: 1 });
        });
      }, pageRef);

      return () => ctx.revert();
    }
  }, [loading, activeTab]);

  // Seeker actions filter
  const filteredUserLogs = userLogs.filter((log) => {
    const searchLower = searchQuery.toLowerCase();
    const userName = log.user?.name || 'anonymous';
    const userEmail = log.user?.email || '';
    const ip = log.ipAddress || '';
    
    // Check search queries
    const matchesSearch = 
      userName.toLowerCase().includes(searchLower) ||
      userEmail.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      ip.includes(searchLower) ||
      JSON.stringify(log.metadata || {}).toLowerCase().includes(searchLower);

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  // Admin actions filter
  const filteredAdminLogs = adminLogs.filter((log) => {
    const searchLower = searchQuery.toLowerCase();
    const adminName = log.admin?.name || 'admin';
    const adminEmail = log.admin?.email || '';
    const action = log.action || '';
    const type = log.entityType || '';

    const matchesSearch =
      adminName.toLowerCase().includes(searchLower) ||
      adminEmail.toLowerCase().includes(searchLower) ||
      action.toLowerCase().includes(searchLower) ||
      type.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.metadata || {}).toLowerCase().includes(searchLower);

    const matchesAction = actionFilter === 'ALL' || log.entityType === actionFilter;

    return matchesSearch && matchesAction;
  });

  // Email logs filter
  const filteredEmailLogs = emailLogs.filter((log) => {
    const searchLower = searchQuery.toLowerCase();
    const to = log.to || '';
    const subject = log.subject || '';
    const body = log.body || '';
    const status = log.status || '';

    const matchesSearch =
      to.toLowerCase().includes(searchLower) ||
      subject.toLowerCase().includes(searchLower) ||
      body.toLowerCase().includes(searchLower) ||
      status.toLowerCase().includes(searchLower);

    const matchesAction = actionFilter === 'ALL' || log.status === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'VIEW_PROPERTY':
        return 'info';
      case 'SEARCH':
        return 'primary';
      case 'EXPRESS_INTEREST':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'LISTING':
        return <Eye size={18} />;
      case 'SYSTEM_SETTINGS':
        return <Settings size={18} />;
      case 'USER_PROFILE':
        return <User size={18} />;
      default:
        return <ShieldAlert size={18} />;
    }
  };

  const formatMetadata = (log: any) => {
    if (!log.metadata) return null;
    const meta = log.metadata;

    if (log.action === 'SEARCH') {
      const filters = [];
      if (meta.city) filters.push(`City: ${meta.city}`);
      if (meta.query) filters.push(`Query: "${meta.query}"`);
      if (meta.type) filters.push(`Type: ${meta.type}`);
      if (meta.propertyType) filters.push(`Prop: ${meta.propertyType}`);
      if (meta.minPrice || meta.maxPrice) {
        filters.push(`Price: ₹${meta.minPrice || 0} - ${meta.maxPrice || 'Any'}`);
      }
      if (meta.bhk) filters.push(`BHK: ${meta.bhk}`);
      if (meta.furnishing) filters.push(`Furnishing: ${meta.furnishing}`);

      return (
        <div className={pageStyles.metaBadgeGrid}>
          {filters.map((f, i) => (
            <span key={i} className={pageStyles.metaBadge}>{f}</span>
          ))}
        </div>
      );
    }

    if (log.action === 'EXPRESS_INTEREST') {
      return (
        <div className={pageStyles.metaBadgeGrid}>
          <span className={pageStyles.metaBadge}>Listing ID: {meta.listingId || log.entityId}</span>
          <span className={`${pageStyles.metaBadge} text-success`}>
            Status: {meta.connectionStatus || 'Connected'}
          </span>
        </div>
      );
    }

    if (log.action === 'VIEW_PROPERTY') {
      return (
        <div className={pageStyles.metaBadgeGrid}>
          <span className={pageStyles.metaBadge}>Listing ID: {log.entityId}</span>
        </div>
      );
    }

    return (
      <pre className={pageStyles.metaJson}>
        {JSON.stringify(meta, null, 2)}
      </pre>
    );
  };

  return (
    <div className={pageStyles.container} ref={pageRef}>
      {/* Header */}
      <div className={`${styles.header} animate-fade-in`}>
        <div>
          <h1 className={styles.title}>System Activity Logs</h1>
          <p className={styles.subText}>
            Audit trail of user interactions, listing searches, and operations modifications.
          </p>
        </div>
        <Button onClick={fetchLogs} size="sm">
          Refresh Logs
        </Button>
      </div>

      {/* Tabs */}
      <div className={`${pageStyles.tabContainer} animate-fade-in`}>
        <button
          className={`${pageStyles.tabButton} ${activeTab === 'seeker' ? pageStyles.tabButtonActive : ''}`}
          onClick={() => {
            setActiveTab('seeker');
            setActionFilter('ALL');
          }}
        >
          Seeker & Owner Activities
        </button>
        <button
          className={`${pageStyles.tabButton} ${activeTab === 'operations' ? pageStyles.tabButtonActive : ''}`}
          onClick={() => {
            setActiveTab('operations');
            setActionFilter('ALL');
          }}
        >
          Operations Audit Trail
        </button>
        <button
          className={`${pageStyles.tabButton} ${activeTab === 'emails' ? pageStyles.tabButtonActive : ''}`}
          onClick={() => {
            setActiveTab('emails');
            setActionFilter('ALL');
          }}
        >
          Emails Sent (SMTP Audit)
        </button>
        <button
          className={`${pageStyles.tabButton} ${activeTab === 'errors' ? pageStyles.tabButtonActive : ''}`}
          onClick={() => {
            setActiveTab('errors');
            setActionFilter('ALL');
          }}
        >
          🚨 System Errors ({userLogs.filter(l => l.action === 'SYSTEM_ERROR').length})
        </button>
      </div>

      {/* Filters Bar */}
      <div className={`${pageStyles.filterBar} animate-fade-in`}>
        <div className={pageStyles.searchWrapper}>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'seeker'
                ? "Search by action, seeker, IP or metadata..."
                : activeTab === 'operations'
                ? "Search by admin name, action, or metadata..."
                : "Search by recipient, subject, status or content..."
            }
            leftIcon={<Search size={18} />}
            fullWidth
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className={pageStyles.selectDropdown}
          >
            {activeTab === 'seeker' ? (
              <>
                <option value="ALL">All Actions</option>
                <option value="VIEW_PROPERTY">Property Views</option>
                <option value="SEARCH">Searches</option>
                <option value="EXPRESS_INTEREST">Interest Expressions</option>
              </>
            ) : activeTab === 'operations' ? (
              <>
                <option value="ALL">All Entity Types</option>
                <option value="LISTING">Listings</option>
                <option value="SYSTEM_SETTINGS">Settings</option>
                <option value="USER_PROFILE">User Profiles</option>
              </>
            ) : (
              <>
                <option value="ALL">All Statuses</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
                <option value="SIMULATED">Simulated</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <div className="spinner" style={{ borderColor: 'var(--color-sage)' }}></div>
        </div>
      ) : activeTab === 'seeker' ? (
        /* Tab 1: Seeker & Owner Activities */
        <Card className="animate-fade-in">
          {filteredUserLogs.length === 0 ? (
            <div className={pageStyles.emptyState}>No matching user logs found.</div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Timestamp</th>
                    <th className={styles.th}>User / Seeker</th>
                    <th className={styles.th}>Action</th>
                    <th className={styles.th}>Details</th>
                    <th className={styles.th}>IP Address</th>
                    <th className={styles.th}>Browser Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUserLogs.map((log) => (
                    <tr key={log.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={14} style={{ color: 'var(--color-text-secondary)' }} />
                          <span style={{ fontSize: '0.8rem' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className={styles.td}>
                        {log.user ? (
                          <div>
                            <div className={styles.titleText}>{log.user.name || 'Unnamed Seeker'}</div>
                            <div className={styles.subTextInfo}>{log.user.email}</div>
                          </div>
                        ) : (
                          <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            Guest Seeker
                          </div>
                        )}
                      </td>
                      <td className={styles.td}>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className={styles.td}>
                        {formatMetadata(log)}
                      </td>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Globe size={14} style={{ color: 'var(--color-text-secondary)' }} />
                          <span>{log.ipAddress || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className={styles.td}>
                        {log.userAgent ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Laptop size={14} style={{ color: 'var(--color-text-secondary)' }} />
                            <span className={pageStyles.userAgentText} title={log.userAgent}>
                              {log.userAgent}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : activeTab === 'operations' ? (
        /* Tab 2: Operations Audit Trail */
        <div className={`${pageStyles.timeline} animate-fade-in`}>
          {filteredAdminLogs.length === 0 ? (
            <Card>
              <div className={pageStyles.emptyState}>No admin operations logs found.</div>
            </Card>
          ) : (
            filteredAdminLogs.map((log) => (
              <div key={log.id} className={pageStyles.timelineItem}>
                <div className={pageStyles.timelineIconWrapper}>
                  {getEntityTypeIcon(log.entityType)}
                </div>
                <div className={pageStyles.timelineContent}>
                  <div className={pageStyles.timelineHeader}>
                    <div>
                      <span className={pageStyles.adminText}>
                        {log.admin?.name || 'Administrator'}
                      </span>
                      <span style={{ margin: '0 0.5rem', color: 'var(--color-text-muted)' }}>•</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {log.admin?.email}
                      </span>
                    </div>
                    <span className={pageStyles.timestamp}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className={pageStyles.actionNarrative}>
                    {log.action}
                  </div>

                  {log.metadata && (
                    <pre className={pageStyles.metaJson}>
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Tab 3: Emails Sent (SMTP Audit) */
        <Card className="animate-fade-in">
          {filteredEmailLogs.length === 0 ? (
            <div className={pageStyles.emptyState}>No matching email logs found.</div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Sent Date</th>
                    <th className={styles.th}>Recipient</th>
                    <th className={styles.th}>Subject</th>
                    <th className={styles.th}>Sender</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmailLogs.map((log) => (
                    <tr key={log.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={14} style={{ color: 'var(--color-text-secondary)' }} />
                          <span style={{ fontSize: '0.8rem' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.titleText}>{log.to}</div>
                      </td>
                      <td className={styles.td}>
                        <span style={{ fontWeight: 500 }}>{log.subject}</span>
                      </td>
                      <td className={styles.td}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          {log.from}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <Badge
                          variant={
                            log.status === 'SENT'
                              ? 'success'
                              : log.status === 'FAILED'
                              ? 'error'
                              : 'info'
                          }
                        >
                          {log.status}
                        </Badge>
                      </td>
                      <td className={styles.td}>
                        <Button
                          onClick={() => setSelectedEmail(log)}
                          size="sm"
                          variant="outline"
                        >
                          View Content
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'errors' && (
        <Card padding="none" className="animate-fade-in">
          <div className={pageStyles.tableContainer}>
            <table className={pageStyles.table}>
              <thead>
                <tr>
                  <th className={pageStyles.th}>Error Details</th>
                  <th className={pageStyles.th}>Source & URL</th>
                  <th className={pageStyles.th}>User / IP</th>
                  <th className={pageStyles.th}>Timestamp</th>
                  <th className={pageStyles.th}>Stack Trace</th>
                </tr>
              </thead>
              <tbody>
                {userLogs.filter((l) => l.action === 'SYSTEM_ERROR').length === 0 ? (
                  <tr>
                    <td colSpan={5} className={pageStyles.emptyTd}>
                      No system errors logged. Everything is running smoothly!
                    </td>
                  </tr>
                ) : (
                  userLogs
                    .filter((l) => l.action === 'SYSTEM_ERROR')
                    .map((log) => (
                      <tr key={log.id} className={pageStyles.tr}>
                        <td className={pageStyles.td}>
                          <div style={{ fontWeight: 700, color: '#DC2626' }}>
                            {log.metadata?.errorMessage || 'System Error'}
                          </div>
                        </td>
                        <td className={pageStyles.td}>
                          <Badge variant="neutral" size="sm">
                            {log.metadata?.errorSource || 'unknown'}
                          </Badge>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                            {log.metadata?.pageUrl || '-'}
                          </div>
                        </td>
                        <td className={pageStyles.td}>
                          <div style={{ fontWeight: 600 }}>{log.user?.name || 'Anonymous User'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{log.ipAddress || 'IP N/A'}</div>
                        </td>
                        <td className={pageStyles.td}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className={pageStyles.td}>
                          {log.metadata?.errorStack ? (
                            <details style={{ fontSize: '0.75rem', cursor: 'pointer' }}>
                              <summary style={{ color: 'var(--color-primary)', fontWeight: 600 }}>View Stack</summary>
                              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#F8FAFC', padding: '8px', borderRadius: '6px', marginTop: '4px', border: '1px solid var(--color-neutral-200)' }}>
                                {log.metadata.errorStack}
                              </pre>
                            </details>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No stack details</span>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Email Content Detail Modal */}
      {selectedEmail && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedEmail(null)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              maxWidth: '650px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-neutral-200)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                Email Content Audit
              </h3>
              <button 
                onClick={() => setSelectedEmail(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--color-text-secondary)', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>
              <div><strong>Recipient:</strong> {selectedEmail.to}</div>
              <div><strong>Sender:</strong> {selectedEmail.from}</div>
              <div><strong>Subject:</strong> {selectedEmail.subject}</div>
              <div><strong>Sent At:</strong> {new Date(selectedEmail.createdAt).toLocaleString()}</div>
              <div>
                <strong>Status:</strong>{' '}
                <Badge
                  variant={
                    selectedEmail.status === 'SENT'
                      ? 'success'
                      : selectedEmail.status === 'FAILED'
                      ? 'error'
                      : 'info'
                  }
                >
                  {selectedEmail.status}
                </Badge>
              </div>
              {selectedEmail.error && (
                <div style={{ color: 'var(--color-error)', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px', border: '1px solid #fee2e2' }}>
                  <strong>Error:</strong> {selectedEmail.error}
                </div>
              )}
            </div>

            <div style={{ border: '1px solid var(--color-neutral-200)', borderRadius: 'var(--radius-md)', padding: '1rem', backgroundColor: 'var(--color-neutral-50)', maxHeight: '350px', overflowY: 'auto' }}>
              <pre style={{ margin: 0, fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap', fontSize: '0.925rem', lineHeight: '1.5', color: 'var(--color-text)' }}>
                {selectedEmail.body}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
