import { distanceMeters } from "./geo";
import type { LatLng, RefugePlace } from "./types";

export function sortRefugesByDistance(
  origin: LatLng,
  places: RefugePlace[]
): RefugePlace[] {
  return places
    .map((p) => ({
      ...p,
      distanceMeters: distanceMeters(origin, {
        lat: p.latitude,
        lng: p.longitude,
      }),
    }))
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
}

export function nearestRefuge(
  origin: LatLng,
  places: RefugePlace[]
): RefugePlace | null {
  const sorted = sortRefugesByDistance(origin, places);
  return sorted[0] ?? null;
}
