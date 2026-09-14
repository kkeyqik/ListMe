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
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Video,
  Camera,
  Image as ImageIcon
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

function getEmbedUrl(rawUrl: string): { type: 'iframe' | 'video' | 'invalid'; url: string } {
  if (!rawUrl) return { type: 'invalid', url: '' };
  const trimmed = rawUrl.trim();

  // YouTube match
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'iframe',
      url: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
    };
  }

  // Vimeo match
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: 'iframe',
      url: `https://player.vimeo.com/video/${vimeoMatch[3]}?title=0&byline=0&portrait=0`,
    };
  }

  // Direct video format (.mp4, .webm, .ogg)
  if (/\.(mp4|webm|ogg)($|\?)/i.test(trimmed)) {
    return {
      type: 'video',
      url: trimmed,
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return {
      type: 'iframe',
      url: trimmed,
    };
  }

  return { type: 'invalid', url: '' };
}

export default function PropertyClient({ listingId, initialListing }: PropertyClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, profile } = useAuth();
  
  const [listing, setListing] = useState<any>(initialListing);
  const [interestLoading, setInterestLoading] = useState(false);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [ownerContact, setOwnerContact] = useState<any | null>(null);

  // Media gallery & video walkthrough state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video'>('photos');

  const images = listing?.images || [];
  const videos = listing?.videos || [];
  const hasVideos = videos.length > 0;
  const currentVideo = hasVideos ? videos[0] : null;

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

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
            {/* Media Tabs (Photos vs Video Walkthrough) */}
            {hasVideos && (
              <div className={styles.mediaTabs}>
                <button
                  type="button"
                  className={`${styles.mediaTab} ${activeMediaTab === 'photos' ? styles.mediaTabActive : ''}`}
                  onClick={() => setActiveMediaTab('photos')}
                >
                  <ImageIcon size={16} />
                  <span>Photos</span>
                  <span className={styles.mediaTabBadge}>{images.length}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.mediaTab} ${activeMediaTab === 'video' ? styles.mediaTabActive : ''}`}
                  onClick={() => setActiveMediaTab('video')}
                >
                  <Video size={16} />
                  <span>Video Tour</span>
                </button>
              </div>
            )}

            {/* Media Display: Video Player or Photo Gallery Slider */}
            {activeMediaTab === 'video' && currentVideo ? (
              (() => {
                const videoEmbed = getEmbedUrl(currentVideo.videoUrl);
                if (videoEmbed.type === 'iframe') {
                  return (
                    <div className={styles.videoContainer}>
                      <iframe
                        src={videoEmbed.url}
                        className={styles.videoIframe}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        title={`Video walkthrough for ${listing.title}`}
                      />
                    </div>
                  );
                } else if (videoEmbed.type === 'video') {
                  return (
                    <div className={styles.videoContainer}>
                      <video
                        src={videoEmbed.url}
                        controls
                        className={styles.videoPlayer}
                        poster={images[0]?.imageUrl}
                      />
                    </div>
                  );
                } else {
                  return (
                    <div className={styles.videoContainer} style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>
                      <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Video Walkthrough Available</p>
                      <a
                        href={currentVideo.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-secondary-light)', textDecoration: 'underline', fontSize: '0.875rem' }}
                      >
                        Click here to watch video tour ↗
                      </a>
                    </div>
                  );
                }
              })()
            ) : (
              <div>
                <div
                  className={styles.gallery}
                  tabIndex={0}
                  role="region"
                  aria-label="Property photos gallery"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') handlePrevImage();
                    if (e.key === 'ArrowRight') handleNextImage();
                  }}
                >
                  {images.length > 0 ? (
                    <>
                      <img
                        src={images[Math.min(activeImageIndex, images.length - 1)]?.imageUrl || images[0].imageUrl}
                        alt={`${listing.title} - Photo ${activeImageIndex + 1}`}
                        className={styles.galleryImage}
                      />
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            className={`${styles.galleryNavBtn} ${styles.galleryNavPrev}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevImage();
                            }}
                            aria-label="Previous photo"
                          >
                            <ChevronLeft size={22} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.galleryNavBtn} ${styles.galleryNavNext}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextImage();
                            }}
                            aria-label="Next photo"
                          >
                            <ChevronRight size={22} />
                          </button>
                          <div className={styles.galleryCounter}>
                            <Camera size={14} />
                            <span>{activeImageIndex + 1} / {images.length}</span>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <Building size={96} className={styles.galleryIcon} />
                  )}
                </div>

                {images.length > 1 && (
                  <div className={styles.thumbnailTrack} role="region" aria-label="Photo thumbnails">
                    {images.map((img: any, idx: number) => (
                      <button
                        key={img.id || idx}
                        type="button"
                        className={`${styles.thumbnailBtn} ${activeImageIndex === idx ? styles.thumbnailActive : ''}`}
                        onClick={() => {
                          setActiveImageIndex(idx);
                          setActiveMediaTab('photos');
                        }}
                        aria-label={`View photo ${idx + 1}`}
                      >
                        <img src={img.imageUrl} alt={`Thumbnail ${idx + 1}`} className={styles.thumbnailImg} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

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

            {/* 100% Direct from Verified Owner — Zero Brokerage Trust Banner */}
            <div className={styles.trustBanner}>
              <div className={styles.trustHeader}>
                <div className={styles.trustTitleGroup}>
                  <div className={styles.trustIconWrap}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className={styles.trustMainTitle}>100% Direct from Verified Owner</div>
                    <div className={styles.trustSubTitle}>Zero Brokerage • Zero Middlemen • Direct Connection</div>
                  </div>
                </div>
                <div className={styles.trustBadgeGroup}>
                  <span className={`${styles.trustBadge} ${styles.trustBadgeZero}`}>
                    <CheckCircle2 size={13} /> 0% Brokerage
                  </span>
                  <span className={`${styles.trustBadge} ${styles.trustBadgeVerified}`}>
                    <ShieldCheck size={13} /> Identity Verified
                  </span>
                </div>
              </div>

              <div className={styles.trustFeaturesGrid}>
                <div className={styles.trustFeatureItem}>
                  <CheckCircle2 size={16} className={styles.trustFeatureCheck} />
                  <div className={styles.trustFeatureText}>
                    <span className={styles.trustFeatureBold}>Zero Brokerage Guaranteed</span>
                    Save thousands on broker commissions. Deal directly with the property owner.
                  </div>
                </div>
                <div className={styles.trustFeatureItem}>
                  <CheckCircle2 size={16} className={styles.trustFeatureCheck} />
                  <div className={styles.trustFeatureText}>
                    <span className={styles.trustFeatureBold}>Direct Owner Connection</span>
                    Talk directly with the genuine owner. No agents or middlemen involved.
                  </div>
                </div>
                <div className={styles.trustFeatureItem}>
                  <CheckCircle2 size={16} className={styles.trustFeatureCheck} />
                  <div className={styles.trustFeatureText}>
                    <span className={styles.trustFeatureBold}>Verified Contact</span>
                    Owner phone number is verified via mobile OTP for authentic listings.
                  </div>
                </div>
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
                      <div className={styles.ownerVerifiedPill}>
                        <ShieldCheck size={11} /> Verified Owner
                      </div>
                      <div className={styles.ownerZeroBrokerage}>
                        <CheckCircle2 size={12} /> Direct Owner • 0% Brokerage
                      </div>
                      <div className={styles.ownerSub} style={{ marginTop: '4px' }}>Listing ID: {listing.id.substring(0, 8)}</div>
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
