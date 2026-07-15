import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!listing) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    let isAuthorized = listing.ownerId === user.id;

    if (!isAuthorized) {
      const requesterProfile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      isAuthorized =
        requesterProfile?.role === 'ADMIN' || requesterProfile?.role === 'SUPER_ADMIN';
    }

    if (!isAuthorized) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const images = Array.isArray(body.images) ? (body.images as ImagePayload[]) : [];
    const documents = Array.isArray(body.documents) ? (body.documents as DocumentPayload[]) : [];

    const createdImages = images.length
      ? await prisma.listingImage.createManyAndReturn({
          data: images.map((image, index) => ({
            listingId: id,
            imageUrl: image.imageUrl,
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
            docName: document.docName,
            docUrl: document.docUrl,
          })),
        })
      : [];

    return NextResponse.json({
      message: 'Listing media saved successfully',
      images: createdImages,
      documents: createdDocuments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
