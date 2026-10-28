import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  LISTING_DOCUMENTS_BUCKET,
  LISTING_IMAGES_BUCKET,
  LISTING_VIDEOS_BUCKET,
  MAX_LISTING_DOCUMENTS,
  MAX_LISTING_IMAGES,
  MAX_LISTING_VIDEOS,
} from '@/lib/upload-rules';
import { DocType } from '@prisma/client';
import { hasAdminAccess } from '@/lib/admin-permissions';
import { hasVerifiedMfaCookie } from '@/lib/admin-mfa';

interface ImagePayload {
  imageUrl: string;
  imageType?: string;
}

interface DocumentPayload {
  docType?: string;
  docName: string;
  docUrl: string;
}

interface VideoPayload {
  videoUrl: string;
  videoType?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS_PER_REQUEST = 100;

/**
 * Only the listing owner or an admin may change a listing's media.
 * Returns null when authorized, otherwise the response to send.
 */
async function authorize(listingId: string): Promise<NextResponse | null> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!UUID_RE.test(listingId)) {
    return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { ownerId: true },
  });
  if (!listing) {
    return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
  }
  if (listing.ownerId === userId) return null;

  const requesterProfile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true, roleMetadata: true },
  });
  if (hasAdminAccess(requesterProfile, 'listings') && (await hasVerifiedMfaCookie(userId))) {
    return null;
  }
  return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
}

/**
 * Returns the storage path (inside `bucket`) for a public Storage URL that
 * points into this listing's own folder, or null for any other URL.
 */
function ownStoragePath(publicUrl: string, bucket: string, listingId: string, kind: string): string | null {
  let url: URL;
  try {
    url = new URL(publicUrl);
  } catch {
    return null;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      if (url.host !== new URL(supabaseUrl).host) return null;
    } catch {
      return null;
    }
  }
  const marker = `/storage/v1/object/public/${bucket}/`;
  if (!url.pathname.startsWith(marker)) return null;
  let path: string;
  try {
    path = decodeURIComponent(url.pathname.slice(marker.length));
  } catch {
    return null;
  }
  const prefix = `properties/${listingId}/${kind}/`;
  if (!path.startsWith(prefix) || path.includes('..') || path.slice(prefix.length).includes('/')) {
    return null;
  }
  return path;
}

/** Best-effort removal of storage objects; a failure is logged, never thrown. */
async function removeStorageObjects(bucket: string, paths: string[]) {
  if (paths.length === 0) return;
  try {
    const { error } = await createAdminClient().storage.from(bucket).remove(paths);
    if (error) console.error(`[listings/id/media] storage remove failed (${bucket}):`, error);
  } catch (err) {
    console.error(`[listings/id/media] storage remove failed (${bucket}):`, err);
  }
}

/** Accepts an array of UUID strings, de-duplicated; returns null if malformed. */
function parseIdList(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_IDS_PER_REQUEST) return null;
  const ids: string[] = [];
  for (const v of value) {
    if (typeof v !== 'string' || !UUID_RE.test(v)) return null;
    if (!ids.includes(v)) ids.push(v);
  }
  return ids;
}

/**
 * Makes display order contiguous and the first image the only cover photo.
 * `orderedIds` puts those images first, in that order; the rest keep
 * their current relative order after them.
 */
