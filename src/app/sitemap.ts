import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from '@/lib/site-url';

// Regenerate hourly so newly approved listings appear without a redeploy
// (sitemap.ts is otherwise cached at build time).
export const revalidate = 3600;

type StaticEntry = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
};

const STATIC_PAGES: StaticEntry[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/listings', changeFrequency: 'always', priority: 0.8 },
  { path: '/post-property', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tips', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.4 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let listingUrls: MetadataRoute.Sitemap = [];

  try {
    const listings = await prisma.listing.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, updatedAt: true },
    });

    listingUrls = listings.map((l) => ({
      url: `${SITE_URL}/property/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    listingUrls = [];
  }

  return [
    ...STATIC_PAGES.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...listingUrls,
  ];
}
