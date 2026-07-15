'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Newsletter subscription mock action
    setEmail('');
  };

  return (
    <footer className={styles.footer}>
      <div className={`${styles.footerContent} container`}>
        <div className={styles.grid}>
          {/* Column 1: Logo & description */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.logo}>
              ListMe
            </Link>
            <p className={styles.description}>
              Reach thousands of genuine buyers and tenants. India's first completely free real estate SaaS platform connecting owners and seekers directly.
            </p>
            <div className={styles.socialLinks}>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Facebook">
                <svg
                  className={styles.socialSvg}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Twitter">
                <svg
                  className={styles.socialSvg}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Instagram">
                <svg
                  className={styles.socialSvg}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="LinkedIn">
                <svg
                  className={styles.socialSvg}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className={styles.heading}>Quick Links</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href="/listings?type=sale" className={styles.link}>
                  Buy Properties
                </Link>
              </li>
              <li>
                <Link href="/listings?type=rent" className={styles.link}>
                  Rent Properties
                </Link>
              </li>
              <li>
                <Link href="/post-property" className={styles.link}>
                  Post Property (Free)
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className={styles.link}>
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className={styles.link}>
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className={styles.link}>
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h4 className={styles.heading}>Resources</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href="/blog" className={styles.link}>
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/tips" className={styles.link}>
                  Property Tips
                </Link>
              </li>
              <li>
                <Link href="/faq" className={styles.link}>
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/terms" className={styles.link}>
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={styles.link}>
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Popular Locations */}
          <div>
            <h4 className={styles.heading}>Popular Locations</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href="/listings?location=bangalore" className={styles.link}>
                  Bangalore
                </Link>
              </li>
              <li>
                <Link href="/listings?location=hyderabad" className={styles.link}>
                  Hyderabad
                </Link>
              </li>
              <li>
                <Link href="/listings?location=mumbai" className={styles.link}>
                  Mumbai
                </Link>
              </li>
              <li>
                <Link href="/listings?location=pune" className={styles.link}>
                  Pune
                </Link>
              </li>
              <li>
                <Link href="/listings?location=chennai" className={styles.link}>
                  Chennai
                </Link>
              </li>
              <li>
                <Link href="/listings?location=delhi" className={styles.link}>
                  Delhi
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Newsletter form */}
          <div className={styles.newsletterCol}>
            <h4 className={styles.heading}>Newsletter</h4>
            <p className={styles.newsletterDesc}>
              Subscribe to get the latest property updates and news.
            </p>
            <form onSubmit={handleSubscribe} className={styles.subscribeForm}>
              <input
                type="email"
                placeholder="Your email address"
                className={styles.subscribeInput}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className={styles.subscribeButton} aria-label="Subscribe">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom row */}
        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            Copyright © {new Date().getFullYear()} ListMe. All rights reserved.
          </div>
          <div className={styles.madeWith}>
            Made with <span className={styles.heart}>♥</span> for property owners & buyers.
          </div>
          <div className={styles.bottomHighlight}>
            No fees. No hidden charges. +
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
