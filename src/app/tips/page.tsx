'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Button } from '@/components/ui';
import { 
  CheckSquare, 
  Lightbulb, 
  ShieldCheck, 
  Home, 
  Key, 
  FileText, 
  Check, 
  DollarSign, 
  ArrowRight, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import styles from './tips.module.css';

type GuidePersona = 'buyers' | 'sellers' | 'tenants';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
}

interface TipItem {
  id: string;
  badge: 'Essential' | 'Legal' | 'Financial' | 'Staging';
  title: string;
  description: string;
  icon: 'Shield' | 'Dollar' | 'File' | 'Sparkle';
}

const PERSONA_CONFIG: Record<
  GuidePersona, 
  { 
    title: string; 
    icon: any; 
    checklistTitle: string; 
    checklistSubtitle: string;
    items: ChecklistItem[]; 
    tips: TipItem[] 
  }
> = {
  buyers: {
    title: 'Home Buyers Guide',
    icon: Home,
    checklistTitle: 'Due Diligence & Site Inspection Checklist',
    checklistSubtitle: 'Essential verification items before paying advance token money',
    items: [
      {
        id: 'b-1',
        title: 'Title Deed & Encumbrance Certificate (EC)',
        description: 'Ensure a clean 15–30 year nil-encumbrance certificate showing no ongoing mortgages or legal disputes.',
      },
      {
        id: 'b-2',
        title: 'Khata Certificate & Extract Verification',
        description: 'Verify A-Khata or municipal equivalent status with updated local revenue municipal records.',
      },
      {
        id: 'b-3',
        title: 'Approved Sanctioned Plan & Occupancy Certificate (OC)',
        description: 'Check that constructed floor area matches sanctioned blueprints without unauthorized modifications.',
      },
      {
        id: 'b-4',
        title: 'Physical Plumbing & Seepage Inspection',
        description: 'Test all taps, flush tanks, concealed pipe areas, and ceiling corners for dampness or structural cracks.',
      },
      {
        id: 'b-5',
        title: 'Car Parking Allotment Letter',
        description: 'Confirm demarcated covered/open car parking space mentioned specifically in the draft sale agreement.',
      },
      {
        id: 'b-6',
        title: 'Property Tax Receipts & RWA No-Due Certificate',
        description: 'Request the latest property tax receipt and society maintenance clearance from the existing owner.',
      },
    ],
    tips: [
      {
        id: 'bt-1',
        badge: 'Legal',
        title: 'Never Skip Independent Legal Scrutiny',
        description: 'Always hire an independent property lawyer to vet original parent deeds and link documents, rather than relying solely on bank loan approval.',
        icon: 'Shield',
      },
      {
        id: 'bt-2',
        badge: 'Financial',
        title: 'Factor In Hidden Ancillary Costs',
        description: 'Account for 6–8% in stamp duty & registration fees, RWA club membership charges, and interior costs on top of the base property price.',
        icon: 'Dollar',
      },
      {
        id: 'bt-3',
        badge: 'Essential',
        title: 'Visit at Different Times of Day',
        description: 'Inspect the property in the morning (for natural sunlight & school traffic) and in the evening (for noise levels & parking congestion).',
        icon: 'Sparkle',
      },
    ],
  },
  sellers: {
    title: 'Property Owners & Sellers',
    icon: Key,
    checklistTitle: 'Property Listing & Sale Readiness Checklist',
    checklistSubtitle: 'Steps to maximize property valuation and attract genuine direct buyers',
    items: [
      {
        id: 's-1',
        title: 'Gather Core Legal & Tax Records',
        description: 'Keep sale deed copies, latest property tax receipts, electricity bills, and NOC ready for buyer review.',
      },
      {
        id: 's-2',
        title: 'Apply for ListMe "Verified Owner" Badge',
        description: 'Upload property electricity or water bill to get the verified badge and boost inquiry response rates by 3x.',
      },
      {
        id: 's-3',
        title: 'High-Resolution Decluttered Photography',
        description: 'Take wide-angle landscape photos during peak daylight with clean countertops, open curtains, and well-lit rooms.',
      },
      {
        id: 's-4',
        title: 'Complete Minor Touch-ups & Painting',
        description: 'A fresh coat of neutral paint and fixing leaky taps creates a strong first impression during physical buyer walkthroughs.',
      },
      {
        id: 's-5',
        title: 'Research Fair Market Sub-locality Rates',
        description: 'Price realistically based on recent registrations in your apartment complex or locality rather than speculative listings.',
      },
      {
        id: 's-6',
        title: 'Clear Outstanding Society Maintenance & Utility Dues',
        description: 'Ensure all electricity, water, and RWA dues are paid up to date to prevent friction during final closing.',
      },
    ],
    tips: [
      {
        id: 'st-1',
        badge: 'Staging',
        title: 'Neutral Aesthetic Maximizes Broad Appeal',
        description: 'Remove heavy personal memorabilia or clutter so prospective buyers can envision their own family living in the space.',
        icon: 'Sparkle',
      },
      {
        id: 'st-2',
        badge: 'Financial',
        title: 'Save Lakhs with Zero Brokerage',
        description: 'Direct listing on ListMe saves up to 2% in upfront broker commissions, giving you room to negotiate favorably on closing price.',
        icon: 'Dollar',
      },
      {
        id: 'st-3',
        badge: 'Essential',
        title: 'Screen Leads with OTP Verification',
        description: 'Respond promptly to inquiries in your dashboard where seekers are verified via mobile OTP, filtering out unwanted broker solicitations.',
        icon: 'Shield',
      },
    ],
  },
  tenants: {
    title: 'Tenants & Renters',
    icon: FileText,
    checklistTitle: 'Rental Move-In & Agreement Checklist',
    checklistSubtitle: 'Protect your security deposit and ensure smooth leasing terms',
    items: [
      {
        id: 't-1',
        title: 'Verify Leave & License Agreement Clauses',
        description: 'Examine lock-in duration (standard 6 months), notice period (1-2 months), and annual rent escalation percentage (typically 5%).',
      },
      {
        id: 't-2',
        title: 'Document Meter Readings at Handover',
        description: 'Photograph electricity sub-meter, water meter, and piped gas meter readings on day one of taking possession.',
      },
      {
        id: 't-3',
        title: 'Prepare Detailed Inventory of Fixtures',
        description: 'Document condition of all fans, geysers, ACs, electrical fittings, and existing woodwork before moving in.',
      },
      {
        id: 't-4',
        title: 'Clarify Society Maintenance & Amenity Fees',
        description: 'Ensure agreement clearly specifies whether monthly maintenance is included in rent or payable separately to RWA.',
      },
      {
        id: 't-5',
        title: 'Confirm Security Deposit Refund Terms',
        description: 'Verify written clause stating security deposit must be refunded via bank transfer on or before key handover day.',
      },
      {
        id: 't-6',
        title: 'Check Cellular Reception in All Rooms',
        description: 'Make a live phone call and speed test mobile data in bedrooms, kitchen, and balconies to avoid dead zones.',
      },
    ],
    tips: [
      {
        id: 'tt-1',
        badge: 'Legal',
        title: 'Insist on Registered or E-Stamped Agreement',
        description: 'Avoid informal verbal pacts. Ensure the rental agreement is on valid non-judicial stamp paper or digitally signed via legal e-stamp.',
        icon: 'File',
      },
      {
        id: 'tt-2',
        badge: 'Financial',
        title: 'Pay Deposit Exclusively via Bank Transfer',
        description: 'Never pay cash deposits. Bank transactions serve as legal evidence for income tax HRA deductions and deposit recovery.',
        icon: 'Dollar',
      },
      {
        id: 'tt-3',
        badge: 'Essential',
        title: 'Direct Landlord Connect Eliminates Broker Fees',
        description: 'Use ListMe to find verified owners directly and save 1 to 2 months rent commonly demanded as broker fees.',
        icon: 'Shield',
      },
    ],
  },
};

