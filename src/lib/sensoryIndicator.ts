import type { DensityLevel, SensorReading, SensoryIndicator } from "./types";

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

/** Map a sensor to 0–100 load so it can be compared to the user threshold. */
export function sensorLoadScore(sensor: SensorReading): number {
  if (Number.isFinite(sensor.total_count) && sensor.total_count > 0) {
    return Math.round(
      Math.min(100, Math.max(0, (sensor.total_count / 200) * 100))
    );
  }
  if (sensor.density_level === "High") return 85;
  if (sensor.density_level === "Medium") return 55;
  return 18;
}

/**
 * Colour band relative to the user's crowd-density threshold.
 * At/under threshold = Low (comfortable); just over = Medium; well over = High.
 */
export function levelForThreshold(
  load: number,
  threshold: number
): DensityLevel {
  if (load <= threshold) return "Low";
  if (load <= threshold + 20) return "Medium";
  return "High";
}

export function sensorLevelForThreshold(
  sensor: SensorReading,
  threshold: number
): DensityLevel {
  return levelForThreshold(sensorLoadScore(sensor), threshold);
}
