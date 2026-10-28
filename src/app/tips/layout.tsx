import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata({
  title: 'Property Tips and Checklists | ListMe',
  description: 'Practical checklists for buyers, sellers, tenants and owners: documents, inspections, pricing and safety.',
  path: '/tips',
  socialTitle: 'Property Tips | ListMe',
});

export default function TipsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
