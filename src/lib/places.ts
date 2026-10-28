/**
 * India-wide locality search (server only).
 *
 * Providers:
 *  - Photon (OpenStreetMap, https://photon.komoot.io): default, free, no key.
 *  - Google Places API (New): used instead when GOOGLE_MAPS_API_KEY is set,
 *    with Photon as the fallback if Google fails or finds nothing.
 *  - India Post (src/lib/pincode.ts): merged in when the query is a 6-digit PIN.
 *
 * Fallbacks when Google/Photon fail or return too few results:
 *  - Localities of ACTIVE listings in our own database (read-only; also run on
 *    every search so a real listing's locality is always findable).
 *  - India Post post-office search by name (api.postalpincode.in/postoffice/{name}).
 *
 * Preference order: Google > Photon > own listings > India Post.
 *
 * searchPlaces() never throws: a failing provider is logged and skipped, and
 * whatever the other providers returned is still sent back.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cleanLocalityName, lookupPinCode, normalizeCityName } from '@/lib/pincode';

export type PlaceSource = 'osm' | 'google' | 'listing' | 'indiapost';

export interface Place {
  /** Stable id: "osm:N123", "google:<placeId>", "indiapost:560038:Indiranagar" */
  id: string;
  /** What the user picked (society, sector, neighbourhood, area, ...) */
  name: string;
  /** Neighbourhood / area to store as the listing locality */
  locality: string;
  /** Smaller unit inside the locality (society, block, phase), when known */
  subLocality?: string;
  city: string;
  state: string;
  pinCode?: string;
  /** Null when the provider has no coordinates (India Post, or Google before details) */
  lat: number | null;
  lng: number | null;
  source: PlaceSource;
}

export interface SearchPlacesOptions {
  q: string;
  city?: string;
  limit?: number;
}

const USER_AGENT = 'ListMe/1.0 (+https://listme-sable.vercel.app; Indian property portal locality search)';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const INDIA_BBOX = '68.1,6.5,97.4,35.7';
const PROVIDER_TIMEOUT_MS = 3500;
// A dead Photon must not hold up the dropdown: short timeout, then the circuit breaker skips it.
const PHOTON_TIMEOUT_MS = 2500;
const INDIA_POST_TIMEOUT_MS = 3000;
const DB_TIMEOUT_MS = 2000;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 15;

// ---------------------------------------------------------------------------
// In-memory LRU cache (Map keeps insertion order; re-insert on hit)
// ---------------------------------------------------------------------------

const CACHE_MAX = 5000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry<T> = { value: T; expiresAt: number };
const globalCache = globalThis as unknown as { __placesCache?: Map<string, CacheEntry<unknown>> };
function cache(): Map<string, CacheEntry<unknown>> {
  if (!globalCache.__placesCache) globalCache.__placesCache = new Map();
  return globalCache.__placesCache;
}

function cacheGet<T>(key: string): T | undefined {
  const store = cache();
  const hit = store.get(key);
  if (!hit) return undefined;
  store.delete(key);
  if (hit.expiresAt <= Date.now()) return undefined;
  store.set(key, hit);
  return hit.value as T;
}

