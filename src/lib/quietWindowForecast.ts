import { getSupabase, hasSupabaseEnv } from "./supabase";
import { densityLevelFromCount } from "./densityBands";
import { sensorsNearRoute } from "./congestion";
import type { SensorReading } from "./journeyData";
import type { LocationQuietWindow } from "./types";

/** Current weekday + hour in Melbourne, matching location_quiet_windows keys. */
export function melbourneDayHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);

  const dayName = parts.find((p) => p.type === "weekday")?.value ?? "";
  // hour12:false yields "24" for midnight in some environments.
  const hourday = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  return { dayName, hourday };
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Next Melbourne weekday-hour after `now` (rolls day at midnight). */
export function nextMelbourneDayHour(now = new Date()) {
  const { dayName, hourday } = melbourneDayHour(now);
  const nextHour = (hourday + 1) % 24;
  if (nextHour !== 0) return { dayName, hourday: nextHour };

  const idx = WEEKDAYS.indexOf(dayName as (typeof WEEKDAYS)[number]);
  const nextDay = WEEKDAYS[idx >= 0 ? (idx + 1) % 7 : 1];
  return { dayName: nextDay, hourday: 0 };
}

export function formatHourLabel(hourday: number) {
  if (hourday === 0) return "12am";
  if (hourday === 12) return "12pm";
  return hourday < 12 ? `${hourday}am` : `${hourday - 12}pm`;
}

export type QuietWindowForecast = {
  sensor: SensorReading;
  window: LocationQuietWindow | null;
  expectedMean: number | null;
  expectedLevel: "Low" | "Medium" | "High" | null;
  isReliable: boolean;
  sampleCount: number;
  currentCount: number | null;
  delta: number | null;
};

export type RouteQuietForecast = {
  dayName: string;
  hourday: number;
  label: string;
  forecasts: QuietWindowForecast[];
  /** Highest-priority alert: reliable High (or rising) forecast near the route. */
  alert: QuietWindowForecast | null;
};

function buildForecast(
  sensor: SensorReading,
  window: LocationQuietWindow | undefined
): QuietWindowForecast {
  const expectedMean =
    window && Number.isFinite(window.mean) ? Number(window.mean) : null;
  const currentCount =
    sensor.total_count != null && Number.isFinite(sensor.total_count)
      ? Number(sensor.total_count)
      : null;

  return {
    sensor,
    window: window ?? null,
    expectedMean,
    expectedLevel:
      expectedMean == null ? null : densityLevelFromCount(expectedMean),
    isReliable: Boolean(window?.is_reliable),
    sampleCount: window?.sample_count ?? 0,
    currentCount,
    delta:
      expectedMean != null && currentCount != null
        ? expectedMean - currentCount
        : null,
  };
}

function pickAlert(forecasts: QuietWindowForecast[]): QuietWindowForecast | null {
  const reliableHigh = forecasts
    .filter((f) => f.isReliable && f.expectedLevel === "High")
    .sort((a, b) => (b.expectedMean ?? 0) - (a.expectedMean ?? 0));
  if (reliableHigh[0]) return reliableHigh[0];

  const rising = forecasts
    .filter(
      (f) =>
        f.isReliable &&
        f.delta != null &&
        f.delta >= 30 &&
        (f.expectedLevel === "Medium" || f.expectedLevel === "High")
    )
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  if (rising[0]) return rising[0];

  // Fall back to current High on route when history is thin.
  const currentHigh = forecasts.filter(
    (f) => f.sensor.density_level === "High"
  );
  return currentHigh[0] ?? null;
}

/**
 * Next-hour typical volume for sensors near a route, from location_quiet_windows.
 * Missing env / empty path => empty forecasts (never throws).
 */
export async function forecastRouteNextHour(
  routePath: [number, number][],
  sensors: SensorReading[],
  now = new Date()
): Promise<RouteQuietForecast> {
  const { dayName, hourday } = nextMelbourneDayHour(now);
  const label = `${dayName} ${formatHourLabel(hourday)}`;
  const nearby =
    routePath.length > 1 ? sensorsNearRoute(routePath, sensors) : [];

  if (!nearby.length || !hasSupabaseEnv()) {
    return { dayName, hourday, label, forecasts: [], alert: null };
  }

  let windows: LocationQuietWindow[] = [];
  try {
    const ids = nearby.map((s) => s.location_id);
    const { data, error } = await getSupabase()
      .from("location_quiet_windows")
      .select("*")
      .eq("day_name", dayName)
      .eq("hourday", hourday)
      .in("location_id", ids);
    if (error) throw error;
    windows = (data || []) as LocationQuietWindow[];
  } catch {
    windows = [];
  }

  const byId = new Map(windows.map((w) => [w.location_id, w]));
  const forecasts = nearby.map((sensor) =>
    buildForecast(sensor, byId.get(sensor.location_id))
  );

  return {
    dayName,
    hourday,
    label,
    forecasts,
    alert: pickAlert(forecasts),
  };
}
