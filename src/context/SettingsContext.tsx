'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface SystemSettings {
  brandName: string;
  contactEmail: string;
  contactPhone: string;
  officeAddress: string;
  logoUrl: string;
  faviconPath: string;
  companyName: string;
  copyrightYear: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
  commissionPercentage: string;
  pricingPlanRate: string;
  promoRibbonText: string;
  googleAnalyticsId: string;
  enableIntercom: string;
  enableRecaptcha: string;
}

interface SettingsContextType {
  settings: SystemSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: SystemSettings = {
  brandName: 'ListMe',
  contactEmail: 'support@listme.in',
  contactPhone: '+91 99999 99999',
  officeAddress: 'ListMe Tech Space, Indiranagar, Bangalore, India',
  logoUrl: '/images/logo.png',
  faviconPath: '/favicon.ico',
  companyName: 'ListMe Technologies Private Limited',
  copyrightYear: '2026',
  privacyPolicyUrl: '/privacy',
  termsOfServiceUrl: '/terms',
  twitterUrl: 'https://twitter.com',
  facebookUrl: 'https://facebook.com',
  linkedinUrl: 'https://linkedin.com',
  instagramUrl: 'https://instagram.com',
  commissionPercentage: '2',
  pricingPlanRate: '0',
  promoRibbonText: 'Launch Offer: 100% Free Listing',
  googleAnalyticsId: '',
  enableIntercom: 'false',
  enableRecaptcha: 'false',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          brandName: data.brandName || defaultSettings.brandName,
          contactEmail: data.contactEmail || defaultSettings.contactEmail,
          contactPhone: data.contactPhone || defaultSettings.contactPhone,
          officeAddress: data.officeAddress || defaultSettings.officeAddress,
          logoUrl: data.logoUrl || defaultSettings.logoUrl,
          faviconPath: data.faviconPath || defaultSettings.faviconPath,
          companyName: data.companyName || defaultSettings.companyName,
          copyrightYear: data.copyrightYear || defaultSettings.copyrightYear,
          privacyPolicyUrl: data.privacyPolicyUrl || defaultSettings.privacyPolicyUrl,
          termsOfServiceUrl: data.termsOfServiceUrl || defaultSettings.termsOfServiceUrl,
          twitterUrl: data.twitterUrl || defaultSettings.twitterUrl,
          facebookUrl: data.facebookUrl || defaultSettings.facebookUrl,
          linkedinUrl: data.linkedinUrl || defaultSettings.linkedinUrl,
          instagramUrl: data.instagramUrl || defaultSettings.instagramUrl,
          commissionPercentage: data.commissionPercentage || defaultSettings.commissionPercentage,
          pricingPlanRate: data.pricingPlanRate || defaultSettings.pricingPlanRate,
          promoRibbonText: data.promoRibbonText || defaultSettings.promoRibbonText,
          googleAnalyticsId: data.googleAnalyticsId || defaultSettings.googleAnalyticsId,
          enableIntercom: data.enableIntercom || defaultSettings.enableIntercom,
          enableRecaptcha: data.enableRecaptcha || defaultSettings.enableRecaptcha,
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
