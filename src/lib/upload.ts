/**
 * File upload helper library for ListMe.
 * Handles client-side validations (mime-types, file sizes)
 * and defines storage paths.
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

export const LISTING_IMAGES_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_LISTING_IMAGES_BUCKET || 'listing-images';
export const LISTING_DOCUMENTS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_LISTING_DOCUMENTS_BUCKET || 'listing-documents';

/**
 * Validates an image file before upload
 */
export const validateImage = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG and WEBP images are allowed.' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'Image size cannot exceed 5MB.' };
  }
  return { valid: true };
};

/**
 * Validates a document file before upload
 */
export const validateDocument = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only PDF, JPEG and PNG documents are allowed.' };
  }
  if (file.size > MAX_DOC_SIZE) {
    return { valid: false, error: 'Document size cannot exceed 10MB.' };
  }
  return { valid: true };
};

/**
 * Generates a clean, unique file name for storage
 */
export const generateFileName = (originalName: string): string => {
  const extension = originalName.split('.').pop();
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomString}.${extension}`;
};

/**
 * Generates the storage path for a property listing image
 */
export const getListingImagePath = (listingId: string, fileName: string): string => {
  return `properties/${listingId}/images/${fileName}`;
};

/**
 * Generates the storage path for a property listing document
 */
export const getListingDocPath = (listingId: string, fileName: string): string => {
  return `properties/${listingId}/documents/${fileName}`;
};
