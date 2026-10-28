import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata({
  title: 'FAQ | ListMe Help Centre',
  description: 'Answers to common questions about listing, searching, verification and enquiries on ListMe.',
  path: '/faq',
  socialTitle: 'ListMe FAQ',
});

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
