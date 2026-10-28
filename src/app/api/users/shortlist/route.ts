import { NextRequest, NextResponse } from 'next/server';
import { ListingStatus } from '@prisma/client';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';
import { isUuid } from '@/lib/ids';

// Saved (shortlisted) listings for the signed-in user.
// There is no unique (user_id, listing_id) constraint in the database yet, so
// writes run under a per-user advisory lock to keep one row per listing.

const MAX_SAVED = 200;
const WRITE_LIMIT = 60;
const WRITE_WINDOW_MS = 60_000;

/**
 * GET /api/users/shortlist           → { ids: string[] }
 * GET /api/users/shortlist?full=1    → { ids, listings: [...] }
 *
 * Only live listings are returned: pending, rejected or deactivated ones are not public.
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const full = request.nextUrl.searchParams.get('full') === '1';
    if (!full) {
      const rows = await prisma.shortlist.findMany({
        where: { userId, listing: { status: ListingStatus.ACTIVE } },
        orderBy: { createdAt: 'desc' },
        take: MAX_SAVED,
        select: { listingId: true },
      });
      return NextResponse.json(
        { ids: rows.map((r) => r.listingId) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const rows = await prisma.shortlist.findMany({
      where: { userId, listing: { status: ListingStatus.ACTIVE } },
      orderBy: { createdAt: 'desc' },
      take: MAX_SAVED,
      select: {
        listingId: true,
        listing: {
          select: {
            id: true,
            title: true,
            askingPrice: true,
            listingFor: true,
            propertyType: true,
            city: true,
            locality: true,
            bedrooms: true,
            carpetArea: true,
            images: {
              select: { imageUrl: true },
              orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
              take: 1,
            },
          },
        },
      },
    });

    const ids = rows.map((r) => r.listingId);
    const listings = rows.map(({ listing: { images, ...l } }) => ({
      ...l,
      askingPrice: l.askingPrice.toString(),
      imageUrl: images[0]?.imageUrl ?? null,
    }));

    return NextResponse.json({ ids, listings }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[GET /api/users/shortlist] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

async function readListingId(request: NextRequest): Promise<string | null> {
  const body = await request.json().catch(() => null);
  const listingId = (body as { listingId?: unknown } | null)?.listingId;
  return typeof listingId === 'string' && isUuid(listingId) ? listingId : null;
}

/** POST { listingId } — save an active listing. Saving twice is a no-op. */
export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const limit = rateLimit(`shortlist:${userId}`, WRITE_LIMIT, WRITE_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(limit, WRITE_LIMIT) },
    );
  }

  const listingId = await readListingId(request);
  if (!listingId) {
    return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
  }

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { status: true },
    });
    if (!listing || listing.status !== ListingStatus.ACTIVE) {
      return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`shortlist:${userId}`}))`;
      const existing = await tx.shortlist.findFirst({ where: { userId, listingId }, select: { id: true } });
      if (existing) return 'exists' as const;
      const count = await tx.shortlist.count({ where: { userId } });
      if (count >= MAX_SAVED) return 'full' as const;
      await tx.shortlist.create({ data: { userId, listingId } });
      return 'created' as const;
    });

    if (result === 'full') {
      return NextResponse.json(
        { message: `You can save up to ${MAX_SAVED} properties. Remove some to save more.` },
        { status: 400 },
      );
    }
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error('[POST /api/users/shortlist] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE { listingId } — remove a saved listing. Removing an unsaved one is a no-op. */
export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const limit = rateLimit(`shortlist:${userId}`, WRITE_LIMIT, WRITE_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(limit, WRITE_LIMIT) },
    );
  }

  const listingId = await readListingId(request);
  if (!listingId) {
    return NextResponse.json({ saved: false });
  }

  try {
    await prisma.shortlist.deleteMany({ where: { userId, listingId } });
    return NextResponse.json({ saved: false });
  } catch (error) {
    console.error('[DELETE /api/users/shortlist] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
