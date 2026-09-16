/**
 * File upload helper library for ListMe.
 * Handles client-side validations (mime-types, file sizes)
 * and defines storage paths.
 */
import imageCompression from 'browser-image-compression';

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
 * Validates a video file before upload
 */
export const validateVideo = (file: File): { valid: boolean; error?: string } => {
  const isVideo =
    ALLOWED_VIDEO_TYPES.includes(file.type) ||
    file.type.startsWith('video/') ||
    /\.(mp4|mov|webm|mkv|avi)$/i.test(file.name);
  if (!isVideo) {
    return { valid: false, error: 'Only MP4, WebM, MOV, and standard video formats are allowed.' };
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: 'Video file size cannot exceed 50MB.' };
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

/**
 * Generates the storage path for a property listing video
 */
export const getListingVideoPath = (listingId: string, fileName: string): string => {
  return `properties/${listingId}/videos/${fileName}`;
};

/**
 * Compresses an image, strips EXIF, and converts to WebP
 */
export const processImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.8,
  };
  try {
    const compressedBlob = await imageCompression(file, options);
    // Convert Blob to File object to retain standard File semantics
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, ".webp"), {
      type: 'image/webp',
    });
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Fallback to original file on failure
  }
};
