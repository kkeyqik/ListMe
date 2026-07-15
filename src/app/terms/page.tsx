'use client';

import React from 'react';
import { Header, Footer } from '@/components/layout';
import styles from '../static.module.css';

export default function Terms() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className={`${styles.container} container`} style={{ flex: 1 }}>
        <h1 className={styles.title}>Terms of Service</h1>
        <span className={styles.lastUpdated}>Last updated: July 2026</span>

        <div className={styles.content}>
          <p>
            Welcome to ListMe! These Terms of Service outline the rules and regulations for the use of 
            ListMe's Website, located at listme.in. By accessing this website, we assume you accept these 
            terms in full.
          </p>

          <h2 className={styles.heading2}>1. Account Registration and Mobile Verification</h2>
          <p>
            To use key features of the platform (posting listings or expressing interest in listings), 
            users must register and verify their phone number via mobile OTP. You are responsible for maintaining 
            the security of your account and credentials.
          </p>

          <h2 className={styles.heading2}>2. Listing Property and Verification</h2>
          <p>
            By posting a property on ListMe, you agree that:
          </p>
          <ul className={styles.list}>
            <li>All details provided (asking price, area, locality, specs, RERA ID) are accurate and not misleading.</li>
            <li>You hold the legal right/ownership to list the property for sale or rent.</li>
            <li>You will upload authentic ownership documentation if requested by our moderation team.</li>
            <li>ListMe reserves the right to review, reject, or remove any listing at its sole discretion if it fails security criteria.</li>
          </ul>

          <h2 className={styles.heading2}>3. Commission and Payments</h2>
          <p>
            ListMe is a **Free-to-List** platform. Listing properties, browsing search results, and contacting owners is free of charge. However, in exchange for connecting owners directly to qualified seekers:
          </p>
          <ul className={styles.list}>
            <li>If a seeker introduced by ListMe successfully purchases your listed property, you agree to pay a **2% commission fee** on the final closed sale amount.</li>
            <li>All commissions must be cleared within 15 days of sale closure.</li>
            <li>Premium listing subscriptions (optional location-based ranking boosts) will be charged separately under specified tier packages.</li>
          </ul>

          <h2 className={styles.heading2}>4. Prohibited Conduct</h2>
          <p>
            Users are prohibited from listing fake properties, scraping listing database records, using automated bots 
            to crawl data, registering false phone numbers, or circumventing interest tracking loops.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
