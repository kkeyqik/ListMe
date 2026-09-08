'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Button, useToast } from '@/components/ui';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  ArrowRight, 
  TrendingUp, 
  Send, 
  User, 
  Share2,
  Bookmark
} from 'lucide-react';
import styles from './blog.module.css';

interface Article {
  id: string;
  slug: string;
  category: 'Market Trends' | 'Seller Guides' | 'Buyer Guides' | 'Legal' | 'Investment';
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  author: {
    name: string;
    role: string;
    initials: string;
  };
  imageUrl: string;
  featured?: boolean;
}

const ARTICLES_DATA: Article[] = [
  {
    id: 'art-hero',
    slug: 'zero-brokerage-revolution-india-2026',
    category: 'Market Trends',
    title: 'The Zero-Brokerage Revolution: How Direct Peer-to-Peer Platforms Save Billions',
    excerpt: 'Traditional 2% brokerage commissions drain over ₹40,000 crores annually from Indian homeowners and buyers. Discover how mobile OTP verification, transparent listing portals, and direct owner connects are fundamentally restructuring Indian real estate in 2026.',
    date: 'August 18, 2026',
    readTime: '6 min read',
    author: {
      name: 'Aditya Verma',
      role: 'Principal Real Estate Analyst',
      initials: 'AV',
    },
    imageUrl: '/images/luxury_villa_hero.png',
    featured: true,
  },
  {
    id: 'art-1',
    slug: 'tier-1-vs-tier-2-rental-yields-2026',
    category: 'Investment',
    title: 'Tier-1 vs Tier-2 Rental Yields: Where Are Investors Seeing Maximum ROI?',
    excerpt: 'While metro hubs like Bengaluru and Mumbai offer capital appreciation, emerging cities like Pune, Ahmedabad, and Kochi are offering gross rental yields upwards of 5.8%. Here is our comprehensive comparative breakdown.',
    date: 'August 12, 2026',
    readTime: '5 min read',
    author: {
      name: 'Pooja Iyer',
      role: 'Investment Strategist',
      initials: 'PI',
    },
    imageUrl: '/images/luxury_villa_hero.png',
  },
  {
    id: 'art-2',
    slug: 'how-to-correctly-price-your-home-for-sale',
    category: 'Seller Guides',
    title: 'How to Correctly Price Your Property for Sale Without Leaving Money on the Table',
    excerpt: 'Overpricing leads to stale listings that stay on the market for 180+ days, while underpricing forfeits lakhs. Learn how to conduct comparative market analysis using real registry rates and square-footage metrics.',
    date: 'July 29, 2026',
    readTime: '4 min read',
    author: {
      name: 'Vikram Malhotra',
      role: 'Property Valuation Consultant',
      initials: 'VM',
    },
    imageUrl: '/images/luxury_villa_hero.png',
  },
  {
    id: 'art-3',
    slug: 'navigating-rera-compliance-buyer-checklist',
    category: 'Legal',
    title: 'Navigating RERA: The 7 Clauses First-Time Homebuyers Must Review',
    excerpt: 'RERA was designed to protect homebuyers from delayed possession and carpet area manipulations. Here are the 7 non-negotiable clauses you must verify before executing an allotment letter or builder-buyer agreement.',
    date: 'July 15, 2026',
    readTime: '7 min read',
    author: {
      name: 'Kavita Menon',
      role: 'Property Law Associate',
      initials: 'KM',
    },
    imageUrl: '/images/luxury_villa_hero.png',
  },
  {
    id: 'art-4',
    slug: '5-staging-secrets-rent-home-faster',
    category: 'Seller Guides',
    title: '5 Inexpensive Staging Secrets That Rent Out Properties in Under 7 Days',
    excerpt: 'First impressions are formed within 8 seconds of entering the front door. Simple hacks like warm lighting fixtures, fresh neutral paint coats, and uncluttered kitchen countertops can dramatically elevate perceived property value.',
    date: 'July 04, 2026',
    readTime: '4 min read',
    author: {
      name: 'Rohan Sen',
      role: 'Interior Consultant',
      initials: 'RS',
    },
    imageUrl: '/images/luxury_villa_hero.png',
  },
  {
    id: 'art-5',
    slug: 'commercial-vs-residential-reit-investing',
    category: 'Investment',
    title: 'Grade-A Commercial vs Residential Flats: Which Asset Delivers Superior Stability?',
    excerpt: 'Comparing 9-year corporate leases with 11-month residential tenancies. Understand vacancy risks, maintenance obligations, and yield predictability for high-net-worth individual portfolios.',
    date: 'June 22, 2026',
    readTime: '6 min read',
    author: {
      name: 'Aditya Verma',
      role: 'Principal Real Estate Analyst',
      initials: 'AV',
    },
    imageUrl: '/images/luxury_villa_hero.png',
  },
  {
    id: 'art-6',
    slug: 'essential-documents-verified-owner-badge',
    category: 'Legal',
    title: 'Why Verified Owner Badges Are Driving 300% More Inquiries in 2026',
    excerpt: 'Seekers are exhausted by phantom listings and duplicate broker ads. Find out why submitting proof of ownership creates an instant trust moat that accelerates genuine buyer discussions.',
    date: 'June 10, 2026',
    readTime: '3 min read',
    author: {
      name: 'Kavita Menon',
      role: 'Property Law Associate',
      initials: 'KM',
    },
    imageUrl: '/images/luxury_villa_hero.png',
  },
];