function cacheSet<T>(key: string, value: T, ttlMs = CACHE_TTL_MS) {
  const store = cache();
  store.delete(key);
  while (store.size >= CACHE_MAX) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lowercase and strip spaces/punctuation: "Indira Nagar" === "indiranagar". */
export function normalizePlaceText(s: string | null | undefined): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function clean(s: unknown): string {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '';
}

function validPin(s: unknown): string | undefined {
  const digits = typeof s === 'string' ? s.replace(/\s/g, '') : '';
  return /^[1-9]\d{5}$/.test(digits) ? digits : undefined;
}

/**
 * OSM puts the taluka / tehsil / city sub-district in "county"
 * ("Bangalore East", "Pune City Subdistrict", "Dhule Taluka"): reduce it to a city name.
 */
function cityFromCounty(county: string): string {
  let c = county
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(taluka|taluk|taluku|tahsil|tehsil|tehasil|mandal|subdistrict|sub-district|sub district|block|circle|division)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  c = c.replace(/\s+(north|south|east|west|central|city|rural|urban)$/i, '').trim();
  c = c.replace(/\s+(north|south|east|west|central|city|rural|urban)$/i, '').trim();
  return c;
}

/** Map provider city names to the names ListMe already uses (Bengaluru -> Bangalore, ...). */
function normalizeCity(raw: string, state: string): string {
  const name = clean(raw);
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower === 'bangalore' || lower === 'bengaluru') return 'Bangalore';
  if (lower === 'gurugram') return 'Gurgaon';
  if (lower === 'bombay') return 'Mumbai';
  if (lower === 'new delhi') return normalizeCityName('Delhi', state);
  // Keep the provider's own casing ("Navi Mumbai", "Pimpri-Chinchwad") unless it is all-caps/lowercase.
  if (name === name.toUpperCase() || name === name.toLowerCase()) return normalizeCityName(name, state);
  const mapped = normalizeCityName(name, state);
  return mapped.toLowerCase() === lower ? name : mapped;
}

// A small set of metro centres for the optional city bias (Photon lat/lon bias).
const CITY_CENTRES: Record<string, [number, number]> = {
  bangalore: [12.9716, 77.5946],
  bengaluru: [12.9716, 77.5946],
  mumbai: [19.076, 72.8777],
  'navi mumbai': [19.033, 73.0297],
  thane: [19.2183, 72.9781],
  pune: [18.5204, 73.8567],
  'delhi ncr': [28.6139, 77.209],
  delhi: [28.6139, 77.209],
  'new delhi': [28.6139, 77.209],
  noida: [28.5355, 77.391],
  gurgaon: [28.4595, 77.0266],
  gurugram: [28.4595, 77.0266],
  ghaziabad: [28.6692, 77.4538],
  faridabad: [28.4089, 77.3178],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  ahmedabad: [23.0225, 72.5714],
  jaipur: [26.9124, 75.7873],
  lucknow: [26.8467, 80.9462],
  chandigarh: [30.7333, 76.7794],
  kochi: [9.9312, 76.2673],
  indore: [22.7196, 75.8577],
  surat: [21.1702, 72.8311],
  coimbatore: [11.0168, 76.9558],
  nagpur: [21.1458, 79.0882],
};

function cityMatches(placeCity: string, wanted: string): boolean {
  const a = normalizePlaceText(placeCity);
  const b = normalizePlaceText(wanted);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const ncr = ['delhincr', 'delhi', 'newdelhi', 'noida', 'gurgaon', 'gurugram', 'ghaziabad', 'faridabad', 'greaternoida'];
  if ((b === 'delhincr' || b === 'ncr') && ncr.includes(a)) return true;
  const pairs: string[][] = [['bangalore', 'bengaluru'], ['gurgaon', 'gurugram'], ['mumbai', 'bombay']];
  return pairs.some((p) => p.includes(a) && p.includes(b));
}

// ---------------------------------------------------------------------------
// Photon (OpenStreetMap)
// ---------------------------------------------------------------------------

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
}

// Area-like OSM place values, best first.
const PLACE_RANK: Record<string, number> = {
  suburb: 0,
  neighbourhood: 0,
  quarter: 0,
  borough: 0,
  locality: 0,
  city_block: 0,
  residential: 0, // landuse=residential (societies, colonies)
  administrative: 0, // boundary=administrative at ward / area level
  town: 1,
  city: 1,
  village: 2,
  hamlet: 2,
  isolated_dwelling: 3,
  postcode: 1,
};

// Ward / zone names are administrative, not what people call the area.
const ADMIN_AREA_RE = /\b(ward|zone|division|circle|municipal|corporation|panchayat|tehsil|taluk|mandal)\b|^\d+$/i;
// Names that are themselves an area (sector, block, layout, nagar, ...), never a society.
const AREA_NAME_RE = /\b(sector|phase|block|stage|layout|nagar|colony|enclave|vihar|extension|extn|puram|khand|garden|gardens|bagh|ganj|market|road|village|town)\b/i;
// Names that look like a housing project / society.
const SOCIETY_NAME_RE = /\b(apartments?|residency|residences?|heights|towers?|society|chs|complex|homes|villas?|county|greens?|meadows|palms|estate|prestige|sobha|brigade|godrej|lodha|dlf|purva|mantri|hiranandani|shapoorji|tata|mahindra|kolte|ats|supertech|gaur|mahagun|jaypee|omaxe|ajnara|amrapali)\b/i;

