import type { SensoryIndicator } from "./types";

export function indicatorForLoad(
  sensoryLoad: number,
  threshold: number
): SensoryIndicator {
  return sensoryLoad > threshold ? "High" : "Low";
}

export function formatWalk(meters: number) {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/** Accurate ETA display: hours + minutes when needed. */
export function formatMins(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.max(0, Math.round(seconds / 60));
  if (total < 1) return "<1 min";
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
