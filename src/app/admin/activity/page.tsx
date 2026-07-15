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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'seeker' | 'operations'>('seeker');

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
                : "Search by admin name, action, or metadata..."
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
            ) : (
              <>
                <option value="ALL">All Entity Types</option>
                <option value="LISTING">Listings</option>
                <option value="SYSTEM_SETTINGS">Settings</option>
                <option value="USER_PROFILE">User Profiles</option>
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
      ) : (
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
      )}
    </div>
  );
}
