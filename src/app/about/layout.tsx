import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata({
  title: 'About ListMe | Direct Owner Real Estate Platform in India',
  description: 'Learn how ListMe connects property owners directly with buyers and tenants across India, without brokers.',
  path: '/about',
  socialTitle: 'About ListMe',
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
