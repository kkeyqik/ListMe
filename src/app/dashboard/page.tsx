'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building, 
  Heart, 
  ShieldCheck, 
  Plus, 
  ArrowRight,
  Eye,
  Edit,
  Phone
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast, Card, Button, Badge } from '@/components/ui';
import styles from './dashboard.module.css';

export default function DashboardHome() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  
  const [listings, setListings] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [stats, setStats] = useState({ activeCount: 0, totalInterests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 1. Fetch own listings
        const listingsRes = await fetch('/api/listings?owner=true&limit=5');
        const listingsData = await listingsRes.json();
        
        // 2. Fetch received interests
        const interestsRes = await fetch('/api/interests?mode=received');
        const interestsData = await interestsRes.json();

        if (listingsRes.ok && interestsRes.ok) {
          const fetchedListings = listingsData.listings || [];
          const fetchedInterests = interestsData.interests || [];
          
          setListings(fetchedListings);
          setInterests(fetchedInterests.slice(0, 5)); // show only 5 recent

          // Compute counts
          const active = fetchedListings.filter((l: any) => l.status === 'ACTIVE').length;
          setStats({
            activeCount: active,
            totalInterests: fetchedInterests.length,
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard info:', err);
        showToast('Error', 'Failed to load dashboard data. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [showToast]);

  const formatPrice = (price: string) => {
    const val = parseFloat(price);
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lk`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div>
      {/* Header Banner */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.welcomeText}>Hello, {profile?.name || 'User'}!</h1>
          <p className={styles.subText}>Here is what is happening with your property listings today.</p>
        </div>
        <Button href="/dashboard/listings/new" variant="primary" leftIcon={<Plus size={18} />}>
          Add New Listing
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-primary-fade)', color: 'var(--color-primary)' }}>
            <Building size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{stats.activeCount}</span>
            <span className={styles.statLabel}>Active Properties</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-secondary-fade)', color: 'var(--color-secondary)' }}>
            <Heart size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{stats.totalInterests}</span>
            <span className={styles.statLabel}>Total Responses</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: profile?.phoneVerified ? 'rgba(16, 185, 129, 0.1)' : 'var(--color-secondary-fade)', color: profile?.phoneVerified ? 'var(--color-success)' : 'var(--color-secondary)' }}>
            <ShieldCheck size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{profile?.phoneVerified ? 'Verified' : 'Unverified'}</span>
            <span className={styles.statLabel}>Mobile Account Status</span>
          </div>
        </div>
      </div>

      {/* Two Column Summary Layout */}
      <div className={styles.dashboardGrid}>
        {/* Left Side: Recent Listings */}
        <div>
          <div className={styles.sectionTitle}>
            <span>My Property Listings</span>
            <Link href="/dashboard/listings" className={styles.viewAllLink}>
              View All <ArrowRight size={14} style={{ display: 'inline', marginLeft: '2px' }} />
            </Link>
          </div>

          {loading ? (
            <Card padding="md">Loading listings...</Card>
          ) : listings.length === 0 ? (
            <div className={styles.emptyState}>
              <Building size={48} style={{ opacity: 0.3 }} />
              <h3>No listings found</h3>
              <p>You haven't posted any property listings yet.</p>
              <Button href="/dashboard/listings/new" variant="outline" size="sm">
                Post your first property
              </Button>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Property Details</th>
                    <th className={styles.th}>Price</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.listingTitle}>{listing.title}</div>
                        <div className={styles.listingMeta}>
                          {listing.bedrooms ? `${listing.bedrooms} BHK ` : ''} 
                          {listing.propertyType.toLowerCase().replace('_', ' ')} in {listing.locality}, {listing.city}
                        </div>
                      </td>
                      <td className={styles.td}>{formatPrice(listing.askingPrice)}</td>
                      <td className={styles.td}>
                        <Badge 
                          variant={
                            listing.status === 'ACTIVE' ? 'success' :
                            listing.status === 'PENDING_REVIEW' ? 'warning' :
                            listing.status === 'REJECTED' ? 'error' : 'neutral'
                          }
                          size="sm"
                        >
                          {listing.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className={styles.td} style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button href={`/property/${listing.id}`} variant="ghost" size="sm" leftIcon={<Eye size={14} />}>
                            View
                          </Button>
                          <Button href={`/dashboard/listings/${listing.id}/edit`} variant="ghost" size="sm" leftIcon={<Edit size={14} />}>
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Recent Inquiries */}
        <div>
          <div className={styles.sectionTitle}>
            <span>Recent Inquiries</span>
            <Link href="/dashboard/interests" className={styles.viewAllLink}>
              View All <ArrowRight size={14} style={{ display: 'inline', marginLeft: '2px' }} />
            </Link>
          </div>

          {loading ? (
            <Card padding="md">Loading responses...</Card>
          ) : interests.length === 0 ? (
            <div className={styles.emptyState}>
              <Heart size={48} style={{ opacity: 0.3 }} />
              <h3>No inquiries yet</h3>
              <p>When buyers/renters show interest, their details will appear here.</p>
            </div>
          ) : (
            <div className={styles.interestsList}>
              {interests.map((interest) => (
                <div key={interest.id} className={styles.interestItem}>
                  <div className={styles.interestDetails}>
                    <div className={styles.interestTitle}>{interest.user.name || 'Interested User'}</div>
                    <div style={{ fontSize: '0.812rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                      {interest.listing.title}
                    </div>
                    <div className={styles.interestContact}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Phone size={12} /> {interest.user.phone}
                      </span>
                    </div>
                  </div>
                  <Badge variant={interest.status === 'NEW' ? 'primary' : 'neutral'} size="sm">
                    {interest.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