function photonPlace(f: PhotonFeature, rankOut: { rank: number }): Place | null {
  const p = f.properties || {};
  const coords = f.geometry?.coordinates;
  if (clean(p.countrycode).toUpperCase() !== 'IN') return null;

  const key = clean(p.osm_key);
  const value = clean(p.osm_value);
  const type = clean(p.type);
  const name = clean(p.name);
  const district = clean(p.district); // OSM suburb / neighbourhood the feature sits in
  const state = clean(p.state);
  const osmCity = clean(p.city);
  const county = clean(p.county);
  const lat = Array.isArray(coords) ? Number(coords[1]) : NaN;
  const lng = Array.isArray(coords) ? Number(coords[0]) : NaN;
  const id = `osm:${clean(p.osm_type) || 'X'}${p.osm_id ?? ''}`;

  const isPlaceLike =
    (key === 'place' && value in PLACE_RANK && value !== 'house') ||
    (key === 'landuse' && value === 'residential') ||
    (key === 'boundary' && value === 'administrative' && ['district', 'locality', 'city'].includes(type));

  let city = '';
  if (key === 'place' && (value === 'city' || value === 'town')) city = name;
  else city = osmCity || cityFromCounty(county) || clean(p.state_district);
  city = normalizeCity(city, state);

  if (isPlaceLike && value === 'postcode') {
    // Photon's postcode entry (query was a PIN): its "district" is the area name.
    if (!district) return null;
    rankOut.rank = PLACE_RANK.postcode;
    return {
      id,
      name: district,
      locality: district,
      city,
      state,
      pinCode: validPin(name) || validPin(p.postcode),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      source: 'osm',
    };
  }

  if (isPlaceLike && name) {
    rankOut.rank = PLACE_RANK[value] ?? 0;
    let locality = name;
    let subLocality: string | undefined;
    // A housing society / complex mapped as an area (landuse=residential, or a
    // named neighbourhood that is clearly a project) sits inside a real locality:
    // keep that locality and store the society as the sub-locality.
    const isSociety =
      (value === 'residential' || value === 'neighbourhood') &&
      !AREA_NAME_RE.test(name) &&
      SOCIETY_NAME_RE.test(name);
    if (
      isSociety &&
      district &&
      !ADMIN_AREA_RE.test(district) &&
      normalizePlaceText(district) !== normalizePlaceText(name) &&
      !normalizePlaceText(name).startsWith(normalizePlaceText(district))
    ) {
      locality = district;
      subLocality = name;
    }
    return {
      id,
      name,
      locality,
      subLocality,
      city,
      state,
      pinCode: validPin(p.postcode),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      source: 'osm',
    };
  }

  // Station / street / building hit ("Salt Lake Sector V"): offer the area it is in.
  if (district && !ADMIN_AREA_RE.test(district) && city) {
    rankOut.rank = 4;
    return {
      id: `${id}:area`,
      name: district,
      locality: district,
      city,
      state,
      pinCode: validPin(p.postcode),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      source: 'osm',
    };
  }
  return null;
}

