'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Building, Building2, ShieldCheck, Heart, Check, Tag, ArrowUp, MapPin, MessageSquare, Calendar, Home as HomeIcon, CheckCircle, Users, CircleDollarSign, Star } from 'lucide-react';
import { Header, Footer } from '../components/layout';
import { Button, Card } from '../components/ui';
import styles from './Home.module.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';


// Register ScrollTrigger plugin (client-side only to prevent SSR issues)
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const avatars = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
];

const staticHandpickedProperties = [
  {
    id: 'static-1',
    title: 'Luxury Villa in Whitefield',
    location: 'Whitefield, Bangalore',
    price: '₹2.85 Cr',
    beds: 4,
    baths: 4,
    area: '3200 Sq.Ft',
    tag: 'For Sale',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
    ownerVerified: true,
  },
  {
    id: 'static-2',
    title: 'Modern 3BHK Apartment',
    location: 'Hitec City, Hyderabad',
    price: '₹45,000 /month',
    beds: 3,
    baths: 2,
    area: '1650 Sq.Ft',
    tag: 'For Rent',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    ownerVerified: true,
  },
  {
    id: 'static-3',
    title: 'Premium Duplex House',
    location: 'Gachibowli, Hyderabad',
    price: '₹1.95 Cr',
    beds: 4,
    baths: 3,
    area: '2400 Sq.Ft',
    tag: 'For Sale',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    ownerVerified: true,
  },
  {
    id: 'static-4',
    title: 'Studio Apartment',
    location: 'Koramangala, Bangalore',
    price: '₹22,000 /month',
    beds: 1,
    baths: 1,
    area: '600 Sq.Ft',
    tag: 'For Rent',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    ownerVerified: true,
  }
];

const formatPrice = (price: number | string, listingFor: string) => {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) return 'Price on Request';
  
  if (listingFor.toUpperCase() === 'SALE') {
    if (numericPrice >= 10000000) {
      return `₹${(numericPrice / 10000000).toFixed(2)} Cr`;
    }
    if (numericPrice >= 100000) {
      return `₹${(numericPrice / 100000).toFixed(2)} Lakh`;
    }
    return `₹${numericPrice.toLocaleString('en-IN')}`;
  } else {
    return `₹${numericPrice.toLocaleString('en-IN')} /month`;
  }
};

const mapDbListingToProperty = (dbListing: any) => {
  const primaryImage = dbListing.images?.[0]?.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80';
  return {
    id: dbListing.id,
    title: dbListing.title,
    location: `${dbListing.locality}, ${dbListing.city}`,
    price: formatPrice(dbListing.askingPrice, dbListing.listingFor),
    beds: dbListing.bedrooms || 0,
    baths: dbListing.bathrooms || 0,
    area: dbListing.carpetArea ? `${dbListing.carpetArea} Sq.Ft` : (dbListing.builtUpArea ? `${dbListing.builtUpArea} Sq.Ft` : 'N/A'),
    tag: dbListing.listingFor === 'SALE' ? 'For Sale' : 'For Rent',
    image: primaryImage,
    ownerVerified: true,
  };
};

