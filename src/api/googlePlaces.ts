import { searchLandmarks } from "../data/cbdLandmarks";
import { geocodeMelbourne, searchMelbournePlaces } from "./nominatim";
import type { PlaceResult } from "../lib/types";

function googleKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
}

export function hasGoogleKey() {
  return Boolean(googleKey());
}

/** Autocomplete: Google Places when keyed, else Nominatim (any Melbourne place). */
export async function autocompletePlaces(input: string): Promise<PlaceResult[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  if (hasGoogleKey()) {
    try {
      const res = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": googleKey(),
          },
          body: JSON.stringify({
            input: q,
            includedRegionCodes: ["au"],
            locationBias: {
              circle: {
                center: { latitude: -37.8136, longitude: 144.9631 },
                radius: 35000,
              },
            },
          }),
        }
      );
      if (res.ok) {
        const body = (await res.json()) as {
          suggestions?: Array<{
            placePrediction?: {
              placeId?: string;
              text?: { text?: string };
            };
          }>;
        };
        const mapped: PlaceResult[] = [];
        for (const s of body.suggestions ?? []) {
          const p = s.placePrediction;
          if (!p?.placeId || !p.text?.text) continue;
          mapped.push({
            label: p.text.text,
            placeId: p.placeId,
            point: { lat: 0, lng: 0 },
          });
        }
        if (mapped.length) return mapped;
      }
    } catch {
      // fall through
    }
  }

  try {
    const osm = await searchMelbournePlaces(q);
    if (osm.length) return osm;
  } catch {
    // fall through
  }
  return searchLandmarks(q);
}

export async function resolvePlaceDetails(
  place: PlaceResult
): Promise<PlaceResult | null> {
  if (place.point.lat !== 0 || place.point.lng !== 0) return place;

  if (place.placeId?.startsWith("osm-")) {
    return geocodeMelbourne(place.label);
  }

  if (!place.placeId || !hasGoogleKey()) {
    return geocodeMelbourne(place.label);
  }

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${place.placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": googleKey(),
        "X-Goog-FieldMask": "location,formattedAddress,displayName",
      },
    }
  );
  if (!res.ok) return geocodeMelbourne(place.label);
  const body = (await res.json()) as {
    formattedAddress?: string;
    displayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
  };
  if (body.location?.latitude == null || body.location?.longitude == null) {
    return geocodeMelbourne(place.label);
  }
  return {
    label: body.displayName?.text || body.formattedAddress || place.label,
    placeId: place.placeId,
    point: { lat: body.location.latitude, lng: body.location.longitude },
  };
}