const CATEGORIES = [
  'All',
  'Market Trends',
  'Investment',
  'Seller Guides',
  'Legal',
] as const;

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [emailInput, setEmailInput] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const { showToast } = useToast();

  const featuredArticle = useMemo(() => {
    return ARTICLES_DATA.find((a) => a.featured) || ARTICLES_DATA[0];
  }, []);

  const filteredArticles = useMemo(() => {
    return ARTICLES_DATA.filter((item) => {
      if (item.featured) return false; // Rendered in featured slot
      if (selectedCategory === 'All') return true;
      return item.category === selectedCategory;
    });
  }, [selectedCategory]);

  const handleBlogSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Invalid Email', 'Please provide a valid email address.', 'warning');
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Subscribed', 'Thank you for subscribing to ListMe market insights!', 'success');
        setEmailInput('');
      } else {
        showToast('Error', data.message || 'Unable to subscribe', 'error');
      }
    } catch (err) {
      showToast('Error', 'Subscription failed. Please try again.', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <Header />

      <main className={styles.mainContent}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className="container">
            <span className={styles.heroEyebrow}>
              <BookOpen size={15} /> Market Insights & Research
            </span>
            <h1 className={styles.heroTitle}>ListMe Property Insights</h1>
            <p className={styles.heroSubtitle}>
              Deep data analysis, regulatory updates, pricing benchmarks, and owner playbooks across India's premier real estate markets.
            </p>
          </div>
        </section>

        <div className="container">
          {/* Category Filter Pills */}
          <div className={styles.categoryBar}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`${styles.categoryPill} ${
                  selectedCategory === cat ? styles.categoryPillActive : ''
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Featured Hero Article */}
          {selectedCategory === 'All' && featuredArticle && (
            <div className={styles.featuredCard}>
              <div className={styles.featuredImageWrapper}>
                <img
                  src={featuredArticle.imageUrl}
                  alt={featuredArticle.title}
                  className={styles.featuredImage}
                />
                <span className={styles.featuredBadge}>Featured Research</span>
              </div>

              <div className={styles.featuredContent}>
                <div className={styles.articleMeta}>
                  <span className={styles.articleCategory}>{featuredArticle.category}</span>
                  <span>•</span>
                  <span><Calendar size={13} style={{ display: 'inline', marginRight: 3 }} />{featuredArticle.date}</span>
                  <span>•</span>
                  <span><Clock size={13} style={{ display: 'inline', marginRight: 3 }} />{featuredArticle.readTime}</span>
                </div>

                <h2 className={styles.featuredTitle}>{featuredArticle.title}</h2>
                <p className={styles.featuredExcerpt}>{featuredArticle.excerpt}</p>

                <div className={styles.authorRow}>
                  <div className={styles.authorAvatar}>
                    {featuredArticle.author.initials}
                  </div>
                  <div>
                    <div className={styles.authorName}>{featuredArticle.author.name}</div>
                    <div className={styles.authorRole}>{featuredArticle.author.role}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Regular Articles Grid */}
          <div className={styles.articlesGrid}>
            {filteredArticles.map((art) => (
              <article key={art.id} className={styles.articleCard}>
                <div className={styles.cardImageWrapper}>
                  <img
                    src={art.imageUrl}
                    alt={art.title}
                    className={styles.cardImage}
                  />
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.articleMeta}>
                    <span className={styles.articleCategory}>{art.category}</span>
                    <span>•</span>
                    <span>{art.readTime}</span>
                  </div>

                  <h3 className={styles.cardTitle}>{art.title}</h3>
                  <p className={styles.cardExcerpt}>{art.excerpt}</p>

                  <div className={styles.cardFooter}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} />
                      <span>{art.date}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {art.author.name}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Newsletter Subscribe Strip */}
          <div className={styles.newsletterBox}>
            <h3>Get Monthly Real Estate Insights in Your Inbox</h3>
            <p>
              Join 45,000+ property owners and serious buyers who rely on our monthly research briefings. Zero spam, unsubscribe anytime.
            </p>

            <form onSubmit={handleBlogSubscribe} className={styles.blogSubscribeForm}>
              <input
                type="email"
                placeholder="Enter your work or personal email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className={styles.blogSubscribeInput}
                required
              />
              <Button
                type="submit"
                variant="secondary"
                size="md"
                loading={subscribing}
                rightIcon={<Send size={15} />}
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
