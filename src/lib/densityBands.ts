import type { DensityLevel } from "./types";

export const CBD_CENTER = { lat: -37.8136, lng: 144.9631 };

export const CBD_BOUNDS = {
  latMin: -37.825,
  latMax: -37.805,
  lngMin: 144.95,
  lngMax: 144.98,
};

export function densityFromCount(n: number): DensityLevel {
  if (n <= 50) return "Low";
  if (n <= 150) return "Medium";
  return "High";
}

export function densityColor(level: DensityLevel | string) {
  if (level === "Low") return "#2f6f4e";
  if (level === "Medium") return "#b07d2a";
  return "#a33b32";
}

export function inCbd(lat: number, lng: number) {
  return (
    lat >= CBD_BOUNDS.latMin &&
    lat <= CBD_BOUNDS.latMax &&
    lng >= CBD_BOUNDS.lngMin &&
    lng <= CBD_BOUNDS.lngMax
  );
}
