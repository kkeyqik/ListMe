/**
 * India Post PIN Code & Location Resolver with Smart Name Sanitization & In-Memory Cache
 */

export interface PincodeLocationResult {
  pinCode: string;
  city: string;
  state: string;
  district: string;
  localities: string[];
}

// In-memory cache for ultra-fast (1ms) repeat lookups.
// Bounded (oldest entry evicted first) so PIN enumeration cannot grow memory
// without limit. `data: null` caches a PIN that India Post says does not exist.
const pincodeCache = new Map<string, { data: PincodeLocationResult | null; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for unknown PINs
const MAX_CACHE_ENTRIES = 5000;

function cacheSet(pin: string, data: PincodeLocationResult | null, ttlMs: number) {
  pincodeCache.delete(pin);
  if (pincodeCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = pincodeCache.keys().next().value;
    if (oldest !== undefined) pincodeCache.delete(oldest);
  }
  pincodeCache.set(pin, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Strips government postal acronyms and parenthetical city tags to produce clean real estate neighborhood names
 * e.g. "Indiranagar (Bangalore)" -> "Indiranagar"
 * e.g. "Bharat Nagar (Ghaziabad)" -> "Bharat Nagar"
 * e.g. "Connaught Place S.O" -> "Connaught Place"
 * e.g. "Baroda House Post Office" -> "Baroda House"
 */
export function cleanLocalityName(rawName: string, district?: string): string {
  if (!rawName) return '';
  let name = rawName.trim();

  // 1. Remove parenthetical city/district suffixes: "Indiranagar (Bangalore)" -> "Indiranagar"
  name = name.replace(/\s*\([^)]*\)/g, '').trim();

  // 2. Strip postal abbreviations and words
  name = name.replace(/\b(S\.O|B\.O|H\.O|SO|BO|HO|Post\s*Office|G\.P\.O|GPO|Sub\s*Office|Branch\s*Office)\b/gi, '').trim();

  // 3. Remove leading or trailing punctuation and clean extra spaces
  name = name.replace(/^[-,\s/]+|[-,\s/]+$/g, '').replace(/\s{2,}/g, ' ');

  // 4. Strip redundant trailing district name if present e.g. "Whitefield Bangalore" -> "Whitefield"
  if (district && district.length > 2 && name.toLowerCase().endsWith(district.toLowerCase())) {
    const candidate = name.slice(0, -district.length).trim();
    if (candidate.length > 2) {
      name = candidate;
    }
  }

  return name || rawName.trim();
}

/**
 * Normalizes city/district names to common consumer-facing city names
 */
export function normalizeCityName(district: string, state?: string): string {
  if (!district) return '';
  const trimmed = district.trim();
  const lower = trimmed.toLowerCase();

  // Common metro area mappings
  if (lower.includes('delhi')) {
    return 'Delhi NCR';
  }
  if (lower === 'bengaluru' || lower === 'bengaluru urban' || lower === 'bangalore urban') {
    return 'Bangalore';
  }
  if (lower === 'mumbai' || lower === 'mumbai suburban' || lower === 'mumbai city') {
    return 'Mumbai';
  }
  if (lower === 'hyderabad' || lower === 'rangareddy' || lower === 'ranga reddy' || lower === 'medchal') {
    return 'Hyderabad';
  }
  if (lower === 'pune') {
    return 'Pune';
  }
  if (lower === 'chennai') {
    return 'Chennai';
  }
  if (lower === 'gautam buddha nagar' || lower === 'gb nagar') {
    return 'Noida';
  }
  if (lower === 'gurgaon' || lower === 'gurugram') {
    return 'Gurgaon';
  }
  if (lower === 'ghaziabad') {
    return 'Ghaziabad';
  }
  if (lower === 'faridabad') {
    return 'Faridabad';
  }
  if (lower === 'kolkata') {
    return 'Kolkata';
  }
  if (lower === 'ahmedabad') {
    return 'Ahmedabad';
  }
  if (lower === 'jaipur') {
    return 'Jaipur';
  }
  if (lower === 'lucknow') {
    return 'Lucknow';
  }

  // Fallback: capitalize clean words
  return trimmed
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Resolves a 6-digit Indian PIN code using India Post API with sanitization & caching
 */
export async function lookupPinCode(pinCode: string): Promise<PincodeLocationResult | null> {
  const cleanPin = pinCode.replace(/\D/g, '');
  if (cleanPin.length !== 6) {
    return null;
  }

  // 1. Check in-memory cache
  const cached = pincodeCache.get(cleanPin);
  if (cached && cached.expiresAt > Date.now()) {
    // Refresh recency so frequently used PINs are evicted last
    pincodeCache.delete(cleanPin);
    pincodeCache.set(cleanPin, cached);
    return cached.data;
  }
  if (cached) pincodeCache.delete(cleanPin);

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    // India Post answers Status 'Error' for PINs that do not exist: remember that
    // for a while so repeated lookups do not hit the upstream API again.
    if (data[0].Status !== 'Success') {
      if (data[0].Status === 'Error') cacheSet(cleanPin, null, NEGATIVE_CACHE_TTL_MS);
      return null;
    }

    const postOffices: any[] = data[0].PostOffice || [];
    if (postOffices.length === 0) {
      cacheSet(cleanPin, null, NEGATIVE_CACHE_TTL_MS);
      return null;
    }

    const firstOffice = postOffices[0];
    const rawDistrict = firstOffice.District || '';
    const rawState = firstOffice.State || '';
    const cleanCity = normalizeCityName(rawDistrict, rawState);

    // Collect and deduplicate clean locality names
    const localitySet = new Set<string>();
    for (const po of postOffices) {
      const cleanLoc = cleanLocalityName(po.Name, rawDistrict);
      if (cleanLoc && cleanLoc.length > 1) {
        localitySet.add(cleanLoc);
      }
    }

    const localities = Array.from(localitySet).sort((a, b) => a.localeCompare(b));

    const result: PincodeLocationResult = {
      pinCode: cleanPin,
      city: cleanCity,
      district: rawDistrict,
      state: rawState,
      localities,
    };

    // Cache result
    cacheSet(cleanPin, result, CACHE_TTL_MS);

    return result;
  } catch (error) {
    console.error(`[pincode] Lookup failed for ${cleanPin}:`, error);
    return null;
  }
}