async function photonFetch(q: string, limit: number, city: string | undefined, placesOnly: boolean): Promise<PhotonFeature[]> {
  const params = new URLSearchParams({ q, limit: String(limit), lang: 'en', bbox: INDIA_BBOX });
  if (placesOnly) {
    params.append('osm_tag', 'place');
    params.append('osm_tag', 'landuse:residential');
    params.append('osm_tag', 'boundary:administrative');
  }
  const centre = city ? CITY_CENTRES[city.trim().toLowerCase()] : undefined;
  if (centre) {
    params.set('lat', String(centre[0]));
    params.set('lon', String(centre[1]));
    params.set('zoom', '10');
    params.set('location_bias_scale', '0.4');
  }
  // Fair use: while Photon is throttling or down, do not keep calling it.
  if (photonBackingOff()) throw new Error('Photon backing off after recent failures');

  const url = `${PHOTON_URL}?${params.toString()}`;
  const get = () =>
    fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(PHOTON_TIMEOUT_MS),
      cache: 'no-store',
    });
  let res: Response;
  try {
    res = await get();
    // The public Photon server sheds load with 502/503 now and then: one short retry.
    if (res.status === 502 || res.status === 503) {
      await new Promise((r) => setTimeout(r, 400));
      res = await get();
    }
  } catch (err) {
    photonFailed();
    throw err;
  }
  if (!res.ok) {
    if (res.status === 429 || res.status >= 500) photonFailed();
    throw new Error(`Photon HTTP ${res.status}`);
  }
  photonState().failures = 0;
  const json = (await res.json()) as { features?: PhotonFeature[] };
  return Array.isArray(json.features) ? json.features : [];
}

// Simple circuit breaker shared by warm invocations: after a timeout / 429 / 5xx,
// skip Photon for 15s, then 30s, 60s ... up to 5 min while it keeps failing.
const globalPhoton = globalThis as unknown as { __photonState?: { failures: number; backoffUntil: number } };
function photonState() {
  if (!globalPhoton.__photonState) globalPhoton.__photonState = { failures: 0, backoffUntil: 0 };
  return globalPhoton.__photonState;
}
function photonFailed() {
  const s = photonState();
  s.failures += 1;
  s.backoffUntil = Date.now() + Math.min(5 * 60_000, 15_000 * 2 ** (s.failures - 1));
}
function photonBackingOff(): boolean {
  return Date.now() < photonState().backoffUntil;
}

async function searchPhoton(q: string, city: string | undefined, limit: number): Promise<Place[]> {
  const fetchLimit = Math.min(20, limit * 2);
  const features = await photonFetch(q, fetchLimit, city, true);
  const ranked: { place: Place; rank: number; i: number }[] = [];
  const push = (list: PhotonFeature[], offset: number) => {
    list.forEach((f, i) => {
      const r = { rank: 9 };
      const place = photonPlace(f, r);
      if (place) ranked.push({ place, rank: r.rank, i: i + offset });
    });
  };
  push(features, 0);

  // Few area matches (e.g. "Salt Lake" is mostly mapped as stations/streets):
  // look at everything and offer the areas those hits sit in.
  if (ranked.length < Math.ceil(limit / 2)) {
    try {
      push(await photonFetch(q, fetchLimit, city, false), 1000);
    } catch (err) {
      console.error('[places] Photon broad search failed:', err);
    }
  }

  ranked.sort((a, b) => {
    if (city) {
      const ca = cityMatches(a.place.city, city) ? 0 : 1;
      const cb = cityMatches(b.place.city, city) ? 0 : 1;
      if (ca !== cb) return ca - cb;
    }
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.i - b.i;
  });
  return ranked.map((r) => r.place);
}

// ---------------------------------------------------------------------------
// Google Places API (New)
// ---------------------------------------------------------------------------

function googleKey(): string | undefined {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return key ? key : undefined;
}

export function isGoogleEnabled(): boolean {
  return Boolean(googleKey());
}

interface GooglePrediction {
  placeId?: string;
  text?: { text?: string };
  structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
}

