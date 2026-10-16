/**
 * File upload helper library for ListMe.
 * Handles client-side validations (mime-types, file sizes)
 * and defines storage paths.
 */
import imageCompression from 'browser-image-compression';

import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_DOC_SIZE,
  MAX_VIDEO_SIZE,
  LISTING_IMAGES_BUCKET,
  LISTING_DOCUMENTS_BUCKET,
  LISTING_VIDEOS_BUCKET,
} from './upload-rules';

export {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_DOC_SIZE,
  MAX_VIDEO_SIZE,
  LISTING_IMAGES_BUCKET,
  LISTING_DOCUMENTS_BUCKET,
  LISTING_VIDEOS_BUCKET,
};

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
 * Validates a video file before upload.
 * Only accepts exact MIME types in ALLOWED_VIDEO_TYPES — no wildcards or filename fallbacks.
 */
export const validateVideo = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Only MP4, WebM, MOV (QuickTime), MKV, and OGG video files are allowed.',
    };
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: 'Video file size cannot exceed 50MB.' };
  }
  return { valid: true };
};

/**
 * Generates a clean, unique file name for storage.
 * Falls back to "bin" if the original file has no recognisable extension.
 */
export const generateFileName = (originalName: string): string => {
  const parts = originalName.split('.');
  const extension = parts.length > 1 ? parts.pop()! : 'bin';
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

export type ListingUploadKind = 'images' | 'documents' | 'videos';

/**
 * Uploads a listing file through a server-issued signed upload URL, so the
 * server checks listing ownership before anything reaches Storage.
 * Returns the storage path and, for public buckets, the public URL.
 */
export const uploadListingFile = async (
  listingId: string,
  kind: ListingUploadKind,
  file: File,
  contentType: string = file.type
): Promise<{ path: string; publicUrl: string }> => {
  const res = await fetch(`/api/listings/${listingId}/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, contentType, size: file.size }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || 'Could not prepare upload');
  }

  const { bucket, path, token } = body as { bucket: string; path: string; token: string };
  const { createClient } = await import('@/lib/supabase/client');
  const storage = createClient().storage.from(bucket);
  const { error } = await storage.uploadToSignedUrl(path, token, file, { contentType });
  if (error) throw error;

  return { path, publicUrl: storage.getPublicUrl(path).data.publicUrl };
};

/**
 * Deletes one file from a listing's folder through the server.
 */
export const deleteListingFile = async (
  listingId: string,
  kind: ListingUploadKind,
  path: string
): Promise<void> => {
  const res = await fetch(`/api/listings/${listingId}/upload-url`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, path }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Could not delete file');
  }
};
