import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata({
  title: 'Terms of Service | ListMe',
  description: 'The terms that apply when you list, search for or enquire about property on ListMe.',
  path: '/terms',
  socialTitle: 'ListMe Terms of Service',
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
