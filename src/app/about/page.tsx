'use client';

import React from 'react';
import { Header, Footer } from '@/components/layout';
import styles from '../static.module.css';

export default function About() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className={`${styles.container} container`} style={{ flex: 1 }}>
        <h1 className={styles.title}>About ListMe</h1>
        <span className={styles.lastUpdated}>Last updated: July 2026</span>
        
        <div className={styles.content}>
          <p>
            Welcome to <strong>ListMe</strong> — India's premier free real estate SaaS platform. 
            We are dedicated to simplifying how property owners list, manage, and find houses, flats, plots, 
            or commercial listings, entirely without brokers.
          </p>
          
          <h2 className={styles.heading2}>Our Mission</h2>
          <p>
            Real estate transactions in India are heavily burdened by high brokerage fees. Owners looking to sell 
            or rent their property are forced to shell out up to 2% of the deal value, while seekers face 
            inflated prices and constant spam.
          </p>
          <p>
            ListMe was born to disrupt this. We connect property owners and home seekers directly. By verifying 
            every account via mobile OTP and hiding contact numbers initially, we create a secure, broker-free 
            environment where you are in complete control of your data.
          </p>

          <h2 className={styles.heading2}>How It Works</h2>
          <p>
            Our model is simple and completely transparent:
          </p>
          <ul className={styles.list}>
            <li>
              <strong>Direct Listing:</strong> Any owner can sign up and list their property details, carpet areas, 
              RERA details, photos, and verification documents in under 5 minutes for free.
            </li>
            <li>
              <strong>Privacy Protection:</strong> Phone numbers are hidden. If a buyer is interested, they click the 
              "Interested" button.
            </li>
            <li>
              <strong>Interest Matching:</strong> We verify the buyer's mobile number via OTP, and immediately notify 
              the owner, revealing contact details only once verification is complete.
            </li>
            <li>
              <strong>Commission Model:</strong> Listing remains 100% free. If our match successfully sells the property, 
              we charge a flat 2% commission on the closing price to assist in closing deals quickly.
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
