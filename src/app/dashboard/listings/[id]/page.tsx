'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  MapPin, 
  IndianRupee, 
  Eye, 
  Heart, 
  Edit, 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar,
  FileText
} from 'lucide-react';
import { useToast, Button, Card, Badge } from '@/components/ui';
import styles from '@/app/dashboard/dashboard.module.css';

interface ListingDetailProps {
  params: Promise<{ id: string }>;
}

export default function OwnerListingDetail({ params }: ListingDetailProps) {
  const router = useRouter();
  const { showToast } = useToast();
  
  // Resolve params Promise (Next.js 16 requirement)
  const resolvedParams = use(params);
  const listingId = resolvedParams.id;

  const [listing, setListing] = useState<any>(null);
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetailData = async () => {
      try {
        setLoading(true);
        // 1. Fetch listing details
        const listingRes = await fetch(`/api/listings/${listingId}`);
        const listingData = await listingRes.json();

        if (listingRes.ok) {
          setListing(listingData.listing);

          // 2. Fetch interests for this listing (filter from interests list or separate fetch)
          const interestsRes = await fetch('/api/interests?mode=received');
          const interestsData = await interestsRes.json();
          
          if (interestsRes.ok) {
            const listInterests = (interestsData.interests || []).filter(
              (i: any) => i.listing.id === listingId
            );
            setInterests(listInterests);
          }
        } else {
          showToast('Error', 'Listing not found', 'error');
          router.push('/dashboard/listings');
        }
      } catch (err) {
        console.error('Error fetching detail details:', err);
        showToast('Error', 'Something went wrong. Please check connection.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDetailData();
  }, [listingId, showToast, router]);

  const formatPrice = (price: string) => {
    const val = parseFloat(price);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lk`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return <Card padding="lg">Loading property detail logs...</Card>;
  }

  if (!listing) return null;

  return (
    <div>
      {/* Back link */}
      <Link href="/dashboard/listings" className={styles.backLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem', fontWeight: 600 }}>
        <ArrowLeft size={16} />
        Back to my properties
      </Link>

      {/* Header Info */}
      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <Badge variant="neutral" size="sm">{listing.listingFor}</Badge>
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
          </div>
          <h1 className={styles.welcomeText}>{listing.title}</h1>
          <p className={styles.subText}>
            {listing.locality}, {listing.city} · {formatPrice(listing.askingPrice)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button href={`/dashboard/listings/${listing.id}/edit`} variant="outline" leftIcon={<Edit size={16} />}>
            Edit Property
          </Button>
          <Button href={`/property/${listing.id}`} variant="primary" leftIcon={<Eye size={16} />}>
            Public View
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-primary-fade)', color: 'var(--color-primary)' }}>
            <Eye size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{listing.viewCount}</span>
            <span className={styles.statLabel}>Total Page Views</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'var(--color-secondary-fade)', color: 'var(--color-secondary)' }}>
            <Heart size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{interests.length}</span>
            <span className={styles.statLabel}>Interests Received</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-info)' }}>
            <Calendar size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statVal}>{new Date(listing.createdAt).toLocaleDateString()}</span>
            <span className={styles.statLabel}>Posted Date</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.dashboardGrid}>
        {/* Left Side: Property details summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Specifications */}
          <Card padding="md" title="Property Specifications">
            <h3 className={styles.sectionTitle}>Property Specifications</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.937rem', color: 'var(--color-text-secondary)' }}>
              <div><strong>Category:</strong> {listing.propertyType.replace('_', ' ')}</div>
              <div><strong>Area:</strong> {listing.carpetArea ? `${listing.carpetArea} sqft` : 'N/A'}</div>
              <div><strong>BHK:</strong> {listing.bedrooms ? `${listing.bedrooms} BHK` : 'N/A'}</div>
              <div><strong>Furnishing:</strong> {listing.furnishing || 'N/A'}</div>
              <div><strong>Facing:</strong> {listing.facing || 'N/A'}</div>
              <div><strong>Ownership:</strong> {listing.ownership || 'N/A'}</div>
              <div><strong>Parking:</strong> {listing.parking || 'N/A'}</div>
              <div><strong>RERA ID:</strong> {listing.reraNumber || 'N/A'}</div>
            </div>
          </Card>

          {/* Location details */}
          <Card padding="md">
            <h3 className={styles.sectionTitle}>Private Location Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.937rem', color: 'var(--color-text-secondary)' }}>
              <div><strong>City/State:</strong> {listing.city}</div>
              <div><strong>Locality/Pin:</strong> {listing.locality} - {listing.pinCode}</div>
              <div><strong>Full Address:</strong> {listing.fullAddress}</div>
              {listing.landmark && <div><strong>Landmark:</strong> {listing.landmark}</div>}
            </div>
          </Card>

          {/* Documents */}
          <Card padding="md">
            <h3 className={styles.sectionTitle}>Uploaded Documents</h3>
            {listing.documents?.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>No verification documents uploaded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {listing.documents?.map((doc: any) => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--color-neutral-50)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                      <span>{doc.docName} ({doc.docType})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Specific interests list */}
        <div>
          <h3 className={styles.sectionTitle}>Seeker Responses</h3>
          {interests.length === 0 ? (
            <div className={styles.emptyState}>
              <Heart size={36} style={{ opacity: 0.3 }} />
              <h3>No inquiries yet</h3>
              <p>Seekers details will appear here once they express interest.</p>
            </div>
          ) : (
            <div className={styles.interestsList}>
              {interests.map((interest) => (
                <div key={interest.id} className={styles.interestItem} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.937rem', color: 'var(--color-neutral-900)' }}>
                      {interest.user.name || 'Anonymous User'}
                    </div>
                    <Badge variant={interest.status === 'NEW' ? 'primary' : 'neutral'} size="sm">
                      {interest.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    <a href={`tel:${interest.user.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)' }}>
                      <Phone size={12} /> {interest.user.phone}
                    </a>
                    <a href={`mailto:${interest.user.email}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={12} /> {interest.user.email}
                    </a>
                  </div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Calendar size={10} /> Expressed on: {new Date(interest.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
