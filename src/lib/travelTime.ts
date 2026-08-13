import type { TransportMode } from "./transportModes";

/**
 * Urban Melbourne average speeds (m/s).
 * Used when the public OSRM demo returns car timings for every profile.
 */
export const MODE_SPEED_MPS: Record<Exclude<TransportMode, "transit">, number> = {
  walk: 1.35, // ~4.9 km/h
  cycle: 4.2, // ~15 km/h
  drive: 8.3, // ~30 km/h with lights / CBD traffic
};

/**
 * Duration for a mode given path length + optional router duration.
 * Walk/cycle always use speed × distance (OSRM demo ignores profile).
 * Drive prefers the router duration when it looks sane.
 */
export function durationForMode(
  mode: TransportMode,
  distanceMeters: number,
  routerDurationSeconds = 0
): number {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return Math.max(0, routerDurationSeconds);
  }

  if (mode === "transit") {
    return Math.max(0, routerDurationSeconds);
  }

  const estimated = distanceMeters / MODE_SPEED_MPS[mode];

  if (mode === "drive" && routerDurationSeconds > 0) {
    // Prefer OSRM/Google drive time; clamp wild outliers vs distance estimate.
    const ratio = routerDurationSeconds / estimated;
    if (ratio > 0.35 && ratio < 3.5) return routerDurationSeconds;
  }

  return estimated;
}
