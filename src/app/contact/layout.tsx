import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact ListMe | Support for Owners, Buyers and Tenants',
  description: 'Get in touch with the ListMe team for help with listings, enquiries, account issues or takedown requests.',
  alternates: { canonical: '/contact' },
  openGraph: { url: '/contact', title: 'Contact ListMe' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
