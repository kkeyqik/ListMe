'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Button } from '@/components/ui';
import { Search, ChevronDown, HelpCircle, ArrowRight, MessageSquare, ShieldCheck, Check } from 'lucide-react';
import styles from './faq.module.css';

interface FAQItem {
  id: string;
  category: 'Owners' | 'Buyers' | 'Verification' | 'Pricing' | 'Legal';
  question: string;
  answer: string;
}

const FAQS_DATA: FAQItem[] = [
  // Owners
  {
    id: 'own-1',
    category: 'Owners',
    question: 'How do I list my property on ListMe for free?',
    answer: 'Listing your property on ListMe takes under 5 minutes. Click "Post Property" in the top navigation, enter your property details (location, bedrooms, area, pricing), upload photos or documents, and submit. Your listing goes live immediately or after quick verification with zero upfront charges.',
  },
  {
    id: 'own-2',
    category: 'Owners',
    question: 'How does ListMe protect property owners from spam calls and brokers?',
    answer: 'ListMe protects your privacy by keeping your phone number masked by default. Interested seekers must have a registered account and verify their mobile number with a one-time OTP before expressing interest. You receive instant lead notifications in your dashboard and can review seeker details before initiating contact.',
  },
  {
    id: 'own-3',
    category: 'Owners',
    question: 'Can I edit or deactivate my listing once it is published?',
    answer: 'Yes, full control is available via your Owner Dashboard. You can update the asking price, add new photos, modify possession dates, or mark the property as sold or rented at any time, which automatically removes it from public search results.',
  },
  {
    id: 'own-4',
    category: 'Owners',
    question: 'How many properties can I list on ListMe?',
    answer: 'There is no limit! Individual property owners and builders can post multiple residential apartments, independent villas, commercial spaces, and plots without incurring any listing subscription fees.',
  },

  // Buyers
  {
    id: 'buy-1',
    category: 'Buyers',
    question: 'How do I contact the property owner directly without brokers?',
    answer: 'Browse listings using our smart search filters (city, locality, price, BHK). When you find a property you like, click the "Interested" or "Contact Owner" button. Once your mobile number is verified via OTP, you will instantly receive direct owner contact details and can schedule a site visit.',
  },
  {
    id: 'buy-2',
    category: 'Buyers',
    question: 'Are properties on ListMe verified against fake listings?',
    answer: 'Yes. Every listing posted on ListMe goes through our automated verification engine and manual document screening. Properties with the "Verified Owner" badge have submitted utility bills or ownership title proofs confirming legitimate ownership.',
  },
  {
    id: 'buy-3',
    category: 'Buyers',
    question: 'Do buyers or tenants have to pay any brokerage fees to ListMe?',
    answer: 'No. Searching, shortlisting, contacting owners, and scheduling visits on ListMe are 100% free for buyers and tenants. You never pay brokerage fees to ListMe or deal with middlemen markups.',
  },

  // Verification
  {
    id: 'ver-1',
    category: 'Verification',
    question: 'What is the "Verified Owner" badge and how is it earned?',
    answer: 'The Verified Owner badge indicates that our compliance team has verified ownership documents (such as latest electricity bills, property tax receipts, or title deeds) against government land registry records. This assures buyers that they are dealing directly with the legal owner.',
  },
  {
    id: 'ver-2',
    category: 'Verification',
    question: 'How does mobile OTP verification work?',
    answer: 'To ensure a genuine community, both owners and prospective seekers verify their mobile number through an automated SMS OTP. This prevents bogus inquiries, bot spam, and unsolicited telemarketing calls.',
  },
  {
    id: 'ver-3',
    category: 'Verification',
    question: 'Are RERA numbers verified on ListMe?',
    answer: 'Yes, for new developments and builder projects, RERA registration numbers are cross-referenced against respective state RERA authority portals (such as MahaRERA, K-RERA, and UP-RERA) before featured badges are granted.',
  },

  // Pricing
  {
    id: 'pri-1',
    category: 'Pricing',
    question: 'Is listing really 100% free with no hidden charges?',
    answer: 'Yes! Creating an account, posting properties, uploading high-resolution photos, and managing inquiries through our dashboard are completely free with zero upfront or recurring subscription fees.',
  },
  {
    id: 'pri-2',
    category: 'Pricing',
    question: 'How does ListMe make money if listing is free?',
    answer: 'ListMe operates on a success-aligned direct model: listing is free, but if our platform directly matches you with a buyer and successfully closes a sale, we charge a modest 2% success commission on the final deal closing price. For rental listings, our core service is completely free.',
  },
  {
    id: 'pri-3',
    category: 'Pricing',
    question: 'What happens when a deal is closed?',
    answer: 'Owners can mark their inquiry as "Deal Closed (Sold/Rented)" in their dashboard, enter the finalized closing price for audit records, and deactivate the listing with one click.',
  },

  // Legal
  {
    id: 'leg-1',
    category: 'Legal',
    question: 'Does ListMe assist with rental agreements and sale deeds?',
    answer: 'While ListMe provides direct communication between parties and educational guides on documentation, legal agreements (such as registered sale deeds or e-stamped leave and license agreements) are executed between the owner and seeker or through certified legal professionals.',
  },
  {
    id: 'leg-2',
    category: 'Legal',
    question: 'What documents should a buyer verify before paying an advance token?',
    answer: 'We strongly advise verifying the Mother Deed, Title Encumbrance Certificate (EC for the last 15-30 years), Approved Building Sanction Plan, Latest Property Tax Paid Receipts, and Khata Certificate before releasing token money.',
  },
  {
    id: 'leg-3',
    category: 'Legal',
    question: 'How is user data and private contact information protected?',
    answer: 'All data is encrypted in transit and at rest adhering to strict data privacy principles. Your phone number and email are never sold to third-party telemarketers or external broker databases.',
  },
];

