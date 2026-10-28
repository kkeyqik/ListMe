import type { Metadata } from 'next';

/**
 * Default social sharing image (1200x630). A route that sets `openGraph` replaces the
 * parent's whole openGraph object (Next merges metadata shallowly), so each page has to
 * repeat the image; use `pageMetadata()` to build it consistently.
 */
export const DEFAULT_OG_IMAGE = {
  url: '/images/og-default.jpg',
  width: 1200,
  height: 630,
  alt: 'ListMe: direct-owner property listings in India',
};

export function pageMetadata({
  title,
  description,
  path,
  socialTitle,
}: {
  title: string;
  description: string;
  /** Canonical path, e.g. "/about" */
  path: string;
  /** Shorter title for Open Graph / Twitter cards; defaults to `title` */
  socialTitle?: string;
}): Metadata {
  const cardTitle = socialTitle || title;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: cardTitle,
      description,
      url: path,
      siteName: 'ListMe',
      locale: 'en_IN',
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: cardTitle,
      description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}
