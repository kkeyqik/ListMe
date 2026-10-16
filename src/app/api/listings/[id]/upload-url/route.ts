import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ALLOWED_DOC_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  LISTING_DOCUMENTS_BUCKET,
  LISTING_IMAGES_BUCKET,
  LISTING_VIDEOS_BUCKET,
  MAX_DOC_SIZE,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from '@/lib/upload-rules';

type UploadKind = 'images' | 'documents' | 'videos';

const KIND_RULES: Record<UploadKind, { bucket: string; types: string[]; maxSize: number }> = {
  images: { bucket: LISTING_IMAGES_BUCKET, types: ALLOWED_IMAGE_TYPES, maxSize: MAX_IMAGE_SIZE },
  documents: { bucket: LISTING_DOCUMENTS_BUCKET, types: ALLOWED_DOC_TYPES, maxSize: MAX_DOC_SIZE },
  videos: { bucket: LISTING_VIDEOS_BUCKET, types: ALLOWED_VIDEO_TYPES, maxSize: MAX_VIDEO_SIZE },
};

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/ogg': 'ogv',
};

function isUploadKind(value: unknown): value is UploadKind {
  return value === 'images' || value === 'documents' || value === 'videos';
}

/**
 * Returns true when the signed-in user owns the listing or is an admin.
 * Responds with the HTTP status to return otherwise.
 */
async function authorize(listingId: string): Promise<true | 401 | 403 | 404> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return 401;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { ownerId: true },
  });
  if (!listing) return 404;
  if (listing.ownerId === userId) return true;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN' ? true : 403;
}

const STATUS_MESSAGES: Record<401 | 403 | 404, string> = {
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Listing not found',
};

/**
 * Issues a one-time signed upload URL for a file in this listing's folder.
 * Storage only accepts the upload at the exact path returned here, so
 * clients never write to Storage on their own authority.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (auth !== true) {
      return NextResponse.json({ message: STATUS_MESSAGES[auth] }, { status: auth });
    }

    const body = await request.json().catch(() => null);
    const kind: unknown = body?.kind;
    const contentType: unknown = body?.contentType;
    const size: unknown = body?.size;

    if (!isUploadKind(kind)) {
      return NextResponse.json({ message: 'Invalid upload type' }, { status: 400 });
    }
    const rules = KIND_RULES[kind];
    if (typeof contentType !== 'string' || !rules.types.includes(contentType)) {
      return NextResponse.json({ message: 'File type not allowed' }, { status: 400 });
    }
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0 || size > rules.maxSize) {
      return NextResponse.json({ message: 'File is too large' }, { status: 400 });
    }

    const fileName = `${Date.now()}-${crypto.randomUUID()}.${EXTENSIONS[contentType] ?? 'bin'}`;
    const path = `properties/${id}/${kind}/${fileName}`;

    const { data, error } = await createAdminClient()
      .storage.from(rules.bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('[upload-url] createSignedUploadUrl failed:', error);
      return NextResponse.json({ message: 'Could not prepare upload' }, { status: 500 });
    }

    return NextResponse.json({ bucket: rules.bucket, path: data.path, token: data.token });
  } catch (err) {
    console.error('[upload-url] POST failed:', err);
    return NextResponse.json({ message: 'Could not prepare upload' }, { status: 500 });
  }
}

/**
 * Deletes one file from this listing's folder (owner or admin only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (auth !== true) {
      return NextResponse.json({ message: STATUS_MESSAGES[auth] }, { status: auth });
    }

    const body = await request.json().catch(() => null);
    const kind: unknown = body?.kind;
    const path: unknown = body?.path;

    if (!isUploadKind(kind)) {
      return NextResponse.json({ message: 'Invalid upload type' }, { status: 400 });
    }
    const prefix = `properties/${id}/${kind}/`;
    if (
      typeof path !== 'string' ||
      !path.startsWith(prefix) ||
      path.includes('..') ||
      path.slice(prefix.length).includes('/')
    ) {
      return NextResponse.json({ message: 'Invalid file path' }, { status: 400 });
    }

    const { error } = await createAdminClient().storage.from(KIND_RULES[kind].bucket).remove([path]);
    if (error) {
      console.error('[upload-url] remove failed:', error);
      return NextResponse.json({ message: 'Could not delete file' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[upload-url] DELETE failed:', err);
    return NextResponse.json({ message: 'Could not delete file' }, { status: 500 });
  }
}
