import React, { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PropertyClient from './PropertyClient';
import { Breadcrumbs } from '@/components/ui';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { serializeJsonLd } from '@/lib/json-ld';
import { absoluteUrl } from '@/lib/site-url';
import { DEFAULT_OG_IMAGE } from '@/lib/page-metadata';
import styles from './page.module.css';
import { hasVerifiedMfaCookie } from '@/lib/admin-mfa';

interface PropertyPageProps {
  params: Promise<{ id: string }>;
}

// Listing.id is a Postgres UUID; Prisma throws (500) on anything else, so treat it as not found.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One query per request, shared by generateMetadata and the page (React cache dedupes it).
const getListing = cache(async (id: string) =>
  prisma.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
      videos: true,
      documents: true,
      amenities: {
        include: {
          amenity: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          phoneVerified: true,
          role: true,
        },
      },
    },
  })
);

// 1. Generate Server-side SEO Metadata
export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return {
      title: 'Property Not Found — ListMe',
      robots: { index: false, follow: false },
    };
  }

  const listing = await getListing(id);

  if (!listing) {
    return {
      title: 'Property Not Found — ListMe',
      description: 'The property listing you are looking for is no longer active or does not exist.',
    };
  }

  // Pending, rejected and deactivated listings are only previewed by their owner
  // and admins, so give them a neutral title and keep them out of search engines.
  if (listing.status !== 'ACTIVE') {
    return {
      title: 'Listing Preview — ListMe',
      robots: { index: false, follow: false },
    };
  }

  const formatVal = parseFloat(listing.askingPrice.toString());
  const priceStr = formatVal >= 10000000
    ? `₹${(formatVal / 10000000).toFixed(2)} Cr`
    : formatVal >= 100000
    ? `₹${(formatVal / 100000).toFixed(2)} Lk`
    : `₹${formatVal.toLocaleString('en-IN')}`;

  const title = `${listing.title} — ${priceStr}${listing.listingFor === 'RENT' ? '/month' : ''} | ListMe`;
  const description = listing.description || `Verified owner property listed directly on ListMe in ${listing.locality}, ${listing.city}. Zero brokerage fees!`;
  // Prefer the primary image, else fall back to the first one
  const ogImage = listing.images.find((img) => img.isPrimary) || listing.images[0];
  const imageUrl = ogImage?.imageUrl ? absoluteUrl(ogImage.imageUrl) : '';

  return {
    title,
    description,
    alternates: {
      canonical: `/property/${id}`
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/property/${id}`,
      images: imageUrl ? [{ url: imageUrl }] : [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl || DEFAULT_OG_IMAGE.url],
    },
  };
}

// 2. Render Server Component Page
export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  // Fetch listing details including nested amenities (cached, shared with generateMetadata)
  const listing = await getListing(id);

  // If listing doesn't exist or is not active (except for owners/admins, but here we can check public status)
  if (!listing) {
    notFound();
  }

  // Pending, rejected and deactivated listings are visible only to their owner and admins
  if (listing.status !== 'ACTIVE') {
    const viewerId = await getAuthenticatedUserId();
    let canPreview = !!viewerId && viewerId === listing.ownerId;
    if (viewerId && !canPreview) {
      const viewer = await prisma.profile.findUnique({ where: { id: viewerId }, select: { role: true } });
      canPreview = (viewer?.role === 'ADMIN' || viewer?.role === 'SUPER_ADMIN') && (await hasVerifiedMfaCookie(viewerId));
    }
    if (!canPreview) {
      notFound();
    }
  }

  // Obfuscate owner contact details and documents for the initial server render
  const sanitizedListing = {
    ...listing,
    owner: {
      name: listing.owner.name,
      // Only a yes/no for the badge: the owner's id and role are not sent to the browser
      verified: Boolean(listing.owner.phoneVerified),
      phone: '[Hidden — Click Interested to Contact]',
      email: '[Hidden — Click Interested to Contact]',
    },
    fullAddress: '[Hidden — Click Interested to Contact]',
    latitude: null,
    longitude: null,
    documents: [],
  };

  // Compile JSON-LD Schema
  const primaryImage = listing.images.find((img) => img.isPrimary) || listing.images[0];
  const price = parseFloat(listing.askingPrice.toString());
  const isRent = listing.listingFor === 'RENT';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    'name': listing.title,
    'description': listing.description || '',
    'url': absoluteUrl(`/property/${listing.id}`),
    ...(primaryImage?.imageUrl ? { 'image': absoluteUrl(primaryImage.imageUrl) } : {}),
    'datePosted': listing.createdAt.toISOString(),
    'offers': {
      '@type': 'Offer',
      'price': price,
      'priceCurrency': 'INR',
      'businessFunction': isRent ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
      ...(isRent
        ? {
            'priceSpecification': {
              '@type': 'UnitPriceSpecification',
              'price': price,
              'priceCurrency': 'INR',
              'unitCode': 'MON',
            },
          }
        : {}),
    },
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': listing.locality,
      'addressRegion': listing.city,
      'postalCode': listing.pinCode,
      'addressCountry': 'IN',
    },
  };

  const breadcrumbs = [
    { label: listing.city, href: `/listings?city=${encodeURIComponent(listing.city)}` },
    { label: listing.locality, href: `/listings?city=${encodeURIComponent(listing.city)}&locality=${encodeURIComponent(listing.locality)}` },
    { label: listing.title }
  ];

  return (
    <>
      {/* Inject JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <PropertyClient
        listingId={id}
        initialListing={sanitizedListing}
        breadcrumbs={
          <div className={styles.breadcrumbBar}>
            <Breadcrumbs items={breadcrumbs} />
          </div>
        }
      />
    </>
  );
}