export default function TipsPage() {
  const [activePersona, setActivePersona] = useState<GuidePersona>('buyers');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const personaConfig = PERSONA_CONFIG[activePersona];
  const items = personaConfig.items;

  // Calculate progress
  const checkedCount = items.filter((item) => checkedItems[item.id]).length;
  const totalCount = items.length;
  const progressPercent = Math.round((checkedCount / totalCount) * 100);

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const resetCurrentChecklist = () => {
    const updated = { ...checkedItems };
    items.forEach((item) => {
      delete updated[item.id];
    });
    setCheckedItems(updated);
  };

  const renderTipIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield':
        return <ShieldCheck size={20} />;
      case 'Dollar':
        return <DollarSign size={20} />;
      case 'File':
        return <FileText size={20} />;
      default:
        return <Sparkles size={20} />;
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
              <Lightbulb size={15} /> Real Estate Masterclasses & Tips
            </span>
            <h1 className={styles.heroTitle}>Property Knowledge & Checklists</h1>
            <p className={styles.heroSubtitle}>
              Actionable guides, due-diligence checklists, and insider tips to help you buy, sell, or rent real estate smartly with zero brokerage.
            </p>
          </div>
        </section>

        <div className="container">
          {/* Persona Tabs */}
          <div className={styles.tabsContainer}>
            {(['buyers', 'sellers', 'tenants'] as GuidePersona[]).map((p) => {
              const cfg = PERSONA_CONFIG[p];
              const Icon = cfg.icon;
              return (
                <button
                  key={p}
                  onClick={() => setActivePersona(p)}
                  className={`${styles.tabButton} ${activePersona === p ? styles.tabButtonActive : ''}`}
                >
                  <Icon size={18} />
                  <span>{cfg.title}</span>
                </button>
              );
            })}
          </div>

          {/* Guide Grid: Left = Interactive Checklist, Right = Expert Tips */}
          <div className={styles.guideGrid}>
            {/* Interactive Checklist Card */}
            <div className={styles.checklistCard}>
              <div className={styles.checklistHeader}>
                <div>
                  <h2 className={styles.checklistTitle}>{personaConfig.checklistTitle}</h2>
                  <p className={styles.checklistSubtitle}>{personaConfig.checklistSubtitle}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className={styles.progressPill}>
                    <CheckSquare size={14} />
                    <span>{checkedCount} of {totalCount} Done ({progressPercent}%)</span>
                  </div>
                  {checkedCount > 0 && (
                    <button
                      onClick={resetCurrentChecklist}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem' }}
                      title="Reset Checklist"
                    >
                      <RefreshCw size={13} /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className={styles.progressBarTrack}>
                <div 
                  className={styles.progressBarFill} 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Items List */}
              <div className={styles.checklistItems}>
                {items.map((item) => {
                  const isChecked = !!checkedItems[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`${styles.checklistItem} ${isChecked ? styles.checklistItemChecked : ''}`}
                    >
                      <div className={styles.checkboxBox}>
                        {isChecked && <Check size={14} strokeWidth={3} />}
                      </div>
                      <div className={styles.itemContent}>
                        <div className={styles.itemTitle}>{item.title}</div>
                        <div className={styles.itemDesc}>{item.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expert Tips Column */}
            <div className={styles.tipsGrid}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-neutral-900)' }}>
                Expert Recommendations
              </h3>

              {personaConfig.tips.map((tip) => (
                <div key={tip.id} className={styles.tipCard}>
                  <div className={styles.tipHeader}>
                    <div className={styles.tipIconWrap}>
                      {renderTipIcon(tip.icon)}
                    </div>
                    <span 
                      className={`${styles.tipBadge} ${
                        tip.badge === 'Essential' ? styles.tipBadgeEssential :
                        tip.badge === 'Legal' ? styles.tipBadgeLegal :
                        tip.badge === 'Financial' ? styles.tipBadgeFinancial : styles.tipBadgeStaging
                      }`}
                    >
                      {tip.badge}
                    </span>
                  </div>
                  <h4 className={styles.tipTitle}>{tip.title}</h4>
                  <p className={styles.tipText}>{tip.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Banner */}
          <div className={styles.ctaBox}>
            <div>
              <h3>Ready to make your next move?</h3>
              <p>Explore thousands of direct verified properties or list your home with zero fees.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link href="/listings?type=sale">
                <Button variant="secondary" size="md">
                  Browse Properties
                </Button>
              </Link>
              <Link href="/post-property">
                <Button variant="outline" size="md" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} rightIcon={<ArrowRight size={16} />}>
                  Post Property Free
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
