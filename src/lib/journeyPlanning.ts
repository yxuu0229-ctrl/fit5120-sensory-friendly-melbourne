import { distanceMeters } from "./geo";
import {
  type CrowdTolerance,
  levelRank,
  toleranceAllows,
} from "./tolerance";

export type Sensor = {
  latitude: number;
  longitude: number;
  density_level: "Low" | "Medium" | "High";
  /** Optional — present on live SensorReading rows, used for plain-language reasons. */
  sensor_name?: string | null;
};

export type RouteCandidate = {
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  positions: [number, number][];
};

export type JourneyPreferences = {
  avoidCongestion: boolean;
  /** Effective crowd tolerance (user's choice or the documented default). */
  tolerance: CrowdTolerance;
};

/** The busiest sampled segment along a route (AC 1.1.3). */
export type WorstSegment = {
  level: Sensor["density_level"];
  sensorName: string | null;
};

export type PlannedRoute = {
  name: string;
  label: string;
  /**
   * AC 1.1.3 — the route takes the rating of its highest-sensory segment:
   * this is the density band of the busiest sampled point, not an average.
   */
  sensoryLevel: "Low" | "Medium" | "High";
  distanceMeters: number;
  durationSeconds: number;
  sensoryLoad: number;
  positions: [number, number][];
  worstSegment: WorstSegment | null;
  /** AC 1.2.3 / 1.3.1 — busiest segment band exceeds the commuter's tolerance. */
  exceedsTolerance: boolean;
  /** AC 1.2.5 — plain-language reason for the rating and ranking. */
  reason: string;
};

function routeSignature(route: { distanceMeters: number; positions: [number, number][] }) {
  const start = route.positions[0];
  const end = route.positions[route.positions.length - 1];
  return [
    Math.round(route.distanceMeters / 25),
    start?.map((value) => value.toFixed(4)).join(","),
    end?.map((value) => value.toFixed(4)).join(","),
  ].join("|");
}

const sensorRadiusMeters = 120;

/**
 * Samples ~24 points along the route; each sample takes its nearest sensor
 * within 120 m. Returns the averaged 0–100 load (detail figure) and the worst
 * sampled segment, whose band is the route's sensory level (AC 1.1.3).
 *
 * Factors: pedestrian volume band only. Construction and event activity are
 * not present in the synced City of Melbourne datasets — documented as
 * unavailable in docs/decisions/0003-sensory-tolerance-and-defaults.md.
 */
function scoreRoute(
  positions: [number, number][],
  sensors: Sensor[]
): { load: number; worst: WorstSegment | null } {
  if (!sensors.length) return { load: 20, worst: null };

  const densityWeight = { Low: 0, Medium: 2, High: 5 };
  const samples = positions.filter(
    (_, index) => index % Math.max(1, Math.floor(positions.length / 24)) === 0
  );

  let total = 0;
  let worst: WorstSegment | null = null;

  for (const [lat, lng] of samples) {
    const nearest = sensors.reduce(
      (current, sensor) => {
        const distance = distanceMeters(
          { lat, lng },
          { lat: sensor.latitude, lng: sensor.longitude }
        );
        return distance < current.distance
          ? { distance, level: sensor.density_level, name: sensor.sensor_name ?? null }
          : current;
      },
      {
        distance: Number.POSITIVE_INFINITY,
        level: "Low" as Sensor["density_level"],
        name: null as string | null,
      }
    );

    if (nearest.distance <= sensorRadiusMeters) {
      total += densityWeight[nearest.level];
      if (!worst || levelRank(nearest.level) > levelRank(worst.level)) {
        worst = { level: nearest.level, sensorName: nearest.name };
      }
    } else {
      total += 0.4;
    }
  }

  return { load: Math.round((total / samples.length / 5) * 100), worst };
}

function walkingDurationSeconds(distanceMeters: number) {
  return Math.round((distanceMeters / 80) * 60);
}

function formatSensorName(name: string | null) {
  return name ? name.replace(/_/g, " ") : null;
}

/** AC 1.2.5 — plain-language reason: busiest segment band, then tolerance fit. */
function routeReason(
  route: { worstSegment: WorstSegment | null; exceedsTolerance: boolean },
  tolerance: CrowdTolerance
): string {
  const sensorName = formatSensorName(route.worstSegment?.sensorName ?? null);
  const segment = route.worstSegment
    ? `Busiest segment: ${route.worstSegment.level} pedestrian volume${
        sensorName ? ` near ${sensorName}` : ""
      }.`
    : "No pedestrian sensors within 120 m of this route, so it is rated Low.";
  const fit = route.exceedsTolerance
    ? `Ranked below calmer options because it exceeds your ${tolerance} crowd tolerance.`
    : `Within your ${tolerance} crowd tolerance.`;
  return `${segment} ${fit}`;
}

/**
 * Pipeline order: filter length>1 -> dedup keep-first -> score with durationSeconds
 * OVERWRITTEN by walkingDurationSeconds -> sort -> slice 3 -> label Route A/B/C.
 *
 * Sort (AC 1.1.4 / 1.2.3): routes exceeding `prefs.tolerance` always rank below
 * routes within it. Within each partition, avoidCongestion sorts by sensory
 * level then load then duration (calmest first); otherwise duration then
 * distance (fastest first).
 *
 * Invariants:
 * - Returns at most 3 routes.
 * - Empty sensors array yields sensoryLoad 20 and level "Low" for every candidate.
 * - sensoryLevel is the band of the worst sampled segment, never an average.
 * - Deterministic for a given input.
 * - The candidate's input durationSeconds is deliberately discarded and replaced.
 */
export function planJourney(
  candidates: RouteCandidate[],
  sensors: Sensor[],
  prefs: JourneyPreferences
): PlannedRoute[] {
  return candidates
    .filter((route) => route.positions.length > 1)
    .filter((route, index, allRoutes) => {
      const routeKey = routeSignature(route);
      return allRoutes.findIndex((candidate) => routeSignature(candidate) === routeKey) === index;
    })
    .map((route) => {
      const { load, worst } = scoreRoute(route.positions, sensors);
      const sensoryLevel = worst?.level ?? "Low";
      return {
        ...route,
        durationSeconds: walkingDurationSeconds(route.distanceMeters),
        sensoryLoad: load,
        sensoryLevel,
        worstSegment: worst,
        exceedsTolerance: !toleranceAllows(sensoryLevel, prefs.tolerance),
      };
    })
    .sort((a, b) => {
      const partition = Number(a.exceedsTolerance) - Number(b.exceedsTolerance);
      if (partition !== 0) return partition;
      return prefs.avoidCongestion
        ? levelRank(a.sensoryLevel) - levelRank(b.sensoryLevel) ||
            a.sensoryLoad - b.sensoryLoad ||
            a.durationSeconds - b.durationSeconds
        : a.durationSeconds - b.durationSeconds || a.distanceMeters - b.distanceMeters;
    })
    .slice(0, 3)
    .map((route, index) => ({
      ...route,
      name: `Route ${String.fromCharCode(65 + index)}`,
      reason: routeReason(route, prefs.tolerance),
    }));
}
