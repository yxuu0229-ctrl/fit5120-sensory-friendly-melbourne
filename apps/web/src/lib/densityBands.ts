/**
 * AC 2.1.1 — agreed pedestrian density bands for the map view.
 * Thresholds match the Streamlit prototype and ETL (`scripts/sync`).
 */
import type { DensityLevel } from "./types";

export const DENSITY_BANDS = [
  {
    level: "Low" as const,
    maxInclusive: 50,
    label: "Low",
    description: "≤ 50 pedestrians / minute bucket",
    color: "#1f7a4c",
  },
  {
    level: "Medium" as const,
    maxInclusive: 150,
    label: "Medium",
    description: "51–150 pedestrians / minute bucket",
    color: "#b36b00",
  },
  {
    level: "High" as const,
    maxInclusive: Infinity,
    label: "High",
    description: "> 150 pedestrians / minute bucket",
    color: "#b42318",
  },
] as const;

/** Rough Melbourne CBD coverage used by sync + map (WGS84). */
export const CBD_BOUNDS = {
  latMin: -37.825,
  latMax: -37.805,
  lngMin: 144.95,
  lngMax: 144.98,
} as const;

export const CBD_CENTER = {
  lat: -37.8136,
  lng: 144.9631,
} as const;

export const AGREED_DENSITY_LEVELS: DensityLevel[] = ["Low", "Medium", "High"];

export function densityLevelFromCount(totalCount: number): DensityLevel {
  const n = Number(totalCount) || 0;
  if (n <= 50) return "Low";
  if (n <= 150) return "Medium";
  return "High";
}

export function densityColor(level: string): string {
  const band = DENSITY_BANDS.find((b) => b.level === level);
  return band?.color ?? DENSITY_BANDS[2].color;
}

export function inCbd(lat: number, lng: number): boolean {
  return (
    lat >= CBD_BOUNDS.latMin &&
    lat <= CBD_BOUNDS.latMax &&
    lng >= CBD_BOUNDS.lngMin &&
    lng <= CBD_BOUNDS.lngMax
  );
}

export function isAgreedDensityLevel(level: string): level is DensityLevel {
  return (AGREED_DENSITY_LEVELS as string[]).includes(level);
}

/** Band assignment matches stored density_level for the given count. */
export function bandMatchesCount(
  totalCount: number,
  densityLevel: string
): boolean {
  return densityLevelFromCount(totalCount) === densityLevel;
}
