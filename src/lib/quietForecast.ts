import { densityFromCount } from "./densityBands";
import type { LocationQuietWindow, QuietAlert, SensorReading } from "./types";

export function melbourneDayHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const dayName = parts.find((p) => p.type === "weekday")?.value ?? "Monday";
  const hourday = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  return { dayName, hourday };
}

export function nextHourLabel(now = new Date()) {
  const { dayName, hourday } = melbourneDayHour(now);
  const next = (hourday + 1) % 24;
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day =
    next === 0
      ? days[(days.indexOf(dayName) + 1 + 7) % 7]
      : dayName;
  const label =
    next === 0 ? "12am" : next === 12 ? "12pm" : next < 12 ? `${next}am` : `${next - 12}pm`;
  return { dayName: day, hourday: next, label: `${day} ${label}` };
}

export function buildQuietAlert(
  sensors: SensorReading[],
  windows: LocationQuietWindow[],
  periodLabel: string
): QuietAlert | null {
  const byId = new Map(windows.map((w) => [w.location_id, w]));
  const candidates: QuietAlert[] = [];
  for (const s of sensors) {
    const w = byId.get(s.location_id);
    if (!w) continue;
    const level = densityFromCount(w.mean);
    if (!(w.is_reliable && level === "High")) continue;
    candidates.push({
      areaName: (s.sensor_name || "Nearby sensor").replace(/_/g, " "),
      periodLabel,
      expectedMean: w.mean,
      reliable: w.is_reliable,
      point: { lat: s.latitude, lng: s.longitude },
    });
  }
  candidates.sort((a, b) => (b.expectedMean ?? 0) - (a.expectedMean ?? 0));
  return candidates[0] ?? null;
}
