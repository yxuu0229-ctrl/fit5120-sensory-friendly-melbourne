import { densityFromCount } from "./densityBands";
import { coverageAreaLabel } from "./quietForecast";
import type { LocationQuietWindow, QuietAlert, SensorReading } from "./types";

export type ForecastHotspot = QuietAlert & {
  level: "High" | "Medium";
};

export function buildForecastHotspots(
  sensors: SensorReading[],
  windows: LocationQuietWindow[],
  periodLabel: string,
  limit = 6
): ForecastHotspot[] {
  const byId = new Map(windows.map((w) => [w.location_id, w]));
  const candidates: ForecastHotspot[] = [];

  for (const s of sensors) {
    const w = byId.get(s.location_id);
    if (!w || !w.is_reliable) continue;
    const level = densityFromCount(w.mean);
    if (level === "Low") continue;
    candidates.push({
      areaName: coverageAreaLabel(s.sensor_name),
      periodLabel,
      expectedMean: w.mean,
      reliable: w.is_reliable,
      point: { lat: s.latitude, lng: s.longitude },
      locationId: s.location_id,
      level: level === "High" ? "High" : "Medium",
    });
  }

  candidates.sort((a, b) => (b.expectedMean ?? 0) - (a.expectedMean ?? 0));
  return candidates.slice(0, limit);
}
