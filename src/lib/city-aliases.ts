import type { Prisma } from '@prisma/client';

/**
 * Listings store the city as free text, and the PIN-code resolver turns any
 * Delhi district into "Delhi NCR". A search for the NCR region must also cover
 * the satellite cities that are stored under their own names.
 */
const CITY_ALIASES: Record<string, string[]> = {
  'delhi ncr': ['Delhi', 'Noida', 'Gurgaon', 'Gurugram', 'Ghaziabad', 'Faridabad'],
  ncr: ['Delhi', 'Noida', 'Gurgaon', 'Gurugram', 'Ghaziabad', 'Faridabad'],
  delhi: ['Delhi'],
  'new delhi': ['Delhi'],
  bangalore: ['Bangalore', 'Bengaluru'],
  bengaluru: ['Bangalore', 'Bengaluru'],
  gurgaon: ['Gurgaon', 'Gurugram'],
  gurugram: ['Gurgaon', 'Gurugram'],
  mumbai: ['Mumbai', 'Bombay'],
};

/** Prisma condition matching listings in `city`, including its known aliases. */
export function listingCityWhere(city: string): Prisma.ListingWhereInput {
  const trimmed = city.trim();
  const names = CITY_ALIASES[trimmed.toLowerCase()];
  if (!names) {
    return { city: { contains: trimmed, mode: 'insensitive' } };
  }
  if (names.length === 1) {
    return { city: { contains: names[0], mode: 'insensitive' } };
  }
  return { OR: names.map((name) => ({ city: { contains: name, mode: 'insensitive' as const } })) };
}
