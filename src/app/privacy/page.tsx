'use client';

import React from 'react';
import { Header, Footer } from '@/components/layout';
import styles from '../static.module.css';

export default function Privacy() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className={`${styles.container} container`} style={{ flex: 1 }}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <span className={styles.lastUpdated}>Last updated: July 2026</span>

        <div className={styles.content}>
          <p>
            At ListMe, accessible from listme.in, one of our main priorities is the privacy of our visitors. 
            This Privacy Policy document contains types of information that is collected and recorded by ListMe 
            and how we use it.
          </p>

          <h2 className={styles.heading2}>1. Information We Collect</h2>
          <p>
            We collect personal information that you voluntarily provide to us when registering, listing a property, 
            or expressing interest in a property:
          </p>
          <ul className={styles.list}>
            <li><strong>Profile Information:</strong> Name, email address, phone number, and mailing address.</li>
            <li><strong>Listing Specifications:</strong> Title, description, photos, pricing, locality, pin code, RERA number, and verification documents.</li>
            <li><strong>Auth Credentials:</strong> Mobile phone number for OTP (One-Time Password) generation.</li>
          </ul>

          <h2 className={styles.heading2}>2. How We Protect Your Privacy</h2>
          <p>
            We implement strict privacy layers to keep your contact details secure and prevent spam:
          </p>
          <ul className={styles.list}>
            <li>
              <strong>Obfuscated Phone Numbers:</strong> Listing details public view hides phone numbers and emails. 
              Only verified home seekers who explicitly press "I'm Interested" and pass a mobile verification step can view them.
            </li>
            <li>
              <strong>Obfuscated Addresses:</strong> Flat numbers and specific house coordinates are private. 
              Public maps and description lists only reference approximate locality points.
            </li>
            <li>
              <strong>Private Verification Docs:</strong> Uploaded ownership deeds or tax forms are strictly restricted 
              to our admin auditing team for trust-checking and are never exposed publicly.
            </li>
          </ul>

          <h2 className={styles.heading2}>3. Third-Party Services</h2>
          <p>
            We utilize secure third-party services such as Supabase (database storage and authentication provider) 
            and Vercel (frontend deployment hosting provider) to maintain and scale our service securely. 
            All data transfers use SSL/TLS encryption.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