async function searchGoogle(q: string, city: string | undefined, limit: number): Promise<Place[]> {
  const key = googleKey();
  if (!key) return [];
  const centre = city ? CITY_CENTRES[city.trim().toLowerCase()] : undefined;
  const body: Record<string, unknown> = {
    input: q,
    includedRegionCodes: ['in'],
    includedPrimaryTypes: ['(regions)'],
    languageCode: 'en',
  };
  if (centre) {
    body.locationBias = { circle: { center: { latitude: centre[0], longitude: centre[1] }, radius: 40000 } };
  }
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Google autocomplete HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { suggestions?: { placePrediction?: GooglePrediction }[] };
  const out: Place[] = [];
  for (const s of json.suggestions || []) {
    const p = s.placePrediction;
    if (!p?.placeId) continue;
    const main = clean(p.structuredFormat?.mainText?.text) || clean(p.text?.text).split(',')[0];
    const parts = clean(p.structuredFormat?.secondaryText?.text)
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x && x.toLowerCase() !== 'india');
    const state = parts.length > 0 ? parts[parts.length - 1] : '';
    const rawCity = parts.length > 1 ? parts[parts.length - 2] : main;
    const locality = parts.length > 2 ? parts[parts.length - 3] : main;
    out.push({
      id: `google:${p.placeId}`,
      name: main,
      locality: locality === main ? main : locality,
      subLocality: locality === main ? undefined : main,
      city: normalizeCity(rawCity, state),
      state,
      lat: null,
      lng: null,
      source: 'google',
    });
    if (out.length >= limit) break;
  }
  return out;
}

interface GoogleAddressComponent {
  longText?: string;
  types?: string[];
}

