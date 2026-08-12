import { distanceMeters, sampleLine } from "./geo";
import type { SensorReading } from "./types";

const WEIGHT = { Low: 0, Medium: 2, High: 5 } as const;

export function scoreRoutePath(
  lngLatPath: [number, number][],
  sensors: SensorReading[],
  radiusMeters = 90
): number {
  const samples = sampleLine(lngLatPath, 45);
  if (!samples.length) return Number.POSITIVE_INFINITY;

  let total = 0;
  for (const p of samples) {
    let penalty = 0.4;
    let nearest = Infinity;
    for (const s of sensors) {
      const d = distanceMeters(p, { lat: s.latitude, lng: s.longitude });
      if (d <= radiusMeters && d < nearest) {
        nearest = d;
        penalty = WEIGHT[s.density_level] ?? 1;
      }
    }
    total += penalty;
  }

  const lengthKm = pathLengthMeters(lngLatPath) / 1000;
  return total / samples.length + lengthKm * 0.15;
}

function pathLengthMeters(coords: [number, number][]) {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    sum += distanceMeters(
      { lat: coords[i - 1][1], lng: coords[i - 1][0] },
      { lat: coords[i][1], lng: coords[i][0] }
    );
  }
  return sum;
}

export function loadFromScore(score: number) {
  return Math.round(Math.min(100, (score / 5) * 100));
}
