export type LatLng = {
  lat: number;
  lng: number;
};

export function distanceMeters(a: LatLng, b: LatLng) {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

/** Alias kept for the route-planning modules ported from the map app. */
export const haversineMeters = distanceMeters;

export function distanceToRouteMeters(point: LatLng, routePath: [number, number][]) {
  return Math.min(
    ...routePath.map(([lat, lng]) => distanceMeters(point, { lat, lng }))
  );
}

/** Sample points along a [lng, lat] polyline roughly every `stepMeters`. */
export function sampleLine(
  coords: [number, number][],
  stepMeters = 40
): LatLng[] {
  if (coords.length === 0) return [];
  const out: LatLng[] = [{ lat: coords[0][1], lng: coords[0][0] }];
  let carry = 0;

  for (let i = 1; i < coords.length; i++) {
    const prev = { lat: coords[i - 1][1], lng: coords[i - 1][0] };
    const curr = { lat: coords[i][1], lng: coords[i][0] };
    const seg = haversineMeters(prev, curr);
    carry += seg;
    if (carry >= stepMeters) {
      out.push(curr);
      carry = 0;
    }
  }

  const last = coords[coords.length - 1];
  out.push({ lat: last[1], lng: last[0] });
  return out;
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

/**
 * Distance from a point to the nearest sample on a [lat, lng] path.
 */
export function distanceToPathMeters(
  point: LatLng,
  pathLatLng: [number, number][],
  sampleEveryMeters = 50
): number {
  if (pathLatLng.length === 0) return Infinity;
  // Convert to [lng, lat] for sampleLine, then measure
  const asLngLat: [number, number][] = pathLatLng.map(([lat, lng]) => [
    lng,
    lat,
  ]);
  const samples = sampleLine(asLngLat, sampleEveryMeters);
  let min = Infinity;
  for (const s of samples) {
    const d = haversineMeters(point, s);
    if (d < min) min = d;
  }
  return min;
}

export type PlaceAlongRoute<T extends { latitude: number; longitude: number }> =
  T & { distanceToRouteMeters: number };

/** Keep places within `radiusMeters` of the journey path, nearest first. */
export function filterPlacesAlongRoute<
  T extends { latitude: number; longitude: number },
>(
  places: T[],
  pathLatLng: [number, number][],
  radiusMeters = 180
): PlaceAlongRoute<T>[] {
  if (!pathLatLng.length) return [];
  return places
    .map((p) => ({
      ...p,
      distanceToRouteMeters: distanceToPathMeters(
        { lat: p.latitude, lng: p.longitude },
        pathLatLng
      ),
    }))
    .filter((p) => p.distanceToRouteMeters <= radiusMeters)
    .sort((a, b) => a.distanceToRouteMeters - b.distanceToRouteMeters);
}
