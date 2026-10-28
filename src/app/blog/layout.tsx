import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata({
  title: 'Property Insights and Articles | ListMe Blog',
  description: 'Articles and guides on buying, selling and renting property in India directly with owners.',
  path: '/blog',
  socialTitle: 'ListMe Blog',
});

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