const CATEGORIES = ['All', 'Owners', 'Buyers', 'Verification', 'Pricing', 'Legal'] as const;

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'own-1': true, // Open the first item by default
  });

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFaqs = useMemo(() => {
    return FAQS_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className={styles.pageWrapper}>
      <Header />

      <main className={styles.mainContent}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className="container">
            <span className={styles.heroEyebrow}>
              <HelpCircle size={15} /> Help & Knowledge Center
            </span>
            <h1 className={styles.heroTitle}>Frequently Asked Questions</h1>
            <p className={styles.heroSubtitle}>
              Everything you need to know about listing properties, zero brokerage, seeker verification, and platform security on ListMe.
            </p>

            {/* Search Input */}
            <div className={styles.searchWrapper}>
              <Search size={20} className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g., verification, brokerage, phone number, documents)..."
                className={styles.searchInput}
                aria-label="Search FAQs"
              />
            </div>
          </div>
        </section>

        <div className="container" style={{ paddingBottom: '3rem' }}>
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

          {/* FAQ Accordion List */}
          <div className={styles.faqContainer}>
            {filteredFaqs.length === 0 ? (
              <div className={styles.emptyState}>
                <HelpCircle size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
                <h3>No matching questions found</h3>
                <p>Try refining your search terms or browse another category.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  style={{ marginTop: '1rem' }}
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = !!openIds[faq.id];
                return (
                  <div
                    key={faq.id}
                    className={`${styles.faqCard} ${isOpen ? styles.faqCardActive : ''}`}
                  >
                    <button
                      className={styles.faqQuestionButton}
                      onClick={() => toggleAccordion(faq.id)}
                      aria-expanded={isOpen}
                    >
                      <div className={styles.questionLeft}>
                        <span className={styles.categoryTag}>{faq.category}</span>
                        <span className={styles.questionText}>{faq.question}</span>
                      </div>
                      <div className={styles.toggleIcon}>
                        <ChevronDown
                          size={18}
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className={styles.faqAnswer}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Help / Contact CTA */}
          <div className={styles.ctaBox}>
            <div className={styles.ctaText}>
              <h3>Still have questions? We're here to help.</h3>
              <p>Our real estate specialists and customer success team are available 7 days a week.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link href="/contact">
                <Button variant="primary" size="md">
                  Contact Support
                </Button>
              </Link>
              <Link href="/post-property">
                <Button variant="secondary" size="md" rightIcon={<ArrowRight size={16} />}>
                  Post Free Property
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
