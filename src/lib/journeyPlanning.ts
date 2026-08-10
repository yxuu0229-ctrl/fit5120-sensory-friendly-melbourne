import { distanceMeters } from "./geo";

export type Sensor = {
  latitude: number;
  longitude: number;
  density_level: "Low" | "Medium" | "High";
};

export type RouteCandidate = {
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  positions: [number, number][];
};

export type JourneyPreferences = {
  avoidCongestion: boolean;
};

export type PlannedRoute = {
  name: string;
  label: string;
  sensoryLevel: "Low" | "Medium" | "High";
  distanceMeters: number;
  durationSeconds: number;
  sensoryLoad: number;
  positions: [number, number][];
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

function sensoryLoad(positions: [number, number][], sensors: Sensor[]) {
  if (!sensors.length) return 20;

  const densityWeight = { Low: 0, Medium: 2, High: 5 };
  const samples = positions.filter((_, index) => index % Math.max(1, Math.floor(positions.length / 24)) === 0);
  const total = samples.reduce((sum, [lat, lng]) => {
    const nearest = sensors.reduce(
      (current, sensor) => {
        const distance = distanceMeters({ lat, lng }, { lat: sensor.latitude, lng: sensor.longitude });
        return distance < current.distance ? { distance, level: sensor.density_level } : current;
      },
      { distance: Number.POSITIVE_INFINITY, level: "Low" as Sensor["density_level"] }
    );

    return sum + (nearest.distance <= 120 ? densityWeight[nearest.level] : 0.4);
  }, 0);

  return Math.round((total / samples.length / 5) * 100);
}

function walkingDurationSeconds(distanceMeters: number) {
  return Math.round((distanceMeters / 80) * 60);
}

function sensoryLevel(load: number): PlannedRoute["sensoryLevel"] {
  if (load < 30) return "Low";
  if (load < 70) return "Medium";
  return "High";
}

/**
 * Pipeline order: filter length>1 -> dedup keep-first -> score with durationSeconds
 * OVERWRITTEN by walkingDurationSeconds -> sort (avoidCongestion ? sensoryLoad,duration : duration,distance)
 * -> slice 3 -> label Route A/B/C.
 *
 * Invariants:
 * - Returns at most 3 routes.
 * - Empty sensors array yields sensoryLoad 20 for every candidate, which maps to "Low".
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
    .map((route) => ({
      ...route,
      durationSeconds: walkingDurationSeconds(route.distanceMeters),
      sensoryLoad: sensoryLoad(route.positions, sensors),
    }))
    .sort((a, b) =>
      prefs.avoidCongestion
        ? a.sensoryLoad - b.sensoryLoad || a.durationSeconds - b.durationSeconds
        : a.durationSeconds - b.durationSeconds || a.distanceMeters - b.distanceMeters
    )
    .slice(0, 3)
    .map((route, index) => ({
      ...route,
      name: `Route ${String.fromCharCode(65 + index)}`,
      sensoryLevel: sensoryLevel(route.sensoryLoad),
    }));
}
