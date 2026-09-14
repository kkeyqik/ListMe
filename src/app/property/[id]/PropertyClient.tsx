'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  ExternalLink,
  Play
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

function getEmbedUrl(rawUrl: string): { type: 'iframe' | 'video' | 'link' | 'invalid'; url: string } {
  if (!rawUrl || typeof rawUrl !== 'string') return { type: 'invalid', url: '' };
  const trimmed = rawUrl.trim();
  if (!trimmed) return { type: 'invalid', url: '' };

  // Reject unsafe schemes (XSS prevention)
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return { type: 'invalid', url: '' };
  }

  // Parse start timestamp if present in query param (e.g. ?t=45, ?t=1m30s, &start=45)
  const extractTime = (url: string): number | null => {
    try {
      const match = url.match(/[?&#](?:t|start)=([0-9mh]+[0-9s]?|[0-9]+)/i);
      if (!match || !match[1]) return null;
      const val = match[1].toLowerCase();
      if (/^\d+$/.test(val)) return parseInt(val, 10);
      let totalSec = 0;
      const hMatch = val.match(/(\d+)h/);
      const mMatch = val.match(/(\d+)m/);
      const sMatch = val.match(/(\d+)s/);
      if (hMatch) totalSec += parseInt(hMatch[1], 10) * 3600;
      if (mMatch) totalSec += parseInt(mMatch[1], 10) * 60;
      if (sMatch) totalSec += parseInt(sMatch[1], 10);
      return totalSec > 0 ? totalSec : null;
    } catch {
      return null;
    }
  };

  // 1. YouTube (watch, embed, v, shorts, live, youtu.be)
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const startTime = extractTime(trimmed);
    const startParam = startTime ? `&start=${startTime}` : '';
    return {
      type: 'iframe',
      url: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1${startParam}`,
    };
  }

  // 2. Vimeo (standard, unlisted with hash, channels, groups, player)
  const vimeoRegex = /(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|video\/|)(\d+)(?:\/([a-zA-Z0-9]+))?)|(?:player\.vimeo\.com\/video\/(\d+)(?:\?h=([a-zA-Z0-9]+))?)/;
  const vimeoMatch = trimmed.match(vimeoRegex);
  if (vimeoMatch) {
    const vimeoId = vimeoMatch[1] || vimeoMatch[3];
    const vimeoHash = vimeoMatch[2] || vimeoMatch[4];
    if (vimeoId) {
      const hashParam = vimeoHash ? `&h=${vimeoHash}` : '';
      return {
        type: 'iframe',
        url: `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0${hashParam}`,
      };
    }
  }

  // 3. Matterport 3D Showcase
  const matterportMatch = trimmed.match(/my\.matterport\.com\/show\/\?m=([a-zA-Z0-9]+)/i);
  if (matterportMatch && matterportMatch[1]) {
    return {
      type: 'iframe',
      url: `https://my.matterport.com/show/?m=${matterportMatch[1]}&play=1`,
    };
  }

  // 4. Loom embed
  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  if (loomMatch && loomMatch[1]) {
    return {
      type: 'iframe',
      url: `https://www.loom.com/embed/${loomMatch[1]}`,
    };
  }

  // 5. Streamable embed
  const streamableMatch = trimmed.match(/streamable\.com\/(?:e\/)?([a-zA-Z0-9]+)/i);
  if (streamableMatch && streamableMatch[1]) {
    return {
      type: 'iframe',
      url: `https://streamable.com/e/${streamableMatch[1]}`,
    };
  }

  // 6. Direct video format (.mp4, .webm, .ogg, .mov)
  if (/\.(mp4|webm|ogg|mov)($|\?)/i.test(trimmed)) {
    return {
      type: 'video',
      url: trimmed,
    };
  }

  // 7. Any other valid HTTP/HTTPS link -> External Link Tour
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      type: 'link',
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
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Mobile touch gesture tracking
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const images = listing?.images || [];
  const videos = listing?.videos || [];
  const hasVideos = videos.length > 0;
  const currentVideo = hasVideos ? videos[0] : null;

  const isOwnerVerified = Boolean(
    listing?.owner?.phoneVerified ||
    listing?.owner?.role === 'ADMIN' ||
    listing?.owner?.role === 'SUPER_ADMIN'
  );

  const safeImageIndex = images.length > 0 ? Math.max(0, Math.min(activeImageIndex, images.length - 1)) : 0;

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailRefs.current[safeImageIndex]) {
      thumbnailRefs.current[safeImageIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [safeImageIndex]);

  // Keep active index in bounds if images change
  useEffect(() => {
    if (activeImageIndex >= images.length && images.length > 0) {
      setActiveImageIndex(images.length - 1);
    }
  }, [images.length, activeImageIndex]);

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev <= 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev >= images.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      handleNextImage();
    } else if (distance < -minSwipeDistance) {
      handlePrevImage();
    }

    touchStartX.current = null;
    touchEndX.current = null;
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
            if (matchingInterest.listing?.ownerPhone && !matchingInterest.listing.ownerPhone.startsWith('[Hidden')) {
              setOwnerContact({
                phone: matchingInterest.listing.ownerPhone,
                email: matchingInterest.listing.ownerEmail,
              });
            } else {
              // Re-fetch listing detail to see if owner contact is now exposed
              const authorizedDetailRes = await fetch(`/api/listings/${listingId}`);
              if (authorizedDetailRes.ok) {
                const authData = await authorizedDetailRes.json();
                if (authData.listing?.owner && authData.listing.owner.phone && !authData.listing.owner.phone.startsWith('[Hidden')) {
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
              <div className={styles.mediaTabs} role="tablist" aria-label="Media view options">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMediaTab === 'photos'}
                  className={`${styles.mediaTab} ${activeMediaTab === 'photos' ? styles.mediaTabActive : ''}`}
                  onClick={() => setActiveMediaTab('photos')}
                >
                  <ImageIcon size={16} />
                  <span>Photos</span>
                  <span className={styles.mediaTabBadge}>{images.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeMediaTab === 'video'}
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
                } else if (videoEmbed.type === 'link') {
                  return (
                    <div className={styles.videoFallback}>
                      <div className={styles.videoFallbackIcon}>
                        <Play size={24} />
                      </div>
                      <div className={styles.videoFallbackTitle}>Property Video Tour</div>
                      <p className={styles.videoFallbackText}>
                        The owner has provided an external video walkthrough tour for this listing.
                      </p>
                      <a
                        href={videoEmbed.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.videoFallbackBtn}
                      >
                        <ExternalLink size={16} /> Watch Video Tour
                      </a>
                    </div>
                  );
                } else {
                  return (
                    <div className={styles.videoFallback}>
                      <div className={styles.videoFallbackIcon}>
                        <Video size={24} />
                      </div>
                      <div className={styles.videoFallbackTitle}>Video Tour Unavailable</div>
                      <p className={styles.videoFallbackText}>
                        The provided video link is invalid or temporarily unavailable.
                      </p>
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
                  aria-label="Property photos gallery. Use left and right arrow keys to navigate."
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      handlePrevImage();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      handleNextImage();
                    } else if (e.key === 'Home') {
                      e.preventDefault();
                      setActiveImageIndex(0);
                    } else if (e.key === 'End' && images.length > 0) {
                      e.preventDefault();
                      setActiveImageIndex(images.length - 1);
                    }
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {images.length > 0 ? (
                    <>
                      <img
                        src={images[safeImageIndex]?.imageUrl || images[0].imageUrl}
                        alt={`${listing.title} - Photo ${safeImageIndex + 1} of ${images.length}`}
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
                            <span>{safeImageIndex + 1} / {images.length}</span>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <Building size={96} className={styles.galleryIcon} />
                  )}
                </div>

                {images.length > 1 && (
                  <div className={styles.thumbnailTrack} role="tablist" aria-label="Photo thumbnails">
                    {images.map((img: any, idx: number) => (
                      <button
                        key={img.id || idx}
                        ref={(el) => {
                          thumbnailRefs.current[idx] = el;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={safeImageIndex === idx}
                        className={`${styles.thumbnailBtn} ${safeImageIndex === idx ? styles.thumbnailActive : ''}`}
                        onClick={() => {
                          setActiveImageIndex(idx);
                          setActiveMediaTab('photos');
                        }}
                        aria-label={`View photo ${idx + 1} of ${images.length}`}
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
                    <div className={styles.trustMainTitle}>
                      {isOwnerVerified ? '100% Direct from Verified Owner' : 'Direct from Property Owner'}
                    </div>
                    <div className={styles.trustSubTitle}>Zero Brokerage • Zero Middlemen • Direct Connection</div>
                  </div>
                </div>
                <div className={styles.trustBadgeGroup}>
                  <span className={`${styles.trustBadge} ${styles.trustBadgeZero}`}>
                    <CheckCircle2 size={13} /> 0% Brokerage
                  </span>
                  {isOwnerVerified ? (
                    <span className={`${styles.trustBadge} ${styles.trustBadgeVerified}`}>
                      <ShieldCheck size={13} /> Phone Verified
                    </span>
                  ) : (
                    <span className={`${styles.trustBadge} ${styles.trustBadgePending}`}>
                      <AlertCircle size={13} /> Direct Listing
                    </span>
                  )}
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
                    <span className={styles.trustFeatureBold}>
                      {isOwnerVerified ? 'Verified Contact' : 'Direct Owner Listing'}
                    </span>
                    {isOwnerVerified
                      ? 'Owner phone number is verified via mobile OTP for authentic listings.'
                      : 'Direct listing by owner. No broker intermediation.'}
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
                      {isOwnerVerified ? (
                        <div className={styles.ownerVerifiedPill}>
                          <ShieldCheck size={11} /> Verified Owner
                        </div>
                      ) : (
                        <div className={styles.ownerUnverifiedPill}>
                          <AlertCircle size={11} /> Owner Listing
                        </div>
                      )}
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
