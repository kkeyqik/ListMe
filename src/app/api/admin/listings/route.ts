import { NextRequest, NextResponse } from 'next/server';
import { ListingStatus, ListingFor, PropertyType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdminModule } from '@/lib/admin-auth';

const COMMERCIAL_TYPES: PropertyType[] = [
  PropertyType.OFFICE,
  PropertyType.SHOP,
  PropertyType.WAREHOUSE,
  PropertyType.COMMERCIAL_LAND,
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STOP_WORDS = new Set(['in', 'at', 'near', 'and', 'the', 'for', 'of']);
const MAX_PAGE_SIZE = 100;

function asEnum<T extends Record<string, string>>(enumObj: T, value: string | null): T[keyof T] | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return (Object.values(enumObj) as string[]).includes(upper) ? (upper as T[keyof T]) : undefined;
}

function parseDay(value: string | null, endOfDay: boolean): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setUTCHours(23, 59, 59, 999);
  else d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/admin/listings
 *
 * Admin listing search, gated by the 'listings' module permission
 * (SUPER_ADMIN always passes). Unlike the public /api/listings it:
 * - finds a listing by its exact ID (paste a UUID into the search box),
 * - matches owner name, phone and email as well as title, description,
 *   city and locality,
 * - filters by owner (?ownerId=) for the Users page "View properties" link,
 * - never writes SEARCH rows to the activity log.
 *
 * Query: status, property_type | type=commercial, listing_for (sale|rent),
 * city, query, ownerId, startDate, endDate, sort (newest|oldest|price_asc|price_desc),
 * page, limit (max 100).
 */
export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdminModule('listings');
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('limit') || '15', 10) || 15));

    const and: Prisma.ListingWhereInput[] = [];

    const status = asEnum(ListingStatus, searchParams.get('status'));
    if (status) and.push({ status });

    if ((searchParams.get('type') || '').toLowerCase() === 'commercial') {
      and.push({ propertyType: { in: COMMERCIAL_TYPES } });
    }
    const propertyType = asEnum(PropertyType, searchParams.get('property_type'));
    if (propertyType) and.push({ propertyType });

    const listingFor = asEnum(ListingFor, searchParams.get('listing_for'));
    if (listingFor) and.push({ listingFor });

    const city = (searchParams.get('city') || '').trim();
    if (city) and.push({ city: { contains: city, mode: 'insensitive' } });

    const ownerId = searchParams.get('ownerId');
    if (ownerId) {
      if (!UUID_RE.test(ownerId)) {
        return NextResponse.json({ listings: [], meta: { page, limit, total: 0, totalPages: 1 } });
      }
      and.push({ ownerId });
    }

    const from = parseDay(searchParams.get('startDate'), false);
    const to = parseDay(searchParams.get('endDate'), true);
    if (from || to) and.push({ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });

    const query = (searchParams.get('query') || '').trim().slice(0, 200);
    if (query) {
      if (UUID_RE.test(query)) {
        // Exact listing ID, or every listing of an owner by their user ID.
        and.push({ OR: [{ id: query }, { ownerId: query }] });
      } else {
        const terms = query.split(/\s+/).filter((t) => t && !STOP_WORDS.has(t.toLowerCase()));
        for (const term of terms.length ? terms : [query]) {
          and.push({
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { description: { contains: term, mode: 'insensitive' } },
              { city: { contains: term, mode: 'insensitive' } },
              { locality: { contains: term, mode: 'insensitive' } },
              { pinCode: { contains: term } },
              { owner: { name: { contains: term, mode: 'insensitive' } } },
              { owner: { email: { contains: term, mode: 'insensitive' } } },
              { owner: { phone: { contains: term } } },
            ],
          });
        }
      }
    }

    const where: Prisma.ListingWhereInput = and.length ? { AND: and } : {};

    const sort = (searchParams.get('sort') || 'newest').toLowerCase();
    const orderBy: Prisma.ListingOrderByWithRelationInput =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'price_asc'
          ? { askingPrice: 'asc' }
          : sort === 'price_desc'
            ? { askingPrice: 'desc' }
            : { createdAt: 'desc' };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: [orderBy, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { orderBy: { displayOrder: 'asc' }, take: 20 },
          owner: { select: { id: true, name: true, email: true, phone: true, status: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return NextResponse.json({
      listings,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error: unknown) {
    console.error('[admin/listings GET] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
