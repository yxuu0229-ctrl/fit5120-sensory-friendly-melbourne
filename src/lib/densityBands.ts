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

export type DensitySummary = {
  totalSensors: number;
  cbdSensors: number;
  bandCounts: Record<DensityLevel, number>;
  invalidLevel: number;
  bandMismatch: number;
  coversCbd: boolean;
  bandsValid: boolean;
};

/**
 * AC 2.1.1 — validate current readings against the agreed bands and count
 * sensors per band for the map legend. Formerly the density API's summary.
 */
export function buildDensitySummary(
  sensors: Array<{
    latitude: number;
    longitude: number;
    in_cbd: boolean | null;
    total_count: number;
    density_level: string;
  }>
): DensitySummary {
  const cbdSensors = sensors.filter(
    (s) => s.in_cbd === true || inCbd(s.latitude, s.longitude)
  );

  const bandCounts: Record<DensityLevel, number> = { Low: 0, Medium: 0, High: 0 };
  let invalidLevel = 0;
  let bandMismatch = 0;

  for (const s of cbdSensors) {
    if (!isAgreedDensityLevel(s.density_level)) {
      invalidLevel += 1;
      continue;
    }
    bandCounts[s.density_level] += 1;
    if (!bandMatchesCount(s.total_count, s.density_level)) {
      bandMismatch += 1;
    }
  }

  return {
    totalSensors: sensors.length,
    cbdSensors: cbdSensors.length,
    bandCounts,
    invalidLevel,
    bandMismatch,
    coversCbd: cbdSensors.length > 0,
    bandsValid: invalidLevel === 0 && bandMismatch === 0 && cbdSensors.length > 0,
  };
}
