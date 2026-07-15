import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://listme.in';

  let listingUrls: MetadataRoute.Sitemap = [];

  try {
    const listings = await prisma.listing.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, updatedAt: true },
    });

    listingUrls = listings.map((l) => ({
      url: `${baseUrl}/property/${l.id}`,
      lastModified: l.updatedAt,
    }));
  } catch {
    listingUrls = [];
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/listings`,
      lastModified: new Date(),
      changeFrequency: 'always' as const,
      priority: 0.8,
    },
    ...listingUrls,
  ];
}
