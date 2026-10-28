/**
 * Property categories offered by the owner listing forms (New and Edit share
 * this list so editing a listing can never silently change its type).
 * Covers every PropertyType value in prisma/schema.prisma.
 */
export interface PropertyCategoryOption {
  value: string;
  label: string;
}

export const RESIDENTIAL_PROPERTY_CATEGORIES: readonly PropertyCategoryOption[] = [
  { value: 'APARTMENT', label: 'Apartment / Flat' },
  { value: 'BUILDER_FLOOR', label: 'Builder Floor' },
  { value: 'HOUSE', label: 'Independent House' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'PENTHOUSE', label: 'Penthouse' },
  { value: 'STUDIO', label: 'Studio / 1 RK' },
  { value: 'FARM_HOUSE', label: 'Farm House' },
  { value: 'PLOT', label: 'Plot / Land' },
  { value: 'PG', label: 'PG / Hostel' },
];

export const COMMERCIAL_PROPERTY_CATEGORIES: readonly PropertyCategoryOption[] = [
  { value: 'OFFICE', label: 'Commercial Office' },
  { value: 'SHOP', label: 'Shop / Retail Store' },
  { value: 'WAREHOUSE', label: 'Warehouse / Godown' },
  { value: 'COMMERCIAL_LAND', label: 'Commercial Land' },
];

export const PROPERTY_CATEGORY_VALUES: readonly string[] = [
  ...RESIDENTIAL_PROPERTY_CATEGORIES,
  ...COMMERCIAL_PROPERTY_CATEGORIES,
].map((o) => o.value);

/** Land-only types: no rooms, bathrooms or furnishing. */
export const LAND_PROPERTY_TYPES: readonly string[] = ['PLOT', 'COMMERCIAL_LAND'];

export function isLandType(propertyType: string | null | undefined): boolean {
  return !!propertyType && LAND_PROPERTY_TYPES.includes(propertyType);
}

/** Ownership document types (DocType enum) offered when uploading documents. */
export const DOCUMENT_TYPE_OPTIONS: readonly PropertyCategoryOption[] = [
  { value: 'SALE_DEED', label: 'Sale Deed' },
  { value: 'TITLE_DEED', label: 'Title Deed' },
  { value: 'TAX_RECEIPT', label: 'Property Tax Receipt' },
  { value: 'ENCUMBRANCE', label: 'Encumbrance Certificate' },
  { value: 'APPROVED_PLAN', label: 'Approved Building Plan' },
  { value: 'COMPLETION_CERT', label: 'Completion Certificate' },
  { value: 'RERA_CERT', label: 'RERA Certificate' },
  { value: 'NOC', label: 'NOC' },
  { value: 'OTHER', label: 'Other' },
];
