import {
  ListingFor,
  PropertyType,
  Furnishing,
  Possession,
  Ownership,
  Parking,
} from '@prisma/client';
import { isUuid } from './ids';

/**
 * Server-side checks for listing create/update bodies. Only the fields that
 * are present are checked, so the same function serves partial updates.
 * Returns an error message for the first problem found, or null.
 */

// Decimal(15,2) for askingPrice and Decimal(10,2) for the other money columns.
const MAX_ASKING_PRICE = 1e12; // ₹1 lakh crore, well inside Decimal(15,2)
const MAX_SMALL_MONEY = 99_999_999; // fits Decimal(10,2)
const MAX_AREA = 100_000_000; // sq ft
const MAX_COUNT = 1000;

const TEXT_LIMITS: Record<string, number> = {
  title: 200,
  description: 10_000,
  city: 100,
  locality: 150,
  subLocality: 150,
  fullAddress: 500,
  landmark: 200,
  facing: 50,
  possessionDate: 50,
  ageOfProperty: 50,
  waterSupply: 100,
  powerBackup: 100,
  reraNumber: 100,
};

const INT_FIELDS = ['bedrooms', 'bathrooms', 'balconies', 'floorNumber', 'totalFloors', 'parkingCount'];
const AREA_FIELDS = ['carpetArea', 'builtUpArea', 'superBuiltUpArea', 'plotArea'];
const SMALL_MONEY_FIELDS = ['pricePerSqft', 'maintenanceCharges', 'securityDeposit'];

const ENUM_FIELDS: Record<string, Record<string, string>> = {
  listingFor: ListingFor,
  propertyType: PropertyType,
  furnishing: Furnishing,
  possession: Possession,
  ownership: Ownership,
  parking: Parking,
};

export const MAX_KEY_HIGHLIGHTS = 20;
const MAX_HIGHLIGHT_LENGTH = 200;
const MAX_AMENITIES = 100;

const isBlank = (v: unknown) => v === undefined || v === null || v === '';

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v.trim());
  return NaN;
}

/** Normalises an enum input ('sale', 'Power_of_Attorney', ...) to the Prisma value, or null. */
export function toListingEnum<T extends Record<string, string>>(enumObj: T, v: unknown): T[keyof T] | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const upper = v.trim().toUpperCase() === 'POWER_OF_ATTORNEY' ? 'POA' : v.trim().toUpperCase();
  return (Object.values(enumObj) as string[]).includes(upper) ? (upper as T[keyof T]) : null;
}

export function validateListingInput(body: Record<string, unknown>, { requireCore }: { requireCore: boolean }): string | null {
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key) && !isBlank(body[key]);

  if (requireCore) {
    for (const key of ['listingFor', 'propertyType', 'title', 'city', 'locality', 'pinCode', 'fullAddress', 'askingPrice']) {
      if (!has(key) || (typeof body[key] === 'string' && !(body[key] as string).trim())) {
        return 'Missing required property details';
      }
    }
  }

  for (const [key, max] of Object.entries(TEXT_LIMITS)) {
    if (!has(key)) continue;
    if (typeof body[key] !== 'string') return `Invalid ${key}`;
    if ((body[key] as string).length > max) return `${key} is too long (max ${max} characters)`;
  }

  for (const [key, enumObj] of Object.entries(ENUM_FIELDS)) {
    if (has(key) && toListingEnum(enumObj, body[key]) === null) return `Invalid ${key}`;
  }

  if (has('pinCode')) {
    const pin = typeof body.pinCode === 'number' ? String(body.pinCode) : body.pinCode;
    if (typeof pin !== 'string' || !/^\d{6}$/.test(pin.trim())) return 'PIN code must be 6 digits';
  }

  if (has('askingPrice')) {
    const price = toNumber(body.askingPrice);
    if (!Number.isFinite(price) || price <= 0 || price > MAX_ASKING_PRICE) {
      return 'Asking price must be a positive amount';
    }
  }

  for (const key of SMALL_MONEY_FIELDS) {
    if (!has(key)) continue;
    const n = toNumber(body[key]);
    if (!Number.isFinite(n) || n < 0 || n > MAX_SMALL_MONEY) return `Invalid ${key}`;
  }

  for (const key of AREA_FIELDS) {
    if (!has(key)) continue;
    const n = toNumber(body[key]);
    if (!Number.isFinite(n) || n < 0 || n > MAX_AREA) return `Invalid ${key}`;
  }

  for (const key of INT_FIELDS) {
    if (!has(key)) continue;
    const n = toNumber(body[key]);
    // Floor numbers may be negative (basement).
    const min = key === 'floorNumber' ? -10 : 0;
    if (!Number.isFinite(n) || n < min || n > MAX_COUNT) return `Invalid ${key}`;
  }

  if (has('latitude')) {
    const n = toNumber(body.latitude);
    if (!Number.isFinite(n) || n < -90 || n > 90) return 'Invalid latitude';
  }
  if (has('longitude')) {
    const n = toNumber(body.longitude);
    if (!Number.isFinite(n) || n < -180 || n > 180) return 'Invalid longitude';
  }

  if (has('keyHighlights')) {
    const list = body.keyHighlights;
    if (!Array.isArray(list) || list.length > MAX_KEY_HIGHLIGHTS) {
      return `Up to ${MAX_KEY_HIGHLIGHTS} key highlights are allowed`;
    }
    if (list.some((h) => typeof h !== 'string' || h.length > MAX_HIGHLIGHT_LENGTH)) {
      return `Each key highlight must be text of at most ${MAX_HIGHLIGHT_LENGTH} characters`;
    }
  }

  if (has('amenities')) {
    const list = body.amenities;
    if (!Array.isArray(list) || list.length > MAX_AMENITIES || !list.every(isUuid)) {
      return 'Invalid amenities';
    }
  }

  return null;
}

/** Trims highlights and drops blanks so the public page never renders empty bullets. */
export function cleanKeyHighlights(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((h) => String(h ?? '').trim()).filter(Boolean).slice(0, MAX_KEY_HIGHLIGHTS);
}
