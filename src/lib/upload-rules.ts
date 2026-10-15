/**
 * Upload limits and bucket names shared by the browser and the server
 * (kept free of browser-only imports so API routes can use them).
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/ogg',
];

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export const LISTING_IMAGES_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_LISTING_IMAGES_BUCKET || 'listing-images';
export const LISTING_DOCUMENTS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_LISTING_DOCUMENTS_BUCKET || 'listing-documents';
export const LISTING_VIDEOS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_LISTING_VIDEOS_BUCKET || 'listing-videos';
