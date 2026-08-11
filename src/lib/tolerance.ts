import type { DensityLevel } from "./types";

/**
 * AC 1.2.1 / 1.2.2 — crowd tolerance a commuter can set, and the documented
 * default applied when they have not set one.
 *
 * Only Low and Medium are offered: a "High" tolerance would accept every
 * route, so the warning and alternative-route flows would never trigger.
 *
 * A route "fits" a tolerance when the density band of its busiest segment
 * (its sensory level) is at or below the tolerance band:
 *   Low    -> only routes whose busiest segment is Low
 *   Medium -> routes whose busiest segment is Low or Medium
 */
export type CrowdTolerance = "Low" | "Medium";

/**
 * Documented default (see docs/decisions/0003-sensory-tolerance-and-defaults.md).
 * The UI must indicate when this default is in use rather than a user choice.
 */
export const DEFAULT_TOLERANCE: CrowdTolerance = "Medium";

const LEVEL_RANK: Record<DensityLevel, number> = { Low: 0, Medium: 1, High: 2 };

export function levelRank(level: DensityLevel): number {
  return LEVEL_RANK[level];
}

/** True when a route whose busiest segment is `level` fits within `tolerance`. */
export function toleranceAllows(
  level: DensityLevel,
  tolerance: CrowdTolerance
): boolean {
  return LEVEL_RANK[level] <= LEVEL_RANK[tolerance];
}

const STORAGE_KEY = "relaxmaps.crowdTolerance";

/**
 * Explicit choice retained for the browser session (AC 1.2.1). Returns null
 * when the user has never chosen, meaning DEFAULT_TOLERANCE applies.
 */
export function loadStoredTolerance(): CrowdTolerance | null {
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value === "Low" || value === "Medium" ? value : null;
  } catch {
    return null;
  }
}

export function storeTolerance(tolerance: CrowdTolerance): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, tolerance);
  } catch {
    // Session storage unavailable (e.g. blocked embed) — in-memory state still applies.
  }
}
