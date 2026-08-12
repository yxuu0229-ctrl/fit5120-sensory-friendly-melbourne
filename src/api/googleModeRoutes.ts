import { decodePolyline } from "../lib/polyline";
import { colorForMode } from "../lib/modeColors";
import { pathLengthFromLngLat } from "../lib/sensorsAlongRoute";
import type { TransportMode } from "../lib/transportModes";
import type { LatLng, RouteSegment } from "../lib/types";

export type GoogleModeRoute = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  segments: RouteSegment[];
};

function googleKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
}

function parseDurationSeconds(raw: string | undefined | null): number {
  if (!raw) return 0;
  const match = String(raw).trim().match(/^([\d.]+)s$/i);
  if (match) return Math.max(0, Number(match[1]) || 0);
  const asNum = Number(raw);
  return Number.isFinite(asNum) ? Math.max(0, asNum) : 0;
}

function googleTravelMode(
  mode: Exclude<TransportMode, "transit">
): "WALK" | "BICYCLE" | "DRIVE" {
  if (mode === "walk") return "WALK";
  if (mode === "cycle") return "BICYCLE";
  return "DRIVE";
}

/**
 * Walk / cycle / drive via Google Routes API (accurate mode-specific ETAs).
 */
export async function fetchGoogleModeRoutes(
  from: LatLng,
  to: LatLng,
  mode: Exclude<TransportMode, "transit">
): Promise<GoogleModeRoute[]> {
  const key = googleKey();
  if (!key) return [];

  const travelMode = googleTravelMode(mode);
  const body: Record<string, unknown> = {
    origin: {
      location: { latLng: { latitude: from.lat, longitude: from.lng } },
    },
    destination: {
      location: { latLng: { latitude: to.lat, longitude: to.lng } },
    },
    travelMode,
    computeAlternativeRoutes: true,
    languageCode: "en-AU",
    regionCode: "AU",
  };

  if (mode === "drive") {
    body.routingPreference = "TRAFFIC_AWARE";
  }

  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": [
          "routes.duration",
          "routes.distanceMeters",
          "routes.polyline.encodedPolyline",
        ].join(","),
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `${mode} routing failed (${res.status}). ${text.slice(0, 120)}`
    );
  }

  const json = (await res.json()) as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      polyline?: { encodedPolyline?: string };
    }>;
  };

  return (json.routes ?? [])
    .map((r) => {
      const encoded = r.polyline?.encodedPolyline;
      if (!encoded) return null;
      const coordinates = decodePolyline(encoded).map(
        ([lat, lng]) => [lng, lat] as [number, number]
      );
      if (coordinates.length < 2) return null;
      const geomMeters = pathLengthFromLngLat(coordinates);
      const distanceMeters =
        r.distanceMeters && r.distanceMeters > 0
          ? r.distanceMeters
          : geomMeters;
      const durationSeconds = parseDurationSeconds(r.duration);
      if (durationSeconds <= 0) return null;
      const positions = coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number]
      );
      const segments: RouteSegment[] = [
        {
          mode,
          color: colorForMode(mode),
          label: mode[0].toUpperCase() + mode.slice(1),
          positions,
        },
      ];
      return { distanceMeters, durationSeconds, coordinates, segments };
    })
    .filter((r): r is GoogleModeRoute => r != null)
    .slice(0, 3);
}

export function hasGoogleMapsKey() {
  return Boolean(googleKey());
}
