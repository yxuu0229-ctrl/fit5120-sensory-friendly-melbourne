import { geocodeMelbourne } from "./nominatim";
import type { PlaceResult } from "../lib/types";

function googleKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
}

/** Resolve free-text to a Melbourne lat/lng (Google if keyed, else Nominatim). */
export async function geocodeQuery(query: string): Promise<PlaceResult | null> {
  const q = query.trim();
  if (q.length < 2) return null;

  if (googleKey()) {
    try {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", q);
      url.searchParams.set("components", "country:AU|administrative_area:VIC");
      url.searchParams.set("bounds", "-38.05,144.70|-37.55,145.25");
      url.searchParams.set("key", googleKey());
      const res = await fetch(url);
      if (res.ok) {
        const body = (await res.json()) as {
          results?: Array<{
            formatted_address: string;
            place_id: string;
            geometry: { location: { lat: number; lng: number } };
          }>;
        };
        const first = body.results?.[0];
        if (first) {
          return {
            label: first.formatted_address,
            placeId: first.place_id,
            point: {
              lat: first.geometry.location.lat,
              lng: first.geometry.location.lng,
            },
          };
        }
      }
    } catch {
      // fall through
    }
  }

  return geocodeMelbourne(q);
}
