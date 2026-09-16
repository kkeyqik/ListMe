import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { DocType } from '@prisma/client';

interface ImagePayload {
  imageUrl: string;
  imageType?: string;
  displayOrder?: number;
  isPrimary?: boolean;
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!listing) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    let isAuthorized = listing.ownerId === userId;

    if (!isAuthorized) {
      const requesterProfile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      isAuthorized =
        requesterProfile?.role === 'ADMIN' || requesterProfile?.role === 'SUPER_ADMIN';
    }

    if (!isAuthorized) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const rawImages = Array.isArray(body.images) ? (body.images as ImagePayload[]) : [];
    const rawDocuments = Array.isArray(body.documents) ? (body.documents as DocumentPayload[]) : [];
    const rawVideos = Array.isArray(body.videos) ? (body.videos as VideoPayload[]) : [];

    // Filter valid images and documents
    const images = rawImages.filter(
      (img) => typeof img?.imageUrl === 'string' && img.imageUrl.trim().length > 0
    );
    const documents = rawDocuments.filter(
      (doc) => typeof doc?.docUrl === 'string' && doc.docUrl.trim().length > 0
    );

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

    const createdImages = images.length
      ? await prisma.listingImage.createManyAndReturn({
          data: images.map((image, index) => ({
            listingId: id,
            imageUrl: image.imageUrl.trim(),
            imageType: image.imageType || 'photo',
            displayOrder: image.displayOrder ?? index,
            isPrimary: image.isPrimary ?? index === 0,
          })),
        })
      : [];

    const createdDocuments = documents.length
      ? await prisma.listingDocument.createManyAndReturn({
          data: documents.map((document) => ({
            listingId: id,
            docType: (document.docType || 'OTHER').toUpperCase() as DocType,
            docName: document.docName || 'Document',
            docUrl: document.docUrl.trim(),
          })),
        })
      : [];

    let createdVideos: any[] = [];
    if (body.replaceVideos || validVideos.length > 0) {
      createdVideos = await prisma.$transaction(async (tx) => {
        if (body.replaceVideos) {
          await tx.listingVideo.deleteMany({
            where: { listingId: id },
          });
        }
        if (validVideos.length > 0) {
          return await tx.listingVideo.createManyAndReturn({
            data: validVideos.map((video) => ({
              listingId: id,
              videoUrl: video.videoUrl,
              videoType: video.videoType || 'walkthrough',
            })),
          });
        }
        return [];
      });
    }

    return NextResponse.json({
      message: 'Listing media saved successfully',
      images: createdImages,
      documents: createdDocuments,
      videos: createdVideos,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