export default function Home() {
  const [searchLocation, setSearchLocation] = useState('');
  const [searchType, setSearchType] = useState('sale');
  const [searchBudget, setSearchBudget] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const [featuredProperties, setFeaturedProperties] = useState<any[]>(staticHandpickedProperties);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const CITIES = [
      { name: 'mumbai', lat: 19.0760, lon: 72.8777, label: 'Mumbai', dbName: 'mumbai' },
      { name: 'bangalore', lat: 12.9716, lon: 77.5946, label: 'Bangalore', dbName: 'bangalore' },
      { name: 'delhi', lat: 28.6139, lon: 77.2090, label: 'Delhi NCR', dbName: 'delhi ncr' },
      { name: 'pune', lat: 18.5204, lon: 73.8567, label: 'Pune', dbName: 'pune' }
    ];

    async function loadFeatured(closestCityName?: string) {
      setIsLoadingFeatured(true);
      try {
        let success = false;
        
        // 1. Try nearest city first if available
        if (closestCityName) {
          const res = await fetch(`/api/listings?city=${closestCityName}&limit=4`);
          if (res.ok) {
            const data = await res.json();
            if (data.listings && data.listings.length >= 4) {
              setFeaturedProperties(data.listings.map(mapDbListingToProperty));
              success = true;
            }
          }
        }
        
        // 2. Fallback to general listings if no city was found or city had < 4 listings
        if (!success) {
          const res = await fetch('/api/listings?limit=4');
          if (res.ok) {
            const data = await res.json();
            if (data.listings && data.listings.length >= 4) {
              setFeaturedProperties(data.listings.map(mapDbListingToProperty));
            } else {
              setFeaturedProperties(staticHandpickedProperties);
            }
          } else {
            setFeaturedProperties(staticHandpickedProperties);
          }
        }
      } catch (err) {
        console.error('Failed to load listings:', err);
        setFeaturedProperties(staticHandpickedProperties);
      } finally {
        setIsLoadingFeatured(false);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          let closest = CITIES[0];
          let minDistance = Infinity;
          
          CITIES.forEach((city) => {
            const dist = Math.sqrt(
              Math.pow(latitude - city.lat, 2) + Math.pow(longitude - city.lon, 2)
            );
            if (dist < minDistance) {
              minDistance = dist;
              closest = city;
            }
          });
          
          // Default searchLocation state to the lowercase name of the closest city
          setSearchLocation(closest.name);
          
          // Load featured listings for closest city dbName
          loadFeatured(closest.dbName);
        },
        (error) => {
          console.warn('Geolocation failed:', error);
          loadFeatured();
        }
      );
    } else {
      loadFeatured();
    }
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Entrance animation for the hero elements
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out', duration: 0.8 }
        });

        tl.from('.hero-left-animate', {
          y: 35,
          autoAlpha: 0,
          stagger: 0.1,
          duration: 0.7
        })
        .from('.glass-pill-animate', {
          y: 15,
          autoAlpha: 0,
          stagger: 0.12,
          ease: 'back.out(1.5)',
          duration: 0.6
        }, '-=0.4')
        .from('.search-capsule-animate', {
          y: 30,
          autoAlpha: 0,
          ease: 'back.out(1.2)',
          duration: 0.85
        }, '-=0.3')
        .from('.bottom-trust-strip-animate', {
          y: 15,
          autoAlpha: 0,
          duration: 0.6
        }, '-=0.4');

        // Scroll-triggered animations for other sections
        gsap.from('.feature-card', {
          scrollTrigger: {
            trigger: '.why-choose-section',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 40,
          autoAlpha: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out'
        });

        gsap.from('.city-card-item', {
          scrollTrigger: {
            trigger: '.cities-section',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 30,
          autoAlpha: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: 'power2.out'
        });

        gsap.from('.cta-card', {
          scrollTrigger: {
            trigger: `.${styles.ctaSplitSection}`,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          y: 40,
          autoAlpha: 0,
          duration: 0.8,
          ease: 'power2.out'
        });

        // Scroll-triggered animations for Testimonials
        gsap.from('.testimonial-card-item', {
          scrollTrigger: {
            trigger: `.${styles.testimonialsSection}`,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 30,
          autoAlpha: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power2.out'
        });


        // Scroll-triggered animations for How It Works Steps
        gsap.from('.how-it-works-step', {
          scrollTrigger: {
            trigger: `.${styles.howItWorksSection}`,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 30,
          autoAlpha: 0,
          stagger: 0.1,
          duration: 0.8,
          ease: 'power2.out'
        });

        // Scroll-triggered animations for Featured Properties
        gsap.from('.property-card-item', {
          scrollTrigger: {
            trigger: `.${styles.featuredSection}`,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
          y: 40,
          autoAlpha: 0,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power2.out'
        });
      });

      // Fallback for reduced motion
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set('.hero-left-animate, .glass-pill-animate, .search-capsule-animate, .bottom-trust-strip-animate, .feature-card, .city-card-item, .cta-card, .how-it-works-step, .property-card-item, .testimonial-card-item', {
          autoAlpha: 1,
          y: 0,
          scale: 1
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation) params.set('city', searchLocation);
    if (searchType) params.set('type', searchType);
    if (searchBudget) params.set('budget', searchBudget);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        const existing = localStorage.getItem('listme_recent_searches');
        let searches = existing ? JSON.parse(existing) : [];
        if (!Array.isArray(searches)) searches = [];

        const parts = [];
        if (searchLocation) {
          parts.push(searchLocation.charAt(0).toUpperCase() + searchLocation.slice(1));
        }
        if (searchType) {
          parts.push(searchType === 'sale' ? 'For Sale' : searchType === 'rent' ? 'For Rent' : searchType);
        }
        if (searchBudget) {
          parts.push(`Budget: ₹${searchBudget}`);
        }
        const display = parts.join(' • ') || 'All Listings';

        const paramsStr = params.toString();
        searches = searches.filter((s: any) => s.params !== paramsStr);
        searches.unshift({ display, params: paramsStr, timestamp: Date.now() });
        searches = searches.slice(0, 5);
        localStorage.setItem('listme_recent_searches', JSON.stringify(searches));
      } catch (err) {
        console.error(err);
      }
    }

    window.location.href = `/listings?${params.toString()}`;
  };

  const activeCities = [
    { name: 'Mumbai', count: 1240, image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80' },
    { name: 'Bangalore', count: 980, image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=600&q=80' },
    { name: 'Delhi NCR', count: 1100, image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80' },
    { name: 'Pune', count: 640, image: 'https://images.unsplash.com/photo-1601999109332-542b18dbec57?auto=format&fit=crop&w=600&q=80' },
  ];

  return (
    <div ref={containerRef} className={styles.main}>
      <main style={{ flex: 1 }}>
        {/* Redesigned Premium Hero Section */}
        <div className={styles.heroCanvasWrapper}>
          <Header />

          {/* Redesigned Premium Hero Section */}
          <section className={styles.heroSection}>
            <div className={`${styles.heroGrid} container`}>
              
              {/* Left Column: Typography, badges, and ratings */}
              <div className={styles.heroLeft}>
                <h1 className={`${styles.title} hero-left-animate`}>
                  Find. Explore.<br />
                  Own Your Perfect<br />
                  <span className={styles.greenHighlight}>Property.</span>
                </h1>
                
                <p className={`${styles.subtitle} hero-left-animate`}>
                  Search properties in your location and connect directly with verified owners. No fees, no hidden charges.
                </p>

                {/* Two Horizontal Benefit Pills */}
                <div className={`${styles.benefitPillsContainer} hero-left-animate`}>
                  <div className={styles.benefitPill}>
                    <div className={styles.pillIconCircle}>
                      <Users size={16} />
                    </div>
                    <div className={styles.pillTextCol}>
                      <h4 className={styles.pillHeading}>No Fees for Buyers</h4>
                      <p className={styles.pillSub}>Search. Explore. It's Free.</p>
                    </div>
                  </div>

                  <div className={styles.benefitPill}>
                    <div className={styles.pillIconCircle}>
                      <HomeIcon size={16} />
                    </div>
                    <div className={styles.pillTextCol}>
                      <h4 className={styles.pillHeading}>No Fees for Owners</h4>
                      <p className={styles.pillSub}>List Your Property. It's Free.</p>
                    </div>
                  </div>
                </div>

                {/* Circular Glass Trust Card */}
                <div className={`${styles.circularTrustCard} hero-left-animate`}>
                  <div className={styles.trustThumbnails}>
                    <img src={avatars[0]} alt="User Avatar 1" className={styles.trustThumb} />
                    <img src={avatars[1]} alt="User Avatar 2" className={styles.trustThumb} />
                    <img src={avatars[2]} alt="User Avatar 3" className={styles.trustThumb} />
                  </div>
                  <div className={styles.trustRating}>
                    <span>4.9</span>
                    <Star size={18} fill="#F59E0B" stroke="#F59E0B" className={styles.trustStar} />
                  </div>
                  <span className={styles.trustUsers}>from 3,200+ users</span>
                </div>
              </div>

              {/* Right Column: Floating glassmorphic badges overlaid on background villa */}
              <div className={styles.heroRight}>
                <div className={`${styles.floatingBadge} ${styles.badgeVerified} glass-pill-animate`}>
                  <div className={styles.badgeGreenIcon}>
                    <CheckCircle size={14} />
                  </div>
                  <span>Verified Listings</span>
                </div>
                
                <div className={`${styles.floatingBadge} ${styles.badgeContact} glass-pill-animate`}>
                  <div className={styles.badgeGreenIcon}>
                    <MessageSquare size={14} />
                  </div>
                  <span>Direct Owner Contact</span>
                </div>

                <div className={`${styles.floatingBadge} ${styles.badgeProperties} glass-pill-animate`}>
                  <div className={styles.badgeGreenIcon}>
                    <Building size={14} />
                  </div>
                  <span>Wide range of Properties</span>
                </div>
              </div>

            </div>

            {/* Floating Search Bar Container */}
            <div className={`${styles.searchCapsuleContainer} search-capsule-animate`}>
              <form onSubmit={handleSearchSubmit} className={styles.searchCapsule}>
                
                {/* Location */}
                <div className={styles.capsuleField}>
                  <div className={styles.fieldHeader}>
                    <MapPin size={18} className={styles.fieldIcon} />
                    <label className={styles.capsuleLabel}>Location</label>
                  </div>
                  <select
                    className={styles.capsuleSelect}
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                  >
                    <option value="">Enter Your Location</option>
                    <option value="mumbai">Mumbai</option>
                    <option value="bangalore">Bangalore</option>
                    <option value="delhi">Delhi NCR</option>
                    <option value="pune">Pune</option>
                  </select>
                </div>

                <div className={styles.verticalDivider} />

                {/* Property Type */}
                <div className={styles.capsuleField}>
                  <div className={styles.fieldHeader}>
                    <Building2 size={18} className={styles.fieldIcon} />
                    <label className={styles.capsuleLabel}>Property Type</label>
                  </div>
                  <select
                    className={styles.capsuleSelect}
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="sale">Buy</option>
                    <option value="rent">Rent</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                <div className={styles.verticalDivider} />

                {/* Price Range */}
                <div className={styles.capsuleField}>
                  <div className={styles.fieldHeader}>
                    <CircleDollarSign size={18} className={styles.fieldIcon} />
                    <label className={styles.capsuleLabel}>Price Range</label>
                  </div>
                  <select
                    className={styles.capsuleSelect}
                    value={searchBudget}
                    onChange={(e) => setSearchBudget(e.target.value)}
                  >
                    <option value="">Any Budget</option>
                    <option value="under_50l">Under ₹50 Lakhs</option>
                    <option value="50l_1cr">₹50L - ₹1 Crore</option>
                    <option value="1cr_2cr">₹1Cr - ₹2 Crores</option>
                    <option value="2cr_plus">₹2 Crores+</option>
                  </select>
                </div>

                <button type="submit" className={styles.navySearchButton}>
                  <Search size={20} />
                  <span>Search Properties</span>
                </button>
              </form>

              {/* Trust indicators below search bar */}
              <div className={`${styles.bottomTrustStrip} bottom-trust-strip-animate`}>
                <div className={styles.stripCol}>
                  <div className={styles.stripIconCircle}>
                    <Tag size={14} />
                  </div>
                  <span className={styles.stripTitle}>100% Free for Buyers</span>
                </div>

                <div className={styles.stripDivider} />

                <div className={styles.stripCol}>
                  <div className={styles.stripIconCircle}>
                    <ArrowUp size={14} />
                  </div>
                  <span className={styles.stripTitle}>100% Free for Owners</span>
                </div>

                <div className={styles.stripDivider} />

                <div className={styles.stripCol}>
                  <div className={styles.stripIconCircle}>
                    <ShieldCheck size={14} />
                  </div>
                  <span className={styles.stripTitle}>Safe & Secure</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* --- Featured Properties Section --- */}
        <section className={`${styles.section} ${styles.featuredSection}`}>
          <div className="container">
            {/* Section Header */}
            <div className={styles.featuredHeader}>
              <div className={styles.featuredHeaderLeft}>
                <span className={styles.sectionEyebrow}>Featured Properties</span>
                <h2 className={styles.featuredTitle}>Handpicked Properties For You</h2>
              </div>
              <div className={styles.featuredHeaderRight}>
                <Button href="/listings" variant="outline" className={styles.viewAllBtn}>
                  View All Properties <span className={styles.arrow}>→</span>
                </Button>
              </div>
            </div>

            {/* Listings Grid */}
            <div className={styles.listingsGrid}>
              {featuredProperties.map((prop) => {
                const isRent = prop.tag === 'For Rent';
                const isFav = !!favorites[prop.id];
                
                return (
                  <div key={prop.id} className={`${styles.propertyCard} property-card-item`}>
                    {/* Image Wrap */}
                    <div className={styles.cardImageWrap}>
                      <img
                        src={prop.image}
                        alt={prop.title}
                        className={styles.propertyImage}
                      />
                      <span className={`${styles.tagOverlay} ${isRent ? styles.tagRent : styles.tagSale}`}>
                        {prop.tag}
                      </span>
                    </div>

                    {/* Content */}
                    <div className={styles.cardBody}>
                      <div className={styles.priceRow}>
                        <span className={styles.propertyPrice}>{prop.price}</span>
                      </div>
                      <h3 className={styles.propertyTitle}>{prop.title}</h3>
                      
                      <div className={styles.locationRow}>
                        <MapPin size={15} className={styles.locationIcon} />
                        <span className={styles.locationText}>{prop.location}</span>
                      </div>

                      <div className={styles.paramsDivider} />

                      <div className={styles.paramsRow}>
                        <span className={styles.paramItem}>{prop.beds} Beds</span>
                        <span className={styles.paramSep}>|</span>
                        <span className={styles.paramItem}>{prop.baths} Baths</span>
                        <span className={styles.paramSep}>|</span>
                        <span className={styles.paramItem}>{prop.area}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className={styles.cardFooter}>
                      <div className={styles.verifiedBadge}>
                        <CheckCircle size={15} className={styles.verifiedIcon} />
                        <span>Owner Verified</span>
                      </div>
                      <button 
                        className={`${styles.heartButton} ${isFav ? styles.heartActive : ''}`} 
                        aria-label="Add to shortlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(prop.id);
                        }}
                      >
                        <Heart size={18} fill={isFav ? "currentColor" : "none"} className={styles.heartIcon} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* --- How It Works Section --- */}
        <section className={`${styles.section} ${styles.howItWorksSection}`}>
          <div className={`${styles.howItWorksContainer} container`}>
            {/* Left Column: Heading and Info */}
            <div className={styles.howItWorksLeft}>
              <span className={styles.sectionEyebrow}>How It Works</span>
              <h2 className={styles.howItWorksTitle}>Simple Steps. Smart Moves.</h2>
              <p className={styles.howItWorksSubtitle}>
                ListMe makes finding, visiting, and buying properties extremely easy, direct, and completely broker-free.
              </p>
            </div>

            {/* Right Column: 2x2 Bento Grid */}
            <div className={styles.howItWorksRight}>
              <div className={styles.bentoGrid}>
                
                {/* Step 1 */}
                <div className={`${styles.bentoCard} how-it-works-step`}>
                  <div className={styles.bentoCardHeader}>
                    <span className={styles.stepNumber}>01</span>
                    <div className={styles.stepIconWrap}>
                      <Search size={20} />
                    </div>
                  </div>
                  <h3 className={styles.bentoCardTitle}>Search Properties</h3>
                  <p className={styles.bentoCardText}>
                    Explore listings in your preferred location with advanced filters.
                  </p>
                </div>

                {/* Step 2 */}
                <div className={`${styles.bentoCard} how-it-works-step`}>
                  <div className={styles.bentoCardHeader}>
                    <span className={styles.stepNumber}>02</span>
                    <div className={styles.stepIconWrap}>
                      <MessageSquare size={20} />
                    </div>
                  </div>
                  <h3 className={styles.bentoCardTitle}>Connect Directly</h3>
                  <p className={styles.bentoCardText}>
                    Get in touch with property owners directly. No middlemen.
                  </p>
                </div>

                {/* Step 3 */}
                <div className={`${styles.bentoCard} how-it-works-step`}>
                  <div className={styles.bentoCardHeader}>
                    <span className={styles.stepNumber}>03</span>
                    <div className={styles.stepIconWrap}>
                      <Calendar size={20} />
                    </div>
                  </div>
                  <h3 className={styles.bentoCardTitle}>Visit & Decide</h3>
                  <p className={styles.bentoCardText}>
                    Schedule a visit, explore the property, and make the right decision.
                  </p>
                </div>

                {/* Step 4 */}
                <div className={`${styles.bentoCard} how-it-works-step`}>
                  <div className={styles.bentoCardHeader}>
                    <span className={styles.stepNumber}>04</span>
                    <div className={styles.stepIconWrap}>
                      <HomeIcon size={20} />
                    </div>
                  </div>
                  <h3 className={styles.bentoCardTitle}>Own or Sell Freely</h3>
                  <p className={styles.bentoCardText}>
                    Buy your dream property or list yours for free on ListMe.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Features / Why Choose Us */}
        <section className={styles.whyChooseSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2 className={`${styles.sectionTitle} ${styles.whiteText}`}>Why ListMe is different</h2>
              <p className={`${styles.sectionSubtitle} ${styles.whiteTextSecondary}`}>
                We are not brokers. We are a direct connection platform.
              </p>
            </div>

            <div className={styles.grid}>
              <Card className={`${styles.whyChooseCard} feature-card`} hoverable padding="lg">
                <div style={{ color: 'var(--color-secondary)', marginBottom: '1.25rem' }}>
                  <Building size={32} />
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontWeight: 700 }}>Direct Owner Listings</h3>
                <p>Skip the middleman. All properties are listed directly by owners, eliminating brokerage fees completely.</p>
              </Card>

              <Card className={`${styles.whyChooseCard} feature-card`} hoverable padding="lg">
                <div style={{ color: 'var(--color-secondary)', marginBottom: '1.25rem' }}>
                  <ShieldCheck size={32} />
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontWeight: 700 }}>Verified Phone Numbers</h3>
                <p>Every account is verified via phone OTP. No fake listings, no phantom owners, no spam brokers.</p>
              </Card>

              <Card className={`${styles.whyChooseCard} feature-card`} hoverable padding="lg">
                <div style={{ color: 'var(--color-secondary)', marginBottom: '1.25rem' }}>
                  <Heart size={32} />
                </div>
                <h3 style={{ marginBottom: '0.75rem', fontWeight: 700 }}>Privacy Protection</h3>
                <p>We never display your phone number publicly. Seekers express interest, and the connection remains secure.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={`${styles.section} ${styles.statsSection}`}>
          <div className="container">
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statVal}>100%</div>
                <div className={styles.statLabel}>Free Platform</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statVal}>₹0</div>
                <div className={styles.statLabel}>Brokerage Charged</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statVal}>50k+</div>
                <div className={styles.statLabel}>Verified Listings</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statVal}>2%</div>
                <div className={styles.statLabel}>Sale Commission</div>
              </div>
            </div>
          </div>
        </section>

        {/* Browse Cities */}
        <section className={`${styles.section} container cities-section`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Explore popular cities</h2>
            <p className={styles.sectionSubtitle}>
              Find houses, plots, flats, and commercial properties in India's top markets.
            </p>
          </div>

          <div className={styles.grid}>
            {activeCities.map((city) => (
              <div
                key={city.name}
                className={`${styles.cityCard} city-card-item`}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  window.location.href = `/listings?city=${city.name.toLowerCase()}`;
                }}
              >
                <img
                  src={city.image}
                  alt={`${city.name} city skyline`}
                  className={styles.cityCardImage}
                />
                <div className={styles.cityCardContent}>
                  <div className={styles.cityName}>{city.name}</div>
                  <div className={styles.cityCount}>{city.count} listings</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Loved by Buyers & Owners Testimonials */}
        <section className={`${styles.section} ${styles.testimonialsSection}`}>
          <div className="container">
            {/* Header: Left is title/labels, Right is navigation buttons */}
            <div className={styles.testimonialsHeader}>
              <div className={styles.testimonialsHeaderLeft}>
                <span className={styles.testimonialsLabel}>TRUSTED BY THOUSANDS</span>
                <h2 className={styles.testimonialsTitle}>
                  Loved by Buyers & Owners <br />Across the Country
                </h2>
              </div>
              <div className={styles.testimonialsNav}>
                <button className={styles.navButton} aria-label="Previous testimonial">
                  &larr;
                </button>
                <button className={styles.navButton} aria-label="Next testimonial">
                  &rarr;
                </button>
              </div>
            </div>

            {/* Testimonial Cards Row */}
            <div className={styles.testimonialsRow}>
              {/* Testimonial 1 */}
              <div className={`${styles.testimonialCard} testimonial-card-item`}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.reviewText}>
                  "ListMe made it so easy to find my dream home. The direct contact with owners saved me time and money!"
                </p>
                <div className={styles.userProfile}>
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80"
                    alt="Rohan Mehta"
                    className={styles.userAvatar}
                  />
                  <div>
                    <h4 className={styles.userName}>Rohan Mehta</h4>
                    <span className={styles.userLocation}>Bangalore</span>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className={`${styles.testimonialCard} testimonial-card-item`}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.reviewText}>
                  "I listed my property in just a few minutes and got great responses. Totally free and super effective!"
                </p>
                <div className={styles.userProfile}>
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80"
                    alt="Neha Sharma"
                    className={styles.userAvatar}
                  />
                  <div>
                    <h4 className={styles.userName}>Neha Sharma</h4>
                    <span className={styles.userLocation}>Hyderabad</span>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className={`${styles.testimonialCard} testimonial-card-item`}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.reviewText}>
                  "As an owner, listing on ListMe was a breeze. I avoided paying a huge brokerage fee and got direct inquiries within hours!"
                </p>
                <div className={styles.userProfile}>
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80"
                    alt="Vikram Malhotra"
                    className={styles.userAvatar}
                  />
                  <div>
                    <h4 className={styles.userName}>Vikram Malhotra</h4>
                    <span className={styles.userLocation}>Mumbai</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* List Your Property Split CTA Banner */}
        <section className={styles.ctaSplitSection}>
          <div className={`${styles.ctaSplitContainer} container cta-card`}>
            {/* Left side info */}
            <div className={styles.ctaSplitLeft}>
              <span className={styles.ctaLabel}>POST YOUR PROPERTY</span>
              <h2 className={styles.ctaSplitTitle}>
                Post Your Property. <br />It's 100% Free.
              </h2>
              <p className={styles.ctaSplitSubtitle}>
                Reach thousands of genuine buyers and tenants. No fees, no commissions. Just real connections.
              </p>
              <Button href="/post-property" variant="secondary" size="lg" className={styles.ctaButton}>
                Post Property (Free) &rarr;
              </Button>
            </div>

            {/* Right side graphics & overlapping checklist cards */}
            <div className={styles.ctaSplitRight}>
              <div className={styles.villaGraphicContainer}>
                <img
                  src="/images/hero_bg.jpg"
                  alt="Modern house at night"
                  className={styles.villaGraphic}
                />
                <div className={styles.villaOverlay} />
              </div>

              {/* Overlapping Checklist Cards */}
              <div className={`${styles.checklistCard} ${styles.checklistCard1}`}>
                <div className={styles.checkIcon}>✓</div>
                <div>
                  <h4 className={styles.checkTitle}>Unlimited Listings</h4>
                  <p className={styles.checkDesc}>List as many properties as you want.</p>
                </div>
              </div>

              <div className={`${styles.checklistCard} ${styles.checklistCard2}`}>
                <div className={styles.checkIcon}>✓</div>
                <div>
                  <h4 className={styles.checkTitle}>Direct Owner Contact</h4>
                  <p className={styles.checkDesc}>Connect directly with interested buyers or tenants.</p>
                </div>
              </div>

              <div className={`${styles.checklistCard} ${styles.checklistCard3}`}>
                <div className={styles.checkIcon}>✓</div>
                <div>
                  <h4 className={styles.checkTitle}>Verified & Trusted</h4>
                  <p className={styles.checkDesc}>Build trust with verified listings and real connections.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
