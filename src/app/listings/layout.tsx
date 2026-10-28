import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata({
  title: 'Search Properties for Sale and Rent | ListMe',
  description: 'Browse direct-owner flats, houses, plots and commercial properties for sale and rent across India. Filter by city, budget, BHK and more.',
  path: '/listings',
  socialTitle: 'Search Properties | ListMe',
});

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
