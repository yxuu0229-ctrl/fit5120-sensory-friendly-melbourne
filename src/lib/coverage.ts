import { CBD_BOUNDS } from "./densityBands";
import type { LatLng } from "./types";

export function coverageMessage(from: LatLng, to: LatLng): string | null {
  const aOk =
    from.lat >= CBD_BOUNDS.latMin &&
    from.lat <= CBD_BOUNDS.latMax &&
    from.lng >= CBD_BOUNDS.lngMin &&
    from.lng <= CBD_BOUNDS.lngMax;
  const bOk =
    to.lat >= CBD_BOUNDS.latMin &&
    to.lat <= CBD_BOUNDS.latMax &&
    to.lng >= CBD_BOUNDS.lngMin &&
    to.lng <= CBD_BOUNDS.lngMax;
  if (aOk && bOk) return null;
  if (!aOk && !bOk) {
    return "Start and end are outside the CBD sensor coverage. Crowd scores may be incomplete.";
  }
  if (!aOk) return "Start is outside CBD sensor coverage. Crowd scores may be incomplete.";
  return "Destination is outside CBD sensor coverage. Crowd scores may be incomplete.";
}
