import type { SensoryIndicator } from "./types";

export function indicatorForLoad(
  sensoryLoad: number,
  threshold: number
): SensoryIndicator {
  return sensoryLoad > threshold ? "High" : "Low";
}

export function formatWalk(meters: number) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

export function formatMins(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
