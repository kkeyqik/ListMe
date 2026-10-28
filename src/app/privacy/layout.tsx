import { pageMetadata } from '@/lib/page-metadata';

export const metadata = pageMetadata({
  title: 'Privacy Policy | ListMe',
  description: 'How ListMe collects, uses and protects your personal information.',
  path: '/privacy',
  socialTitle: 'ListMe Privacy Policy',
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
