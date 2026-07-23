import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PropertyClient from './PropertyClient';

interface PropertyPageProps {
  params: Promise<{ id: string }>;
}

// 1. Generate Server-side SEO Metadata
export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
  });

  if (!listing) {
    return {
      title: 'Property Not Found — ListMe',
      description: 'The property listing you are looking for is no longer active or does not exist.',
    };
  }

  const formatVal = parseFloat(listing.askingPrice.toString());
  const priceStr = formatVal >= 10000000 
    ? `₹${(formatVal / 10000000).toFixed(2)} Cr` 
    : formatVal >= 100000 
    ? `₹${(formatVal / 100000).toFixed(2)} Lk` 
    : `₹${formatVal.toLocaleString('en-IN')}`;

  return {
    title: `${listing.title} — ${priceStr} | ListMe`,
    description: listing.description || `Verified owner property listed directly on ListMe in ${listing.locality}, ${listing.city}. Zero brokerage fees!`,
    openGraph: {
      title: `${listing.title} — ${priceStr}`,
      description: listing.description || `Direct property listing in ${listing.locality}, ${listing.city}.`,
      type: 'website',
    },
  };
}

// 2. Render Server Component Page
export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;

  // Fetch listing details including nested amenities
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { displayOrder: 'asc' } },
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
          phone: true,
          email: true,
        },
      },
    },
  });

  // If listing doesn't exist or is not active (except for owners/admins, but here we can check public status)
  if (!listing) {
    notFound();
  }

  // Obfuscate owner contact details and documents for the initial server render
  const sanitizedListing = {
    ...listing,
    owner: {
      id: listing.owner.id,
      name: listing.owner.name,
      phone: '[Hidden — Click Interested to Contact]',
      email: '[Hidden — Click Interested to Contact]',
    },
    fullAddress: '[Hidden — Click Interested to Contact]',
    documents: [],
  };

  // Compile JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    'name': listing.title,
    'description': listing.description || '',
    'datePosted': listing.createdAt.toISOString(),
    'priceCurrency': 'INR',
    'price': parseFloat(listing.askingPrice.toString()),
    'address': {
      '@type': 'PostalAddress',
      'addressLocality': listing.locality,
      'addressRegion': listing.city,
      'postalCode': listing.pinCode,
      'addressCountry': 'IN',
    },
  };

  return (
    <>
      {/* Inject JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PropertyClient listingId={id} initialListing={sanitizedListing} />
    </>
  );
}
