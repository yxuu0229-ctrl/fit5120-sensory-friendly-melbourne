import { decodePolyline } from "../lib/polyline";
import type { LatLng } from "../lib/types";

export type TransitRoute = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  summary: string;
};

function googleKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
}

/** Public transport via Google Routes API (needs API key + Routes API enabled). */
export async function fetchTransitRoutes(
  from: LatLng,
  to: LatLng
): Promise<TransitRoute[]> {
  const key = googleKey();
  if (!key) {
    throw new Error(
      "Transit needs VITE_GOOGLE_MAPS_API_KEY with Routes API enabled."
    );
  }

  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: from.lat, longitude: from.lng } },
        },
        destination: {
          location: { latLng: { latitude: to.lat, longitude: to.lng } },
        },
        travelMode: "TRANSIT",
        computeAlternativeRoutes: true,
        languageCode: "en-AU",
        regionCode: "AU",
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Transit routing failed (${res.status}). Enable Routes API in Google Cloud. ${text.slice(0, 120)}`
    );
  }

  const body = (await res.json()) as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      description?: string;
      polyline?: { encodedPolyline?: string };
    }>;
  };

  return (body.routes ?? [])
    .map((r, i) => {
      const encoded = r.polyline?.encodedPolyline;
      if (!encoded) return null;
      const seconds = Number((r.duration || "0s").replace(/s$/, "")) || 0;
      return {
        distanceMeters: r.distanceMeters ?? 0,
        durationSeconds: seconds,
        coordinates: decodePolyline(encoded).map(
          ([lat, lng]) => [lng, lat] as [number, number]
        ),
        summary: r.description || `Transit option ${i + 1}`,
      };
    })
    .filter((r): r is TransitRoute => r != null)
    .slice(0, 3);
}
