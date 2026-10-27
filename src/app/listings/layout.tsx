import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Properties for Sale and Rent | ListMe',
  description: 'Browse direct-owner flats, houses, plots and commercial properties for sale and rent across India. Filter by city, budget, BHK and more.',
  alternates: { canonical: '/listings' },
  openGraph: { url: '/listings', title: 'Search Properties | ListMe' },
};

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
