'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Search, 
  Heart, 
  Calculator, 
  Percent, 
  TrendingUp, 
  Home, 
  MapPin, 
  Building, 
  Key, 
  PlaySquare, 
  Lightbulb, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import styles from './MobileHome.module.css';
import { useMobileMenu } from '@/context/MobileMenuContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/components/ui';

interface ListingItem {
  id: string;
  title: string;
  locality: string;
  city: string;
  askingPrice: number | string;
  listingFor: string;
  bedrooms?: number | null;
  carpetArea?: number | null;
  builtUpArea?: number | null;
  images?: { imageUrl: string }[];
}

const DEFAULT_PROPERTIES: ListingItem[] = [
  {
    id: 'prop-1',
    title: 'Luxury 3 BHK Flat in Whitefield',
    locality: 'Whitefield',
    city: 'Bangalore',
    askingPrice: 28500000,
    listingFor: 'SALE',
    bedrooms: 3,
    carpetArea: 1500,
    images: [{ imageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=600&q=80' }]
  },
  {
    id: 'prop-2',
    title: 'Modern 3BHK Apartment in Hitec City',
    locality: 'Hitec City',
    city: 'Hyderabad',
    askingPrice: 45000,
    listingFor: 'RENT',
    bedrooms: 3,
    carpetArea: 1650,
    images: [{ imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80' }]
  },
  {
    id: 'prop-3',
    title: 'Independent Villa near EPIP Zone',
    locality: 'Whitefield',
    city: 'Bangalore',
    askingPrice: 32000000,
    listingFor: 'SALE',
    bedrooms: 4,
    carpetArea: 3400,
    images: [{ imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' }]
  }
];

const formatPrice = (price: number | string | null | undefined, listingFor?: string) => {
  if (!price) return 'Price on Request';
  const numericPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
  if (isNaN(numericPrice) || numericPrice <= 0) return 'Price on Request';
  
  if (listingFor?.toUpperCase() === 'SALE') {
    if (numericPrice >= 10000000) {
      return `₹${(numericPrice / 10000000).toFixed(2)} Cr`;
    }
    if (numericPrice >= 100000) {
      return `₹${(numericPrice / 100000).toFixed(2)} Lakh`;
    }
    return `₹${numericPrice.toLocaleString('en-IN')}`;
  } else {
    if (numericPrice >= 100000) {
      return `₹${(numericPrice / 100000).toFixed(2)} Lakh/mo`;
    }
    return `₹${numericPrice.toLocaleString('en-IN')} /month`;
  }
};

export const MobileHome: React.FC = () => {
  const { openMenu } = useMobileMenu();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Fetch live properties from database
  useEffect(() => {
    let isMounted = true;
    async function fetchLiveListings() {
      try {
        const res = await fetch('/api/listings?limit=6');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.listings) && data.listings.length > 0) {
            setListings(data.listings);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch live mobile listings:', err);
      } finally {
        if (isMounted) setLoadingListings(false);
      }
    }
    fetchLiveListings();
    return () => {
      isMounted = false;
    };
  }, []);

  const heroImage = settings?.mobileHeroImage || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';
  const displayedProperties = listings.length > 0 ? listings : DEFAULT_PROPERTIES;

  return (
    <div className={styles.mobileHomeContainer}>
      {/* 0. Mobile Header */}
      <header className={styles.mobileHeader}>
        <div className={styles.mobileHeaderTop}>
          <div className={styles.mobileLogo}>ListMe</div>
          <Link href="/post-property" className={styles.mobilePostPropertyBtn}>
            Post Property <span className={styles.freeBadge}>FREE</span>
          </Link>
        </div>
      </header>

      {/* 1. Hero Search Area */}
      <section className={styles.heroSection}>
        <Image 
          src={heroImage} 
          alt="ListMe Hero Property" 
          width={800} 
          height={400} 
          className={styles.heroImageEl}
          priority
        />
        <div className={styles.heroOverlay} />
      </section>

      {/* Interactive Sticky Search Bar */}
      <div className={styles.stickySearchContainer}>
        <Link href="/listings" className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={20} />
          <input 
            type="text" 
            placeholder='Search "3 BHK flats for sale in Noida"'
            className={styles.searchInput}
            readOnly 
          />
        </Link>
      </div>

      {/* 2. Get Started Section */}
      <section className={`${styles.section} ${styles.getStartedSection}`}>
        <h2 className={styles.getStartedTitle}>Get started with</h2>
        <p className={styles.getStartedSubtitle}>Explore real estate options in top cities</p>
        
        <div className={styles.navCardsRow}>
          <Link href="/listings?type=sale" className={styles.navCard}>
            <div className={styles.iconCircle}>
              <Home size={22} color="#3182ce" />
            </div>
            <span>Buy</span>
          </Link>

          <Link href="/listings?type=rent" className={styles.navCard}>
            <div className={styles.iconCircle}>
              <Key size={22} color="#3182ce" />
            </div>
            <span>Rent</span>
          </Link>

          <Link href="/listings?type=sale&possession=under_construction" className={styles.navCard}>
            <div className={styles.iconCircle}>
              <PlaySquare size={22} color="#3182ce" />
            </div>
            <span>New Projects</span>
          </Link>

          <div className={styles.navCard} onClick={openMenu}>
            <div className={styles.iconCircle}>
              <Lightbulb size={22} color="#3182ce" />
            </div>
            <span>Insights</span>
          </div>

          <Link href="/listings?type=commercial" className={styles.navCard}>
            <div className={styles.iconCircle}>
              <Building size={22} color="#3182ce" />
            </div>
            <span>Commercial</span>
          </Link>

          <div className={styles.navCard} onClick={openMenu}>
            <div className={styles.iconCircle}>
              <ArrowRight size={22} color="#3182ce" />
            </div>
            <span style={{ color: '#3182ce' }}>View all</span>
          </div>
        </div>
      </section>
      
      {/* Quick Search Tags */}
      <div className={styles.recentSearchRowWrapper}>
        <div className={styles.recentSearchRow}>
          <Link href="/listings?type=sale&city=gurgaon" className={styles.recentSearchPill}>
            Buy in Gurgaon
          </Link>
          <Link href="/listings?type=rent&city=delhi" className={styles.recentSearchPill}>
            Rent in Delhi
          </Link>
          <Link href="/listings?type=commercial&city=noida" className={styles.recentSearchPill}>
            Commercial in Noida
          </Link>
          <Link href="/listings?type=sale&city=bangalore" className={styles.recentSearchPill}>
            Buy in Bangalore
          </Link>
        </div>
      </div>

      {/* 2. Recommended Properties Carousel (Connected to Live DB) */}
      <section className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.25rem' }}>
          <div>
            <h2 className={styles.sectionTitle}>Recommended Properties</h2>
            <p className={styles.sectionSubtitle}>
              {listings.length > 0 ? 'Live verified properties across top locations' : 'Handpicked properties for you'}
            </p>
          </div>
          <Link href="/listings" style={{ fontSize: '0.812rem', color: 'var(--color-primary-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', paddingBottom: '0.5rem' }}>
            View All →
          </Link>
        </div>
        
        <div className={styles.carousel}>
          {displayedProperties.map((property) => {
            const primaryImg = property.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=400&q=80';
            const isLive = !property.id.startsWith('prop-');
            const targetHref = isLive ? `/property/${property.id}` : '/listings';

            return (
              <Link key={property.id} href={targetHref} className={styles.propertyCard}>
                <div className={styles.propertyImageWrapper}>
                  <Image 
                    src={primaryImg}
                    alt={property.title} 
                    fill
                    sizes="(max-width: 768px) 80vw, 300px"
                    className={styles.propertyImage} 
                  />
                  <button 
                    className={styles.heartIcon} 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      showToast('Shortlisted', 'Saved to your interested properties!', 'success');
                    }}
                    aria-label="Save Property"
                  >
                    <Heart size={16} />
                  </button>
                  <div className={styles.priceTag}>
                    {formatPrice(property.askingPrice, property.listingFor)}
                  </div>
                </div>
                <div className={styles.propertyInfo}>
                  <h3 className={styles.propertyTitle}>{property.title}</h3>
                  <span className={styles.propertyMeta}>{property.locality}, {property.city}</span>
                  <div className={styles.propertyFooter}>
                    {property.bedrooms ? `${property.bedrooms} BHK • ` : ''}
                    {property.carpetArea 
                      ? `${property.carpetArea} sqft` 
                      : property.builtUpArea 
                      ? `${property.builtUpArea} sqft` 
                      : 'Ready to Move'}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Property Categories */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Apartments, Villas and more</h2>
        <div className={styles.tallCardCarousel}>
          <Link href="/listings?property_type=APARTMENT" className={styles.tallCard} style={{ backgroundColor: '#f0f9ff' }}>
            <h3 className={styles.tallCardTitle}>Residential<br/>Apartment</h3>
            <span className={styles.tallCardSub}>Explore Units</span>
            <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80" alt="Apt" className={styles.tallCardImg} />
          </Link>
          <Link href="/listings?property_type=VILLA" className={styles.tallCard} style={{ backgroundColor: '#fff5f5' }}>
            <h3 className={styles.tallCardTitle}>Independent<br/>House/Villa</h3>
            <span className={styles.tallCardSub}>Explore Villas</span>
            <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=200&q=80" alt="Villa" className={styles.tallCardImg} />
          </Link>
          <Link href="/listings?property_type=BUILDER_FLOOR" className={styles.tallCard} style={{ backgroundColor: '#f0fdf4' }}>
            <h3 className={styles.tallCardTitle}>Builder<br/>Floor</h3>
            <span className={styles.tallCardSub}>Explore Floors</span>
            <img src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=200&q=80" alt="Floor" className={styles.tallCardImg} />
          </Link>
        </div>
      </section>

      {/* 4. Filter Pills */}
      <section className={styles.filterPillsSection}>
        <div className={styles.filterPillsRow}>
          <Link href="/listings?bhk=2BHK" className={styles.filterPillCard}>
            <Home className={styles.filterPillIcon} size={20} />
            <h4 className={styles.filterPillTitle}>BHK choice in mind?</h4>
            <span className={styles.filterPillSub}>1 BHK, 2 BHK, 3 BHK</span>
          </Link>
          <Link href="/listings?owner=true" className={styles.filterPillCard}>
            <MapPin className={styles.filterPillIcon} size={20} />
            <h4 className={styles.filterPillTitle}>Properties posted by</h4>
            <span className={styles.filterPillSub}>Direct Verified Owners</span>
          </Link>
        </div>
      </section>

      {/* 5. Recommended Projects */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recommended Projects</h2>
        <div className={styles.carousel}>
          <Link href="/listings?query=Whitefield" className={styles.projectCard}>
            <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80" alt="Project" className={styles.projectImage} />
            <div className={styles.reraBadge}>RERA</div>
            <div className={styles.possessionTag}>Possession in 1 Year</div>
            <div className={styles.projectInfo}>
              <h3 className={styles.projectTitle}>Godrej Splendour</h3>
              <p className={styles.projectMeta}>Whitefield, Bangalore</p>
              <span className={styles.projectPrice}>₹ 1.2 Cr onwards</span>
            </div>
          </Link>

          <Link href="/listings?query=Hitec" className={styles.projectCard}>
            <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80" alt="Project" className={styles.projectImage} />
            <div className={styles.reraBadge}>RERA</div>
            <div className={styles.possessionTag}>Ready to Move</div>
            <div className={styles.projectInfo}>
              <h3 className={styles.projectTitle}>Prestige Cyber Towers</h3>
              <p className={styles.projectMeta}>Hitec City, Hyderabad</p>
              <span className={styles.projectPrice}>₹ 1.85 Cr onwards</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 6. Localities */}
      <section className={styles.section} style={{ backgroundColor: '#f8fafc' }}>
        <h2 className={styles.sectionTitle}>Localities you may like</h2>
        <div className={styles.carousel}>
          <Link href="/listings?city=bangalore&query=Koramangala" className={styles.localityCard}>
            <div className={styles.localityHeader}>
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Locality" className={styles.localityThumb} />
              <div>
                <h4 className={styles.localityName}>Koramangala</h4>
                <span className={styles.localityRating}>4.8 ★</span>
              </div>
            </div>
            <div className={styles.localityStats}>
              <span className={styles.localityPrice}>₹ 12,500 / sqft</span>
              <span className={styles.localityGrowth}><TrendingUp size={12}/> +8.5% YoY</span>
            </div>
          </Link>

          <Link href="/listings?city=delhi&query=Hauz+Khas" className={styles.localityCard}>
            <div className={styles.localityHeader}>
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Locality" className={styles.localityThumb} />
              <div>
                <h4 className={styles.localityName}>Hauz Khas</h4>
                <span className={styles.localityRating}>4.9 ★</span>
              </div>
            </div>
            <div className={styles.localityStats}>
              <span className={styles.localityPrice}>₹ 18,200 / sqft</span>
              <span className={styles.localityGrowth}><TrendingUp size={12}/> +6.2% YoY</span>
            </div>
          </Link>

          <Link href="/listings?city=mumbai&query=Bandra" className={styles.localityCard}>
            <div className={styles.localityHeader}>
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="Locality" className={styles.localityThumb} />
              <div>
                <h4 className={styles.localityName}>Bandra West</h4>
                <span className={styles.localityRating}>4.9 ★</span>
              </div>
            </div>
            <div className={styles.localityStats}>
              <span className={styles.localityPrice}>₹ 45,000 / sqft</span>
              <span className={styles.localityGrowth}><TrendingUp size={12}/> +11.4% YoY</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 7. App Banner */}
      <div className={styles.appBanner}>
        <h3 className={styles.bannerTitle}>Search 1.5x faster with verified owners</h3>
        <ul className={styles.bannerList}>
          <li>Personalized instant alerts</li>
          <li>Direct chat with genuine owners</li>
        </ul>
        <Link href="/listings" className={styles.bannerBtn}>Explore Verified Listings</Link>
        <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=200&q=80" alt="Phone" className={styles.bannerImg} style={{ clipPath: 'circle(50% at 50% 50%)' }} />
      </div>

      {/* 8. Tools */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Use popular tools</h2>
        <p className={styles.sectionSubtitle}>Make informed decisions</p>
        <div className={styles.toolsRow}>
          <div 
            className={styles.toolCard} 
            onClick={() => showToast('Budget Calculator', 'Interactive Calculator is coming soon in the next update!', 'info')}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.toolIconWrapper}>
              <Calculator size={24} />
            </div>
            <span className={styles.toolTitle}>Budget Calculator</span>
          </div>

          <div 
            className={styles.toolCard} 
            onClick={() => showToast('EMI Calculator', 'Interactive EMI Calculator is coming soon in the next update!', 'info')}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.toolIconWrapper}>
              <Percent size={24} />
            </div>
            <span className={styles.toolTitle}>EMI Calculator</span>
          </div>
        </div>
      </section>

    </div>
  );
};
