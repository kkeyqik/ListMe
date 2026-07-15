'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { useToast, Input, Button } from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import styles from '../static.module.css';

export default function Contact() {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const brandName = settings.brandName || 'ListMe';
  const contactPhone = settings.contactPhone || '+91 1800 123 45';
  const contactEmail = settings.contactEmail || 'support@listme.in';
  const officeAddress = settings.officeAddress || '80 Feet Road, Indiranagar, Bangalore, KA, 560038';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Message Sent', 'Thank you! We will get back to you shortly.', 'success');
      setName('');
      setEmail('');
      setMessage('');
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main className={`${styles.container} container`} style={{ flex: 1, maxWidth: '1000px' }}>
        <h1 className={styles.title} style={{ textAlign: 'center', marginBottom: '3rem' }}>Contact {brandName}</h1>

        <div className={styles.contactGrid}>
          {/* Left Column: Contact details card */}
          <div className={styles.contactInfoCard}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-neutral-900)' }}>
              Get in Touch
            </h2>
            
            <div className={styles.infoItem}>
              <Mail className={styles.infoIcon} size={18} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-neutral-900)' }}>Email Us</div>
                <a href={`mailto:${contactEmail}`} style={{ fontSize: '0.875rem' }}>{contactEmail}</a>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Phone className={styles.infoIcon} size={18} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-neutral-900)' }}>Call Us</div>
                <a href={`tel:${contactPhone}`} style={{ fontSize: '0.875rem' }}>{contactPhone}</a>
              </div>
            </div>

            <div className={styles.infoItem}>
              <MapPin className={styles.infoIcon} size={18} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-neutral-900)' }}>Head Office</div>
                <div style={{ fontSize: '0.875rem', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                  {brandName} Technologies Pvt Ltd,<br />
                  {officeAddress}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact form */}
          <div className={styles.formCard}>
            <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Input
                label="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={loading}
                fullWidth
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                disabled={loading}
                fullWidth
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-neutral-700)' }}>
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help you today?"
                  className={styles.textarea}
                  rows={4}
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.625rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-neutral-300)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  leftIcon={<Send size={16} />}
                >
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
