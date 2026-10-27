import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ | ListMe Help Centre',
  description: 'Answers to common questions about listing, searching, verification and enquiries on ListMe.',
  alternates: { canonical: '/faq' },
  openGraph: { url: '/faq', title: 'ListMe FAQ' },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
