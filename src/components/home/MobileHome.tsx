'use client';

import React from 'react';
import Image from 'next/image';
import { Search, Heart, Calculator, Percent, TrendingUp, Home, MapPin, Building, ChevronRight, Key, PlaySquare, Lightbulb, Landmark, Plus } from 'lucide-react';
import styles from './MobileHome.module.css';
import Link from 'next/link';

export const MobileHome: React.FC = () => {
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
        <div className={styles.heroOverlay} />
      </section>

      <div className={styles.stickySearchContainer}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={20} />
          <input 
            type="text" 
            placeholder='Search "3 BHK flats for sale in Noida"'
            className={styles.searchInput}
            readOnly 
          />
        </div>
      </div>

      {/* 2. Get Started Section */}
      <section className={`${styles.section} ${styles.getStartedSection}`}>
        <h2 className={styles.getStartedTitle}>Get started with</h2>
        <p className={styles.getStartedSubtitle}>Explore real estate options in top cities</p>
        
        <div className={styles.navCardsRow}>
          <div className={styles.navCard}>
            <div className={styles.iconCircle}>
              <Home size={22} color="#3182ce" />
            </div>
            <span>Buy</span>
          </div>
          <div className={styles.navCard}>
            <div className={styles.iconCircle}>
              <Key size={22} color="#3182ce" />
            </div>
            <span>Rent</span>
          </div>
          <div className={styles.navCard}>
            <div className={styles.iconCircle}>
              <PlaySquare size={22} color="#3182ce" />
            </div>
            <span>New Projects</span>
          </div>
          <div className={styles.navCard}>
            <div className={styles.iconCircle}>
              <Lightbulb size={22} color="#3182ce" />
            </div>
            <span>Insights</span>
          </div>
          <div className={styles.navCard}>
            <div className={styles.iconCircle}>
              <Building size={22} color="#3182ce" />
            </div>
            <span>Commercial</span>
          </div>
        </div>
      </section>
      
      <div className={styles.recentSearchRowWrapper}>
        <div className={styles.recentSearchRow}>
          <button className={styles.recentSearchPill}>Buy in Gurgaon</button>
          <button className={styles.recentSearchPill}>Rent in Delhi</button>
          <button className={styles.recentSearchPill}>Commercial in Noida</button>
        </div>
      </div>

      {/* 2. Recommended Properties */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recommended Properties</h2>
        <p className={styles.sectionSubtitle}>Handpicked based on your preferences</p>
        
        <div className={styles.carousel}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.propertyCard}>
              <div className={styles.propertyImageWrapper}>
                <Image 
                  src={`https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=400&q=80`}
                  alt="Property" 
                  layout="fill" 
                  className={styles.propertyImage} 
                />
                <button className={styles.heartIcon}>
                  <Heart size={16} />
                </button>
                <div className={styles.priceTag}>₹2.85 Cr</div>
              </div>
              <div className={styles.propertyInfo}>
                <h3 className={styles.propertyTitle}>3 BHK Flat in Whitefield</h3>
                <span className={styles.propertyMeta}>Whitefield, Bangalore</span>
                <div className={styles.propertyFooter}>Ready to Move • 1500 sqft</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Property Categories */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Apartments, Villas and more</h2>
        <div className={styles.tallCardCarousel}>
          <div className={styles.tallCard} style={{ backgroundColor: '#f0f9ff' }}>
            <h3 className={styles.tallCardTitle}>Residential<br/>Apartment</h3>
            <span className={styles.tallCardSub}>12k+ Properties</span>
            <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80" alt="Apt" className={styles.tallCardImg} />
          </div>
          <div className={styles.tallCard} style={{ backgroundColor: '#fff5f5' }}>
            <h3 className={styles.tallCardTitle}>Independent<br/>House/Villa</h3>
            <span className={styles.tallCardSub}>8k+ Properties</span>
            <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=200&q=80" alt="Villa" className={styles.tallCardImg} />
          </div>
          <div className={styles.tallCard} style={{ backgroundColor: '#f0fdf4' }}>
            <h3 className={styles.tallCardTitle}>Builder<br/>Floor</h3>
            <span className={styles.tallCardSub}>5k+ Properties</span>
            <img src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=200&q=80" alt="Floor" className={styles.tallCardImg} />
          </div>
        </div>
      </section>

      {/* 4. Filter Pills */}
      <section className={styles.filterPillsSection}>
        <div className={styles.filterPillsRow}>
          <div className={styles.filterPillCard}>
            <Home className={styles.filterPillIcon} size={20} />
            <h4 className={styles.filterPillTitle}>BHK choice in mind?</h4>
            <span className={styles.filterPillSub}>1 BHK, 2 BHK, 3 BHK</span>
          </div>
          <div className={styles.filterPillCard}>
            <MapPin className={styles.filterPillIcon} size={20} />
            <h4 className={styles.filterPillTitle}>Properties posted by</h4>
            <span className={styles.filterPillSub}>Owner, Builder, Dealer</span>
          </div>
        </div>
      </section>

      {/* 5. Recommended Projects */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recommended Projects</h2>
        <div className={styles.carousel}>
          {[1, 2].map((i) => (
            <div key={i} className={styles.projectCard}>
              <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80" alt="Project" className={styles.projectImage} />
              <div className={styles.reraBadge}>RERA</div>
              <div className={styles.possessionTag}>Possession in 1 Year</div>
              <div className={styles.projectInfo}>
                <h3 className={styles.projectTitle}>Godrej Splendour</h3>
                <p className={styles.projectMeta}>Whitefield, Bangalore</p>
                <span className={styles.projectPrice}>₹ 1.2 Cr onwards</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Localities */}
      <section className={styles.section} style={{ backgroundColor: '#f8fafc' }}>
        <h2 className={styles.sectionTitle}>Localities you may like</h2>
        <div className={styles.carousel}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.localityCard}>
              <div className={styles.localityHeader}>
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Locality" className={styles.localityThumb} />
                <div>
                  <h4 className={styles.localityName}>Koramangala</h4>
                  <span className={styles.localityRating}>4.2 ★</span>
                </div>
              </div>
              <div className={styles.localityStats}>
                <span className={styles.localityPrice}>₹ 12,500 / sqft</span>
                <span className={styles.localityGrowth}><TrendingUp size={12}/> +8.5% YoY</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. App Banner */}
      <div className={styles.appBanner}>
        <h3 className={styles.bannerTitle}>Download our app and search 1.5x faster</h3>
        <ul className={styles.bannerList}>
          <li>Personalized alerts</li>
          <li>Direct chat with owners</li>
        </ul>
        <button className={styles.bannerBtn}>Download App</button>
        <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=200&q=80" alt="Phone" className={styles.bannerImg} style={{ clipPath: 'circle(50% at 50% 50%)' }} />
      </div>

      {/* 8. Tools */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Use popular tools</h2>
        <p className={styles.sectionSubtitle}>Make informed decisions</p>
        <div className={styles.toolsRow}>
          <div className={styles.toolCard}>
            <div className={styles.toolIconWrapper}>
              <Calculator size={24} />
            </div>
            <span className={styles.toolTitle}>Budget Calculator</span>
          </div>
          <div className={styles.toolCard}>
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