/** Google place details (lat/lng, PIN, exact locality) for a picked suggestion. Null on failure. */
export async function getPlaceDetails(id: string): Promise<Place | null> {
  const key = googleKey();
  const placeId = id.startsWith('google:') ? id.slice('google:'.length) : '';
  if (!key || !/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) return null;

  const cacheKey = `details|${placeId}`;
  const cached = cacheGet<Place | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,displayName,addressComponents,location',
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Google details HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as {
      displayName?: { text?: string };
      addressComponents?: GoogleAddressComponent[];
      location?: { latitude?: number; longitude?: number };
    };
    const comps = json.addressComponents || [];
    const find = (...types: string[]) =>
      clean(comps.find((c) => types.some((t) => c.types?.includes(t)))?.longText);
    const name = clean(json.displayName?.text);
    const state = find('administrative_area_level_1');
    const city = normalizeCity(find('locality') || find('administrative_area_level_3') || find('administrative_area_level_2'), state);
    const sub1 = find('sublocality_level_1', 'sublocality');
    const sub2 = find('sublocality_level_2', 'neighborhood', 'premise');
    const locality = sub1 || name || city;
    const subLocality = sub2 && sub2 !== locality ? sub2 : name && name !== locality && name !== city ? name : undefined;
    const lat = Number(json.location?.latitude);
    const lng = Number(json.location?.longitude);
    const place: Place = {
      id,
      name: name || locality,
      locality,
      subLocality,
      city,
      state,
      pinCode: validPin(find('postal_code')),
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      source: 'google',
    };
    cacheSet(cacheKey, place);
    return place;
  } catch (err) {
    console.error('[places] Google details failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// India Post (PIN code)
// ---------------------------------------------------------------------------

async function searchIndiaPost(pin: string): Promise<Place[]> {
  const result = await lookupPinCode(pin);
  if (!result) return [];
  return result.localities.map((name) => ({
    id: `indiapost:${pin}:${name}`,
    name,
    locality: cleanLocalityName(name, result.district),
    city: result.city,
    state: result.state,
    pinCode: result.pinCode,
    lat: null,
    lng: null,
    source: 'indiapost' as const,
  }));
}

interface IndiaPostOffice {
  Name?: string;
  BranchType?: string;
  DeliveryStatus?: string;
  District?: string;
  State?: string;
  Pincode?: string;
}

/**
 * India Post post-office search by name (fallback for name queries).
 * Post offices with the same clean name and PIN collapse into one; a delivery
 * office wins over a non-delivery one. Results matching the query's start and
 * the city bias come first.
 */
async function searchIndiaPostByName(q: string, city: string | undefined, limit: number): Promise<Place[]> {
  // The API takes a plain name: keep letters, digits, spaces, dots and hyphens.
  const name = q.replace(/[^A-Za-z0-9 .-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (name.length < 3) return [];

  const cacheKey = `postoffice|${name.toLowerCase()}`;
  let offices = cacheGet<IndiaPostOffice[]>(cacheKey);
  if (!offices) {
    const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(name)}`, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(INDIA_POST_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`India Post HTTP ${res.status}`);
    const data = (await res.json()) as { Status?: string; PostOffice?: IndiaPostOffice[] | null }[];
    const first = Array.isArray(data) ? data[0] : undefined;
    // "Error" means no post office has that name: a valid, cacheable empty answer.
    if (!first || (first.Status !== 'Success' && first.Status !== 'Error')) throw new Error('India Post: unexpected response');
    offices = Array.isArray(first.PostOffice) ? first.PostOffice : [];
    cacheSet(cacheKey, offices);
  }

  const qLower = name.toLowerCase();
  const byKey = new Map<string, { place: Place; delivery: boolean; order: number }>();
  offices.forEach((po, order) => {
    const district = clean(po.District);
    const locality = cleanLocalityName(clean(po.Name), district);
    const pinCode = validPin(po.Pincode);
    if (!locality || locality.length < 2) return;
    const key = `${normalizePlaceText(locality)}|${pinCode || ''}`;
    const delivery = clean(po.DeliveryStatus).toLowerCase() === 'delivery';
    const existing = byKey.get(key);
    if (existing && (existing.delivery || !delivery)) return;
    const state = clean(po.State);
    byKey.set(key, {
      delivery,
      order: existing ? existing.order : order,
      place: {
        id: `indiapost:${pinCode || 'x'}:${locality}`,
        name: locality,
        locality,
        city: normalizeCityName(district, state),
        state,
        pinCode,
        lat: null,
        lng: null,
        source: 'indiapost',
      },
    });
  });

  return Array.from(byKey.values())
    .map((e) => {
      // Exact name, then whole-word prefix ("Baner Gaon"), then partial word ("Banera").
      const n = e.place.name.toLowerCase();
      const startScore =
        n === qLower ? 0 : n.startsWith(qLower) ? (/[a-z0-9]/.test(n.charAt(qLower.length)) ? 2 : 1) : 3;
      const cityScore = city && cityMatches(e.place.city, city) ? 0 : 1;
      return { ...e, startScore, cityScore };
    })
    .sort(
      (a, b) =>
        a.cityScore - b.cityScore ||
        a.startScore - b.startScore ||
        Number(b.delivery) - Number(a.delivery) ||
        a.order - b.order
    )
    .slice(0, limit)
    .map((e) => e.place);
}

// ---------------------------------------------------------------------------
// Localities of our own active listings (read-only)
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function searchOwnListings(q: string, pin: string | null, city: string | undefined, limit: number): Promise<Place[]> {
  if (!process.env.DATABASE_URL) return [];
  // Escape LIKE wildcards in what the user typed.
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const pinCondition = pin ? Prisma.sql`OR pin_code = ${pin}` : Prisma.empty;
  const rows = await withTimeout(
    prisma.$queryRaw<{ locality: string; sub_locality: string | null; city: string; pin_code: string }[]>`
      SELECT DISTINCT locality, sub_locality, city, pin_code
      FROM listings
      WHERE status = 'ACTIVE' AND (locality ILIKE ${pattern} ${pinCondition})
      LIMIT 10`,
    DB_TIMEOUT_MS,
    'Listing locality query'
  );

  const qNorm = normalizePlaceText(q);
  return rows
    .map((r) => {
      const listingCity = clean(r.city);
      // Some listings save the locality as "Baner, Pune": drop a trailing city name.
      let locality = clean(r.locality);
      const parts = locality.split(',').map((x) => x.trim()).filter(Boolean);
      if (parts.length > 1 && cityKey(parts[parts.length - 1]) === cityKey(listingCity)) {
        locality = parts.slice(0, -1).join(', ');
      }
      const sub = clean(r.sub_locality);
      const n = normalizePlaceText(locality);
      return {
        place: {
          id: `listing:${normalizePlaceText(locality)}:${normalizePlaceText(sub)}:${normalizePlaceText(listingCity)}:${r.pin_code}`,
          name: locality,
          locality,
          // Keep the society only when it is a different name from the locality.
          subLocality: sub && normalizePlaceText(sub) !== n ? sub : undefined,
          city: listingCity,
          state: '',
          pinCode: validPin(r.pin_code),
          lat: null,
          lng: null,
          source: 'listing' as const,
        },
        score: (city && cityMatches(listingCity, city) ? 0 : 2) + (n.startsWith(qNorm) ? 0 : 1),
      };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((r) => r.place);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/** City key for de-duplication only (Bengaluru = Bangalore, Gurugram = Gurgaon). */
function cityKey(city: string): string {
  const n = normalizePlaceText(city);
  if (n === 'bengaluru') return 'bangalore';
  if (n === 'gurugram') return 'gurgaon';
  if (n === 'bombay') return 'mumbai';
  return n;
}

function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of places) {
    const key = `${normalizePlaceText(p.name)}|${normalizePlaceText(p.locality)}|${cityKey(p.city)}`;
    if (!p.name || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export interface PlaceSearchResult {
  places: Place[];
  /** True when a provider failed: the answer may be incomplete, so callers should cache it briefly. */
  degraded: boolean;
}

export async function searchPlacesDetailed({ q, city, limit = DEFAULT_LIMIT }: SearchPlacesOptions): Promise<PlaceSearchResult> {
  const query = clean(q).slice(0, 100);
  const cityBias = clean(city).slice(0, 100) || undefined;
  const max = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit) || DEFAULT_LIMIT));
  if (query.length < 2) return { places: [], degraded: false };

  const google = isGoogleEnabled();
  const cacheKey = `search|${google ? 'g' : 'p'}|${query.toLowerCase()}|${(cityBias || '').toLowerCase()}|${max}`;
  const cached = cacheGet<PlaceSearchResult>(cacheKey);
  if (cached) return cached;

  const pin = /^\d{6}$/.test(query.replace(/\s/g, '')) ? query.replace(/\s/g, '') : null;
  let failed = false;

  const geoQuery = pin ?? query;
  const geoSearch = async (): Promise<Place[]> => {
    if (google) {
      try {
        const g = await searchGoogle(geoQuery, cityBias, max);
        if (g.length > 0) return g;
      } catch (err) {
        failed = true;
        console.error('[places] Google autocomplete failed, falling back to Photon:', err);
      }
    }
    try {
      return await searchPhoton(geoQuery, cityBias, max);
    } catch (err) {
      failed = true;
      console.error('[places] Photon search failed:', err instanceof Error ? err.message : err);
      return [];
    }
  };

  const postSearch = async (): Promise<Place[]> => {
    if (!pin) return [];
    try {
      return await searchIndiaPost(pin);
    } catch (err) {
      failed = true;
      console.error('[places] India Post lookup failed:', err);
      return [];
    }
  };

  // Our own listings: cheap, read-only, and run on every search so a real
  // listing's locality is always findable.
  const listingSearch = async (): Promise<Place[]> => {
    try {
      return await searchOwnListings(query, pin, cityBias, max);
    } catch (err) {
      failed = true;
      console.error('[places] Listing locality lookup failed:', err instanceof Error ? err.message : err);
      return [];
    }
  };

  const [geo, post, own] = await Promise.all([geoSearch(), postSearch(), listingSearch()]);

  // India Post name search only when the map providers failed or found too little.
  let postByName: Place[] = [];
  if (!pin && dedupe([...geo, ...own]).length < Math.ceil(max / 2)) {
    try {
      postByName = await searchIndiaPostByName(query, cityBias, max);
    } catch (err) {
      failed = true;
      console.error('[places] India Post name search failed:', err instanceof Error ? err.message : err);
    }
  }

  // Preference: Google/Photon, then our listings, then India Post. For a PIN,
  // the map's area name comes first, then listings in that PIN, then the post offices.
  const merged = dedupe([...geo, ...own, ...postByName, ...post]).slice(0, pin ? MAX_LIMIT : max);

  // Do not keep a provider outage in the cache for a day.
  const result: PlaceSearchResult = { places: merged, degraded: failed };
  cacheSet(cacheKey, result, failed ? 2 * 60 * 1000 : CACHE_TTL_MS);
  return result;
}

export async function searchPlaces(options: SearchPlacesOptions): Promise<Place[]> {
  return (await searchPlacesDetailed(options)).places;
}
