'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Building, Bed, MapPin } from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { SaveButton } from '@/components/ui/SaveButton';
import { useSavedListings } from '@/context/SavedListingsContext';
import styles from '../dashboard.module.css';
import cardStyles from '../../listings/listings.module.css';

interface SavedListing {
  id: string;
  title: string;
  askingPrice: string;
  listingFor: string;
  propertyType: string;
  city: string;
  locality: string;
  bedrooms: number | null;
  carpetArea: number | null;
  imageUrl: string | null;
}

const formatPrice = (price: string) => {
  const val = parseFloat(price);
  if (isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lk`;
  return `₹${val.toLocaleString('en-IN')}`;
};

export default function SavedPropertiesPage() {
  const { isSaved, ready } = useSavedListings();
  const [listings, setListings] = useState<SavedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/users/shortlist?full=1', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { listings?: SavedListing[] } = await res.json();
      setListings(data.listings ?? []);
    } catch (err) {
      console.error('[SavedProperties] Load failed:', err);
      setLoadError('Could not load your saved properties.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Wait for the saved-listings store so saves made while signed out are
  // moved to the account before this list is read.
  useEffect(() => {
    if (ready) fetchSaved();
  }, [ready, fetchSaved]);

  // Un-saving from this page removes the card straight away.
  const visible = listings.filter((l) => isSaved(l.id));

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.welcomeText}>Saved Properties</h1>
          <p className={styles.subText}>Properties you saved with the heart button. Tap the heart again to remove one.</p>
        </div>
      </div>

      {loading ? (
        <Card padding="md">Loading saved properties...</Card>
      ) : loadError ? (
        <div className={styles.errorBanner} role="alert">
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchSaved()}>
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.emptyState}>
          <Heart size={48} style={{ opacity: 0.3 }} />
          <h3>No saved properties yet</h3>
          <p>Tap the heart on any property to save it here.</p>
          <Link href="/listings">
            <Button variant="primary" size="sm">Browse properties</Button>
          </Link>
        </div>
      ) : (
        <div className={cardStyles.grid}>
          {visible.map((item) => (
            <div key={item.id} className={cardStyles.cardWrap}>
              <Link href={`/property/${item.id}`} className={cardStyles.cardLink}>
                <Card className={cardStyles.propertyCard} hoverable>
                  <div className={cardStyles.cardImageArea}>
                    <Badge variant="secondary" className={cardStyles.cardBadge}>
                      {item.listingFor === 'RENT' ? 'For Rent' : item.listingFor === 'SALE' ? 'For Sale' : item.listingFor}
                    </Badge>
                    <div className={cardStyles.cardPrice}>
                      {formatPrice(item.askingPrice)}
                      {item.listingFor === 'RENT' && <span className={cardStyles.priceUnit}>/month</span>}
                    </div>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className={cardStyles.cardImage} loading="lazy" decoding="async" />
                    ) : (
                      <Building size={64} style={{ color: 'var(--color-neutral-300)' }} />
                    )}
                  </div>
                  <div className={cardStyles.cardContent}>
                    <h3 className={cardStyles.cardTitle}>{item.title}</h3>
                    <div className={cardStyles.cardLocation}>
                      <MapPin size={12} style={{ color: 'var(--color-primary)' }} />
                      <span>{item.locality}, {item.city}</span>
                    </div>
                    {(item.bedrooms || item.carpetArea) && (
                      <div className={cardStyles.cardSpecs}>
                        {item.bedrooms ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Bed size={14} /> {item.bedrooms} BHK
                          </span>
                        ) : null}
                        {item.carpetArea ? <span>{item.carpetArea} sqft</span> : null}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
              <SaveButton
                listingId={item.id}
                className={cardStyles.saveButton}
                activeClassName={cardStyles.saveButtonActive}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
