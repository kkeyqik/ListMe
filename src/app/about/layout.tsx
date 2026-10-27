import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About ListMe | Direct Owner Real Estate Platform in India',
  description: 'Learn how ListMe connects property owners directly with buyers and tenants across India, without brokers.',
  alternates: { canonical: '/about' },
  openGraph: { url: '/about', title: 'About ListMe' },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
