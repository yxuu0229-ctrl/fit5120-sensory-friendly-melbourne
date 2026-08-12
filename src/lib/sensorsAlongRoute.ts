import { distanceMeters, sampleLine } from "./geo";
import type { SensorReading } from "./types";

/** Sensors whose coverage intersects the route corridor. */
export function sensorsAlongPath(
  latLngPath: [number, number][],
  sensors: SensorReading[],
  radiusMeters = 160
): SensorReading[] {
  if (!latLngPath.length || !sensors.length) return [];
  const lngLat = latLngPath.map(
    ([lat, lng]) => [lng, lat] as [number, number]
  );
  // Denser samples so short blocks along the corridor are not skipped.
  const samples = sampleLine(lngLat, 25);
  const hit = new Set<number>();
  const out: SensorReading[] = [];

  for (const s of sensors) {
    for (const p of samples) {
      if (
        distanceMeters(p, { lat: s.latitude, lng: s.longitude }) <=
        radiusMeters
      ) {
        if (!hit.has(s.location_id)) {
          hit.add(s.location_id);
          out.push(s);
        }
        break;
      }
    }
  }

  return out;
}

export function pathLengthFromLatLng(path: [number, number][]) {
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    sum += distanceMeters(
      { lat: path[i - 1][0], lng: path[i - 1][1] },
      { lat: path[i][0], lng: path[i][1] }
    );
  }
  return sum;
}

export function pathLengthFromLngLat(coords: [number, number][]) {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    sum += distanceMeters(
      { lat: coords[i - 1][1], lng: coords[i - 1][0] },
      { lat: coords[i][1], lng: coords[i][0] }
    );
  }
  return sum;
}
