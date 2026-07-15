'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  MapPin, 
  Bed, 
  Square, 
  Check, 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Header, Footer } from '@/components/layout';
import { useToast, Card, Button, Badge } from '@/components/ui';
import { PhoneVerificationModal } from '@/components/auth/PhoneVerificationModal';
import styles from '../property.module.css';

interface PropertyClientProps {
  listingId: string;
  initialListing: any;
}

export default function PropertyClient({ listingId, initialListing }: PropertyClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile } = useAuth();
  
  const [listing, setListing] = useState<any>(initialListing);
  const [interestLoading, setInterestLoading] = useState(false);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [ownerContact, setOwnerContact] = useState<any | null>(null);

  // Phone verification modal
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // Fetch interest status on mount if logged in
  useEffect(() => {
    const checkInterestStatus = async () => {
      if (!user) return;
      try {
        const interestRes = await fetch('/api/interests?mode=expressed');
        if (interestRes.ok) {
          const expressedData = await interestRes.json();
          const matchingInterest = (expressedData.interests || []).find(
            (i: any) => i.listingId === listingId
          );
          
          if (matchingInterest) {
            setHasExpressedInterest(true);
            
            // If interest exists, pull contact details
            if (matchingInterest.listing.ownerPhone) {
              setOwnerContact({
                phone: matchingInterest.listing.ownerPhone,
                email: matchingInterest.listing.ownerEmail,
              });
            } else {
              // Re-fetch listing detail to see if owner contact is now exposed
              const authorizedDetailRes = await fetch(`/api/listings/${listingId}`);
              if (authorizedDetailRes.ok) {
                const authData = await authorizedDetailRes.json();
                if (authData.listing.owner && authData.listing.owner.phone !== '[Hidden — Click Interested to Contact]') {
                  setOwnerContact({
                    phone: authData.listing.owner.phone,
                    email: authData.listing.owner.email,
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking interest status:', err);
      }
    };
    checkInterestStatus();
  }, [listingId, user]);

  // Save to recent views on mount
  useEffect(() => {
    if (!initialListing) return;
    try {
      const existing = localStorage.getItem('listme_recent_views');
      let views = existing ? JSON.parse(existing) : [];
      if (!Array.isArray(views)) views = [];
      
      const newView = {
        id: initialListing.id,
        title: initialListing.title,
        locality: initialListing.locality,
        city: initialListing.city,
        timestamp: Date.now()
      };
      
      // Remove duplicate
      views = views.filter((v: any) => v.id !== initialListing.id);
      // Add to start
      views.unshift(newView);
      // Limit to 5
      views = views.slice(0, 5);
      
      localStorage.setItem('listme_recent_views', JSON.stringify(views));
    } catch (e) {
      console.error(e);
    }
  }, [initialListing]);

  const handleExpressInterest = async () => {
    if (!user) {
      showToast('Login Required', 'You must log in to express interest', 'warning');
      router.push(`/login?redirect=/property/${listingId}`);
      return;
    }

    if (!profile?.phoneVerified) {
      setVerificationModalOpen(true);
      return;
    }

    setInterestLoading(true);
    try {
      const res = await fetch('/api/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Success', 'Interest expressed! You can now contact the owner.', 'success');
        setHasExpressedInterest(true);
        
        // Re-fetch detail to get phone details
        const authorizedDetailRes = await fetch(`/api/listings/${listingId}`);
        if (authorizedDetailRes.ok) {
          const authData = await authorizedDetailRes.json();
          setListing(authData.listing);
          if (authData.listing.owner) {
            setOwnerContact({
              phone: authData.listing.owner.phone,
              email: authData.listing.owner.email,
            });
          }
        }
      } else {
        showToast('Error', data.message || 'Action failed', 'error');
      }
    } catch (err) {
      console.error('Interest submit error:', err);
      showToast('Error', 'Something went wrong', 'error');
    } finally {
      setInterestLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    const val = parseFloat(price);
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lk`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent size={18} /> : <Check size={18} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      
      <main className={`${styles.container} container`} style={{ flex: 1 }}>
        <Link href="/listings" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to search
        </Link>

        <div className={styles.detailGrid}>
          <div className={styles.leftCol}>
            <div className={styles.gallery}>
              {listing.images?.[0]?.imageUrl ? (
                <img
                  src={listing.images[0].imageUrl}
                  alt={listing.title}
                  className={styles.galleryImage}
                />
              ) : (
                <Building size={96} className={styles.galleryIcon} />
              )}
            </div>

            <div className={styles.titleBlock}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Badge variant="secondary">{listing.listingFor}</Badge>
                <Badge variant="neutral">{listing.propertyType.replace('_', ' ')}</Badge>
              </div>
              <h1 className={styles.title}>{listing.title}</h1>
              <div className={styles.cardLocation}>
                <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
                <span className={styles.location}>{listing.locality}, {listing.city} - {listing.pinCode}</span>
              </div>
            </div>

            <div className={styles.specsGrid}>
              <div className={styles.specCard}>
                <span className={styles.specLabel}>Asking Price</span>
                <span className={styles.specValue} style={{ color: 'var(--color-primary-dark)' }}>
                  {formatPrice(listing.askingPrice)}
                </span>
              </div>
              <div className={styles.specCard}>
                <span className={styles.specLabel}>Carpet Area</span>
                <span className={styles.specValue}>
                  {listing.carpetArea ? `${listing.carpetArea} sqft` : 'N/A'}
                </span>
              </div>
              {listing.bedrooms && (
                <div className={styles.specCard}>
                  <span className={styles.specLabel}>BHK</span>
                  <span className={styles.specValue}>{listing.bedrooms} BHK</span>
                </div>
              )}
            </div>

            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Property Description
              </h2>
              <p style={{ fontSize: '0.937rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {listing.description || 'No description provided.'}
              </p>
            </div>

            {listing.keyHighlights && listing.keyHighlights.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Property Highlights
                </h2>
                <div className={styles.highlightsList}>
                  {listing.keyHighlights.map((hl: string, index: number) => (
                    <div key={index} className={styles.highlightItem}>
                      <Check size={16} style={{ color: 'var(--color-success)', marginTop: '2px', flexShrink: 0 }} />
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {listing.amenities && listing.amenities.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Amenities
                </h2>
                <div className={styles.amenitiesContainer}>
                  {listing.amenities.map((item: any) => (
                    <div key={item.amenity.id} className={styles.amenityChip}>
                      {getIcon(item.amenity.iconName)}
                      <span>{item.amenity.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.rightCol}>
            <div className={styles.stickyWidget}>
              <div className={styles.priceWidget}>
                <div style={{ borderBottom: '1px solid var(--color-neutral-100)', paddingBottom: '1rem' }}>
                  <div className={styles.priceTitle}>Asking Price</div>
                  <div className={styles.priceValue}>{formatPrice(listing.askingPrice)}</div>
                  {listing.priceNegotiable && <span className={styles.priceNegotiable}>Negotiable</span>}
                </div>

                <div className={styles.ownerSection}>
                  <div className={styles.ownerTitle}>Property Owner</div>
                  <div className={styles.ownerInfo}>
                    <div className={styles.avatar}>
                      {listing.owner?.name ? listing.owner.name.substring(0, 2).toUpperCase() : 'OW'}
                    </div>
                    <div>
                      <div className={styles.ownerName}>{listing.owner?.name || 'Property Owner'}</div>
                      <div className={styles.ownerSub}>Listing ID: {listing.id.substring(0, 8)}</div>
                    </div>
                  </div>

                  {hasExpressedInterest ? (
                    <div className={styles.contactInfo}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: '4px' }}>
                        CONNECTION ACTIVE
                      </div>
                      <a href={`tel:${ownerContact?.phone || listing.owner?.phone}`} className={styles.contactLink}>
                        <Phone size={14} /> {ownerContact?.phone || listing.owner?.phone}
                      </a>
                      <a href={`mailto:${ownerContact?.email || listing.owner?.email}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.812rem' }}>
                        <Mail size={12} /> {ownerContact?.email || listing.owner?.email}
                      </a>
                    </div>
                  ) : (
                    <div className={styles.contactInfo} style={{ borderStyle: 'dashed', background: 'transparent', textAlign: 'center' }}>
                      <AlertCircle size={20} style={{ color: 'var(--color-primary)', margin: '0 auto 0.5rem' }} />
                      <span style={{ fontSize: '0.812rem', color: 'var(--color-text-secondary)' }}>
                        Phone number and exact address are hidden to protect privacy.
                      </span>
                    </div>
                  )}

                  {!hasExpressedInterest ? (
                    <Button
                      onClick={handleExpressInterest}
                      variant="primary"
                      fullWidth
                      loading={interestLoading}
                    >
                      I'm Interested
                    </Button>
                  ) : (
                    <Button variant="secondary" fullWidth disabled>
                      <Check size={16} /> Interest Expressed
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PhoneVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        onSuccess={async () => {
          showToast('Verified', 'Phone verified! Retrying express interest...', 'success');
          await handleExpressInterest();
        }}
      />

      <Footer />
    </div>
  );
}
