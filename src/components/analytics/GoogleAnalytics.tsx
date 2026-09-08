'use client';

import React from 'react';
import Script from 'next/script';
import { useSettings } from '@/context/SettingsContext';

export function GoogleAnalytics() {
  const { settings } = useSettings();
  const gaId = process.env.NEXT_PUBLIC_GA_ID || settings.googleAnalyticsId;

  if (!gaId || typeof gaId !== 'string' || !gaId.trim() || gaId.trim() === 'undefined') {
    return null;
  }

  const cleanGaId = gaId.trim();

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${cleanGaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${cleanGaId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
