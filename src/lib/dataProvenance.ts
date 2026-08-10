import type { SensorDensityCurrent } from "./types";

/**
 * Crowd readings are always served from the Supabase cache, which the sync
 * workflow refreshes every 15 minutes
 * (.github/workflows/sync-open-data.yml). Four missed cycles means the upstream
 * feed or the sync itself has stopped, and the route is being planned on the
 * most recent snapshot rather than on current conditions.
 */
export const STALE_AFTER_SECONDS = 60 * 60;

export type ProvenanceSource = "cached" | "unavailable";

export type DataProvenance = {
  source: ProvenanceSource;
  sensorCount: number;
  /** Most recent reading behind this route, ISO 8601. */
  newestSensingDatetime: string | null;
  ageSeconds: number | null;
  /** True when the cache has stopped being refreshed. */
  isStale: boolean;
  /** Plain-language summary for display (AC 1.1.7, 1.3.6, 2.1.3). */
  message: string;
};

/** CSS class for a provenance line — shared by the journey pages and live map. */
export function provenanceClassName(provenance: DataProvenance): string {
  if (provenance.source === "unavailable") return "data-age data-age-unavailable";
  return provenance.isStale ? "data-age data-age-stale" : "data-age";
}

/** Human-readable age, coarse on purpose — precision here is false comfort. */
export function describeAge(seconds: number): string {
  if (seconds < 90) return "less than a minute old";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} minutes old`;
  const hours = Math.round(seconds / 3600);
  if (hours < 48) return hours === 1 ? "1 hour old" : `${hours} hours old`;
  const days = Math.round(seconds / 86400);
  return days === 1 ? "1 day old" : `${days} days old`;
}

function sensorCountPhrase(n: number): string {
  return n === 1 ? "1 sensor" : `${n} sensors`;
}

function newestReading(sensors: SensorDensityCurrent[]): string | null {
  let newest: string | null = null;
  let newestMs = -Infinity;

  for (const s of sensors) {
    if (!s.sensing_datetime) continue;
    const ms = Date.parse(s.sensing_datetime);
    if (Number.isNaN(ms) || ms <= newestMs) continue;
    newestMs = ms;
    newest = s.sensing_datetime;
  }

  return newest;
}

/**
 * Describe the crowd data a route was planned on.
 *
 * `available` is whether the cache could be read at all — distinct from whether
 * it held any rows. Both end up as "unavailable" to the user, but only the
 * former is an outage.
 */
export function buildProvenance(
  sensors: SensorDensityCurrent[],
  available: boolean,
  now = new Date()
): DataProvenance {
  if (!available) {
    return {
      source: "unavailable",
      sensorCount: 0,
      newestSensingDatetime: null,
      ageSeconds: null,
      isStale: false,
      message:
        "Crowd data could not be reached, so this route was planned on " +
        "distance alone. It is not a quieter-route recommendation.",
    };
  }

  if (sensors.length === 0) {
    return {
      source: "unavailable",
      sensorCount: 0,
      newestSensingDatetime: null,
      ageSeconds: null,
      isStale: false,
      message:
        "No crowd readings are stored yet, so this route was planned on " +
        "distance alone. It is not a quieter-route recommendation.",
    };
  }

  const newest = newestReading(sensors);

  if (!newest) {
    return {
      source: "cached",
      sensorCount: sensors.length,
      newestSensingDatetime: null,
      ageSeconds: null,
      isStale: false,
      message:
        `Planned using cached readings from ` +
        `${sensorCountPhrase(sensors.length)}. Their reading times are ` +
        "unknown, so the age cannot be shown.",
    };
  }

  const ageSeconds = Math.max(
    0,
    Math.round((now.getTime() - Date.parse(newest)) / 1000)
  );
  const isStale = ageSeconds > STALE_AFTER_SECONDS;
  const age = describeAge(ageSeconds);

  return {
    source: "cached",
    sensorCount: sensors.length,
    newestSensingDatetime: newest,
    ageSeconds,
    isStale,
    message: isStale
      ? `Live updates have stopped. This route uses the most recent cached ` +
        `crowd readings, which are ${age}.`
      : `Crowd readings are ${age}, from ${sensorCountPhrase(sensors.length)}.`,
  };
}
