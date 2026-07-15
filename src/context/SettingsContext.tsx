'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface SystemSettings {
  brandName: string;
  contactEmail: string;
  contactPhone: string;
  officeAddress: string;
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
