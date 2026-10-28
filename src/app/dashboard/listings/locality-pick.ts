import type { Place } from '@/lib/places';

export interface LocalityPickResult {
  /** Fields to merge into the listing form state. */
  patch: Record<string, unknown>;
  /** Human-readable list of what changed, for the toast. */
  changes: string[];
  /** Set when the city changed (caller adds it to the city dropdown and syncs its refs). */
  city?: string;
  /** Set when the PIN changed (caller marks it resolved so the India Post effect does not override the city). */
  pinCode?: string;
}

/**
 * Work out how a picked locality suggestion updates the listing form:
 * locality, sub-locality, city, PIN (only if empty or different) and coordinates.
 */
export function applyPlaceToListingForm(form: Record<string, unknown>, place: Place): LocalityPickResult {
  const patch: Record<string, unknown> = {};
  const changes: string[] = [];

  const locality = (place.locality || place.name || '').trim().slice(0, 150);
  if (locality) patch.locality = locality;
  patch.subLocality = (place.subLocality || '').trim().slice(0, 150);

  let city: string | undefined;
  const nextCity = (place.city || '').trim().slice(0, 100);
  const currentCity = String(form.city || '').trim();
  if (nextCity && nextCity.toLowerCase() !== currentCity.toLowerCase()) {
    city = nextCity;
    patch.city = nextCity;
    changes.push(currentCity ? `City: ${currentCity} → ${nextCity}` : `City: ${nextCity}`);
  }

  let pinCode: string | undefined;
  const nextPin = place.pinCode && /^[1-9]\d{5}$/.test(place.pinCode) ? place.pinCode : '';
  const currentPin = String(form.pinCode || '').replace(/\D/g, '');
  if (nextPin && nextPin !== currentPin) {
    // OpenStreetMap postcodes for Indian areas are often a nearby head office's PIN,
    // so a PIN the owner already entered is never replaced by one from map data.
    const reliable = place.source !== 'osm';
    if (!currentPin || reliable) {
      pinCode = nextPin;
      patch.pinCode = nextPin;
      changes.push(
        currentPin
          ? `PIN: ${currentPin} → ${nextPin} (please check)`
          : `PIN: ${nextPin}${reliable ? '' : ' (from map data, please check)'}`
      );
    } else {
      changes.push(`Kept your PIN ${currentPin} (map data suggests ${nextPin})`);
    }
  }

  if (place.lat !== null && place.lng !== null && Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    patch.latitude = place.lat;
    patch.longitude = place.lng;
  } else if ('latitude' in form) {
    // Coordinates from an earlier pick no longer match this locality.
    patch.latitude = null;
    patch.longitude = null;
  }

  return { patch, changes, city, pinCode };
}
