import type { LatLng } from "./types";

export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function sampleLine(
  coords: [number, number][],
  stepMeters = 45
): LatLng[] {
  if (!coords.length) return [];
  const out: LatLng[] = [{ lat: coords[0][1], lng: coords[0][0] }];
  let carry = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = { lat: coords[i - 1][1], lng: coords[i - 1][0] };
    const curr = { lat: coords[i][1], lng: coords[i][0] };
    carry += distanceMeters(prev, curr);
    if (carry >= stepMeters) {
      out.push(curr);
      carry = 0;
    }
  }
  const last = coords[coords.length - 1];
  out.push({ lat: last[1], lng: last[0] });
  return out;
}

export function progressAlongRoute(
  point: LatLng,
  path: [number, number][]
): { percent: number; closestIndex: number } {
  if (path.length < 2) return { percent: 0, closestIndex: 0 };
  let closestIndex = 0;
  let closest = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = distanceMeters(point, { lat: path[i][0], lng: path[i][1] });
    if (d < closest) {
      closest = d;
      closestIndex = i;
    }
  }
  let total = 0;
  let along = 0;
  for (let i = 1; i < path.length; i++) {
    const seg = distanceMeters(
      { lat: path[i - 1][0], lng: path[i - 1][1] },
      { lat: path[i][0], lng: path[i][1] }
    );
    total += seg;
    if (i <= closestIndex) along += seg;
  }
  const percent = total <= 0 ? 0 : Math.round((along / total) * 100);
  return { percent: Math.min(100, Math.max(0, percent)), closestIndex };
}

export function remainingPath(
  path: [number, number][],
  closestIndex: number
): [number, number][] {
  if (closestIndex >= path.length - 1) return path.slice(-2);
  return path.slice(Math.max(0, closestIndex));
}

/** Compass bearing in degrees (0 = north) from `from` toward `to`. */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Bearing along the remaining polyline from the closest vertex. */
export function bearingAlongPath(
  point: LatLng,
  path: [number, number][]
): number | null {
  if (path.length < 2) return null;
  const { closestIndex } = progressAlongRoute(point, path);
  const nextIndex = Math.min(path.length - 1, closestIndex + 1);
  const from =
    closestIndex === nextIndex && closestIndex > 0
      ? { lat: path[closestIndex - 1][0], lng: path[closestIndex - 1][1] }
      : { lat: path[closestIndex][0], lng: path[closestIndex][1] };
  const to = { lat: path[nextIndex][0], lng: path[nextIndex][1] };
  if (from.lat === to.lat && from.lng === to.lng) return null;
  return bearingDegrees(from, to);
}