async function normalizeImageOrder(listingId: string, orderedIds: string[] = []) {
  const images = await prisma.listingImage.findMany({
    where: { listingId },
    orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, displayOrder: true, isPrimary: true },
  });
  const byId = new Map(images.map((img) => [img.id, img]));
  const first = orderedIds.filter((imgId) => byId.has(imgId));
  const rest = images.filter((img) => !first.includes(img.id)).map((img) => img.id);
  const finalOrder = [...first, ...rest];

  const updates = finalOrder
    .map((imgId, index) => ({ img: byId.get(imgId)!, index }))
    .filter(({ img, index }) => img.displayOrder !== index || img.isPrimary !== (index === 0))
    .map(({ img, index }) =>
      prisma.listingImage.update({
        where: { id: img.id },
        data: { displayOrder: index, isPrimary: index === 0 },
      })
    );
  if (updates.length) await prisma.$transaction(updates);

  return prisma.listingImage.findMany({
    where: { listingId },
    orderBy: { displayOrder: 'asc' },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const denied = await authorize(id);
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
    }
    const rawImages = Array.isArray(body.images) ? (body.images as ImagePayload[]) : [];
    const rawDocuments = Array.isArray(body.documents) ? (body.documents as DocumentPayload[]) : [];
    const rawVideos = Array.isArray(body.videos) ? (body.videos as VideoPayload[]) : [];

    // Images must be files uploaded to this listing's own folder in the public
    // images bucket (no third-party hotlinks, tracking pixels or data: URLs).
    const images = rawImages.filter(
      (img) =>
        typeof img?.imageUrl === 'string' &&
        ownStoragePath(img.imageUrl.trim(), LISTING_IMAGES_BUCKET, id, 'images') !== null
    );
    // Documents are private storage paths, and must live under this listing's folder.
    const docPrefix = `properties/${id}/documents/`;
    const documents = rawDocuments.filter(
      (doc) =>
        typeof doc?.docUrl === 'string' &&
        doc.docUrl.trim().startsWith(docPrefix) &&
        !doc.docUrl.includes('..')
    );
    if (images.length !== rawImages.length || documents.length !== rawDocuments.length) {
      return NextResponse.json({ message: 'Invalid image or document reference' }, { status: 400 });
    }

    // Validate and sanitize videos
    const validVideos: VideoPayload[] = [];
    for (const vid of rawVideos) {
      if (typeof vid?.videoUrl === 'string' && vid.videoUrl.trim().length > 0) {
        const trimmed = vid.videoUrl.trim();
        if (!/^https?:\/\//i.test(trimmed)) {
          return NextResponse.json(
            { message: 'Video URL must start with http:// or https://' },
            { status: 400 }
          );
        }
        try {
          new URL(trimmed);
          validVideos.push({
            videoUrl: trimmed.slice(0, 2048),
            videoType: vid.videoType?.trim() || 'walkthrough',
          });
        } catch {
          return NextResponse.json(
            { message: 'Invalid video URL format' },
            { status: 400 }
          );
        }
      }
    }

    // Per-listing caps, so the endpoint cannot be used to attach unbounded files.
    const [imageCount, documentCount, videoCount] = await Promise.all([
      images.length ? prisma.listingImage.count({ where: { listingId: id } }) : Promise.resolve(0),
      documents.length ? prisma.listingDocument.count({ where: { listingId: id } }) : Promise.resolve(0),
      validVideos.length && !body.replaceVideos ? prisma.listingVideo.count({ where: { listingId: id } }) : Promise.resolve(0),
    ]);
    if (imageCount + images.length > MAX_LISTING_IMAGES) {
      return NextResponse.json({ message: `A listing can have at most ${MAX_LISTING_IMAGES} photos` }, { status: 400 });
    }
    if (documentCount + documents.length > MAX_LISTING_DOCUMENTS) {
      return NextResponse.json({ message: `A listing can have at most ${MAX_LISTING_DOCUMENTS} documents` }, { status: 400 });
    }
    if (videoCount + validVideos.length > MAX_LISTING_VIDEOS) {
      return NextResponse.json({ message: `A listing can have at most ${MAX_LISTING_VIDEOS} videos` }, { status: 400 });
    }

    // The server decides placement: new photos go after the existing ones, and
    // the first photo only becomes the cover when the listing has no cover yet.
    let createdImages: Awaited<ReturnType<typeof prisma.listingImage.createManyAndReturn>> = [];
    if (images.length) {
      const [last, primaryCount] = await Promise.all([
        prisma.listingImage.findFirst({
          where: { listingId: id },
          orderBy: { displayOrder: 'desc' },
          select: { displayOrder: true },
        }),
        prisma.listingImage.count({ where: { listingId: id, isPrimary: true } }),
      ]);
      const startOrder = last ? last.displayOrder + 1 : 0;
      createdImages = await prisma.listingImage.createManyAndReturn({
        data: images.map((image, index) => ({
          listingId: id,
          imageUrl: image.imageUrl.trim(),
          imageType:
            typeof image.imageType === 'string' && /^[a-z_]{1,30}$/.test(image.imageType)
              ? image.imageType
              : 'photo',
          displayOrder: startOrder + index,
          isPrimary: primaryCount === 0 && index === 0,
        })),
      });
    }

    const createdDocuments = documents.length
      ? await prisma.listingDocument.createManyAndReturn({
          data: documents.map((document) => ({
            listingId: id,
            docType: (Object.values(DocType) as string[]).includes((document.docType || '').toUpperCase())
              ? ((document.docType as string).toUpperCase() as DocType)
              : DocType.OTHER,
            docName: String(document.docName || 'Document').slice(0, 255),
            docUrl: document.docUrl.trim(),
          })),
        })
      : [];

    let createdVideos: Awaited<ReturnType<typeof prisma.listingVideo.createManyAndReturn>> = [];
    let replacedVideoUrls: string[] = [];
    if (body.replaceVideos || validVideos.length > 0) {
      const result = await prisma.$transaction(async (tx) => {
        let removed: string[] = [];
        if (body.replaceVideos) {
          const existing = await tx.listingVideo.findMany({
            where: { listingId: id },
            select: { videoUrl: true },
          });
          removed = existing.map((v) => v.videoUrl);
          await tx.listingVideo.deleteMany({
            where: { listingId: id },
          });
        }
        const created = validVideos.length > 0
          ? await tx.listingVideo.createManyAndReturn({
              data: validVideos.map((video) => ({
                listingId: id,
                videoUrl: video.videoUrl,
                videoType: video.videoType || 'walkthrough',
              })),
            })
          : [];
        return { created, removed };
      });
      createdVideos = result.created;
      replacedVideoUrls = result.removed;
    }

    // Replaced uploaded videos are deleted from Storage only after the DB
    // change has committed, so an abandoned edit never breaks the live video.
    if (replacedVideoUrls.length) {
      const keep = new Set(validVideos.map((v) => v.videoUrl));
      const paths = replacedVideoUrls
        .filter((url) => !keep.has(url))
        .map((url) => ownStoragePath(url, LISTING_VIDEOS_BUCKET, id, 'videos'))
        .filter((p): p is string => p !== null);
      await removeStorageObjects(LISTING_VIDEOS_BUCKET, paths);
    }

    return NextResponse.json({
      message: 'Listing media saved successfully',
      images: createdImages,
      documents: createdDocuments,
      videos: createdVideos,
    });
  } catch (error: unknown) {
    console.error('[listings/id/media POST] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Reorders photos. Body: { imageOrder: string[] } — image ids in the wanted
 * order. The first image becomes the cover; images not listed keep their
 * relative order after the listed ones.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const denied = await authorize(id);
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const imageOrder = parseIdList(body?.imageOrder);
    if (!imageOrder || imageOrder.length === 0) {
      return NextResponse.json({ message: 'imageOrder must be a list of photo ids' }, { status: 400 });
    }

    const owned = await prisma.listingImage.count({
      where: { listingId: id, id: { in: imageOrder } },
    });
    if (owned !== imageOrder.length) {
      return NextResponse.json({ message: 'One or more photos do not belong to this listing' }, { status: 400 });
    }

    const images = await normalizeImageOrder(id, imageOrder);
    return NextResponse.json({ message: 'Photo order updated', images });
  } catch (error: unknown) {
    console.error('[listings/id/media PATCH] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Deletes photos and/or ownership documents (DB rows plus Storage objects).
 * Body: { imageIds?: string[], documentIds?: string[] }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const denied = await authorize(id);
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const imageIds = parseIdList(body?.imageIds);
    const documentIds = parseIdList(body?.documentIds);
    if (!imageIds || !documentIds || imageIds.length + documentIds.length === 0) {
      return NextResponse.json({ message: 'Nothing to delete' }, { status: 400 });
    }

    const [images, documents] = await Promise.all([
      imageIds.length
        ? prisma.listingImage.findMany({
            where: { listingId: id, id: { in: imageIds } },
            select: { id: true, imageUrl: true },
          })
        : Promise.resolve([]),
      documentIds.length
        ? prisma.listingDocument.findMany({
            where: { listingId: id, id: { in: documentIds } },
            select: { id: true, docUrl: true },
          })
        : Promise.resolve([]),
    ]);
    if (images.length !== imageIds.length || documents.length !== documentIds.length) {
      return NextResponse.json({ message: 'One or more files do not belong to this listing' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.listingImage.deleteMany({ where: { listingId: id, id: { in: imageIds } } }),
      prisma.listingDocument.deleteMany({ where: { listingId: id, id: { in: documentIds } } }),
    ]);

    // Only files inside this listing's own folders are removed from Storage.
    const imagePaths = images
      .map((img) => ownStoragePath(img.imageUrl, LISTING_IMAGES_BUCKET, id, 'images'))
      .filter((p): p is string => p !== null);
    const docPrefix = `properties/${id}/documents/`;
    const docPaths = documents
      .map((doc) => doc.docUrl)
      .filter(
        (p) => p.startsWith(docPrefix) && !p.includes('..') && !p.slice(docPrefix.length).includes('/')
      );
    await Promise.all([
      removeStorageObjects(LISTING_IMAGES_BUCKET, imagePaths),
      removeStorageObjects(LISTING_DOCUMENTS_BUCKET, docPaths),
    ]);

    // Keep exactly one cover photo after a deletion.
    const remainingImages = imageIds.length ? await normalizeImageOrder(id) : undefined;

    return NextResponse.json({
      message: 'Deleted successfully',
      deletedImageIds: images.map((img) => img.id),
      deletedDocumentIds: documents.map((doc) => doc.id),
      images: remainingImages,
    });
  } catch (error: unknown) {
    console.error('[listings/id/media DELETE] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
