import { SITE_URL } from './site-url';

/**
 * Helpers for public contact details (phone, email, WhatsApp).
 *
 * The admin settings and client defaults still carry placeholder values such as
 * "+91 99999 99999" and support@listme.in (a domain the project does not own).
 * Showing or linking those sends users to strangers, so treat them as unset.
 */

/** Digits only, e.g. "+91 98765-43210" -> "919876543210". */
export function phoneDigits(phone: string | null | undefined): string {
  return (phone || '').replace(/\D/g, '');
}

/** True for empty values and obvious placeholders (all one digit, 1234567890-style runs). */
export function isPlaceholderPhone(phone: string | null | undefined): boolean {
  const digits = phoneDigits(phone);
  if (digits.length < 10) return true;
  const local = digits.slice(-10);
  if (/^(\d)\1{9}$/.test(local)) return true;
  if (local === '1234567890' || local === '0123456789' || local === '9876543210') return true;
  return false;
}

/** Domains the project does not control; addresses there must not be published. */
const UNOWNED_EMAIL_DOMAINS = ['listme.in', 'listme.com'];

/** True for empty values and support addresses on domains we don't own. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  const value = (email || '').trim().toLowerCase();
  if (!value || !value.includes('@')) return true;
  const domain = value.split('@').pop() || '';
  let siteHost = '';
  try {
    siteHost = new URL(SITE_URL).hostname.toLowerCase();
  } catch {
    siteHost = '';
  }
  // If the site is later served from one of these domains, it is owned after all.
  const isOwned = siteHost === domain || siteHost.endsWith(`.${domain}`);
  return !isOwned && UNOWNED_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

/**
 * WhatsApp number (international digits, no "+") from NEXT_PUBLIC_WHATSAPP_NUMBER,
 * or null when it is not configured. Callers should hide WhatsApp CTAs on null.
 */
export function getWhatsAppNumber(): string | null {
  const digits = phoneDigits(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  if (!digits || isPlaceholderPhone(digits)) return null;
  // Bare 10-digit Indian mobile -> prefix the country code.
  return digits.length === 10 ? `91${digits}` : digits;
}

/** wa.me link with an optional prefilled message, or null when no number is configured. */
export function getWhatsAppLink(text?: string): string | null {
  const number = getWhatsAppNumber();
  if (!number) return null;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
