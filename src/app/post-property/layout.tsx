import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata({
  title: 'Post Property Free | Sell or Rent Directly | ListMe',
  description: 'List your flat, house, plot or commercial property for sale or rent on ListMe and connect directly with buyers and tenants.',
  path: '/post-property',
  socialTitle: 'Post Your Property on ListMe',
});

export default function PostPropertyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
