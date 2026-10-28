import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata({
  title: 'Contact ListMe | Support for Owners, Buyers and Tenants',
  description: 'Get in touch with the ListMe team for help with listings, enquiries, account issues or takedown requests.',
  path: '/contact',
  socialTitle: 'Contact ListMe',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
