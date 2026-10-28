import Home from './HomeClient';
import { pageMetadata } from '@/lib/page-metadata';

// Server entry for "/" so the home page can declare its own canonical URL and
// social image; the page itself is the client component in HomeClient.tsx.
export const metadata = pageMetadata({
  title: 'ListMe — List it. Find it. Own it. | Free Real Estate Platform',
  description: 'Browse, sell, or rent properties across India for free. Direct owner listing, verified phone numbers, and interest-based connection with zero brokerage.',
  path: '/',
  socialTitle: 'ListMe — List it. Find it. Own it.',
});

export default function HomePage() {
  return <Home />;
}
