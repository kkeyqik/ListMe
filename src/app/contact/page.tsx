'use client';

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { Header, Footer } from '@/components/layout';
import { useToast, Input, Button } from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import { isPlaceholderEmail, isPlaceholderPhone } from '@/lib/contact-info';
import styles from '../static.module.css';

export default function Contact() {
  const { showToast } = useToast();
  const { settings } = useSettings();
  const brandName = settings.brandName || 'ListMe';
  // Hide placeholder contacts (e.g. +91 99999 99999, addresses on domains we don't own)
  // instead of sending people to strangers.
  const contactPhone = isPlaceholderPhone(settings.contactPhone) ? '' : settings.contactPhone;
  const contactEmail = isPlaceholderEmail(settings.contactEmail) ? '' : settings.contactEmail;
  const officeAddress = settings.officeAddress || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from humans
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const text = (data && typeof data.message === 'string' && data.message)
          || 'We could not send your message. Please try again.';
        setStatus({ type: 'error', text });
        showToast('Message not sent', text, 'error');
        return;
      }
      const text = 'Thank you! Your message has reached our team and we will get back to you shortly.';
      setStatus({ type: 'success', text });
      showToast('Message Sent', text, 'success');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      const text = 'Network error. Please check your connection and try again.';
      setStatus({ type: 'error', text });
      showToast('Message not sent', text, 'error');
    } finally {
      setLoading(false);
    }
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
            
            {contactEmail && (
              <div className={styles.infoItem}>
                <Mail className={styles.infoIcon} size={18} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-neutral-900)' }}>Email Us</div>
                  <a href={`mailto:${contactEmail}`} style={{ fontSize: '0.875rem' }}>{contactEmail}</a>
                </div>
              </div>
            )}

            {contactPhone && (
              <div className={styles.infoItem}>
                <Phone className={styles.infoIcon} size={18} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-neutral-900)' }}>Call Us</div>
                  <a href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`} style={{ fontSize: '0.875rem' }}>{contactPhone}</a>
                </div>
              </div>
            )}

            {!contactEmail && !contactPhone && (
              <div className={styles.infoItem}>
                <Send className={styles.infoIcon} size={18} />
                <div style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                  Use the form to reach our team. Every message goes straight to the {brandName} admins.
                </div>
              </div>
            )}

            {officeAddress && (
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
            )}
          </div>

          {/* Right Column: Contact form */}
          <div className={styles.formCard}>
            <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
              {/* Honeypot field: hidden from people, filled in by naive bots */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <label>
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>

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
                <label htmlFor="contact-message" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-neutral-700)' }}>
                  Message
                </label>
                <textarea
                  id="contact-message"
                  minLength={10}
                  maxLength={5000}
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

              {status && (
                <div
                  role={status.type === 'error' ? 'alert' : 'status'}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    background: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: status.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  }}
                >
                  {status.text}
                </div>
              )}

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
