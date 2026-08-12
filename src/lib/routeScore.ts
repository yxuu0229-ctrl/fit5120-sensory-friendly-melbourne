import { distanceMeters, sampleLine } from "./geo";
import type { RouteExposure, SensorReading } from "./types";

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

/**
 * How much of a route runs through Medium or High density, as a share of its
 * sampled points.
 *
 * `scoreRoutePath` averages penalties over the whole path, so a short busy
 * stretch barely moves the number — a 1.8 km route past three Medium sensors
 * gains roughly three points of "load". Exposure keeps that stretch visible so
 * the badge can reflect what the walker will actually pass through.
 */
export function routeExposure(
  lngLatPath: [number, number][],
  sensors: SensorReading[],
  radiusMeters = 90
): RouteExposure {
  const samples = sampleLine(lngLatPath, 45);
  if (!samples.length) return { medium: 0, high: 0 };

  let medium = 0;
  let high = 0;

  for (const p of samples) {
    let level: SensorReading["density_level"] | null = null;
    let nearest = Infinity;
    for (const s of sensors) {
      const d = distanceMeters(p, { lat: s.latitude, lng: s.longitude });
      if (d <= radiusMeters && d < nearest) {
        nearest = d;
        level = s.density_level;
      }
    }
    if (level === "Medium") medium += 1;
    else if (level === "High") high += 1;
  }

  return {
    medium: medium / samples.length,
    high: high / samples.length,
  };
}
