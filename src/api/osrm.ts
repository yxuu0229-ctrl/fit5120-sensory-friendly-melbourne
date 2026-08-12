import type { LatLng } from "../lib/types";
import { pathLengthFromLngLat } from "../lib/sensorsAlongRoute";
import { durationForMode } from "../lib/travelTime";
import { osrmProfile, type TransportMode } from "../lib/transportModes";

export type OsrmRoute = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
};

function baseUrl() {
  return (
    import.meta.env.VITE_OSRM_URL?.replace(/\/$/, "") ||
    "https://router.project-osrm.org"
  );
}

function normalizeRoute(
  mode: TransportMode,
  r: {
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
  }
): OsrmRoute | null {
  const coordinates = r.geometry?.coordinates ?? [];
  if (coordinates.length < 2) return null;
  const geomMeters = pathLengthFromLngLat(coordinates);
  const distanceMeters =
    r.distance && r.distance > 0 ? r.distance : geomMeters;
  // Public OSRM returns identical car durations for foot/bike/driving —
  // recompute with mode-specific urban speeds.
  const durationSeconds = durationForMode(
    mode,
    distanceMeters,
    r.duration ?? 0
  );
  return { distanceMeters, durationSeconds, coordinates };
}

async function requestRoute(
  mode: TransportMode,
  profile: "foot" | "bike" | "driving",
  coords: string,
  alternatives: boolean | number
): Promise<OsrmRoute[]> {
  const url = `${baseUrl()}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&alternatives=${alternatives}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const body = (await res.json()) as {
    code?: string;
    routes?: Array<{
      distance: number;
      duration: number;
      geometry?: { coordinates?: [number, number][] };
    }>;
  };
  if (body.code && body.code !== "Ok") {
    throw new Error(`Routing failed (${body.code})`);
  }
  return (body.routes ?? [])
    .map((r) => normalizeRoute(mode, r))
    .filter((r): r is OsrmRoute => r != null);
}

/**
 * Fetch mode-specific routes. Geometry comes from OSRM; times are
 * corrected per mode because the public demo ignores foot/bike speeds.
 */
export async function fetchOsrmRoutes(
  from: LatLng,
  to: LatLng,
  mode: TransportMode,
  alternatives: boolean | number = true
): Promise<OsrmRoute[]> {
  const profile = osrmProfile(mode);
  if (!profile) return [];

  const direct = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const routes = await requestRoute(mode, profile, direct, alternatives);

  const unique: OsrmRoute[] = [];
  for (const r of routes) {
    const dup = unique.some(
      (u) =>
        Math.abs(u.distanceMeters - r.distanceMeters) < 25 &&
        Math.abs(u.durationSeconds - r.durationSeconds) < 15
    );
    if (!dup) unique.push(r);
  }
  return unique.slice(0, 3);
}

export async function fetchOsrmTo(
  from: LatLng,
  to: LatLng,
  mode: TransportMode = "walk"
): Promise<OsrmRoute | null> {
  const profile = osrmProfile(mode) ?? "foot";
  const routes = await requestRoute(
    mode,
    profile,
    `${from.lng},${from.lat};${to.lng},${to.lat}`,
    false
  );
  return routes[0] ?? null;
}

/** @deprecated use fetchOsrmRoutes */
export async function fetchOsrmFootRoutes(
  from: LatLng,
  to: LatLng,
  alternatives: boolean | number = true
) {
  return fetchOsrmRoutes(from, to, "walk", alternatives);
}

/** @deprecated use fetchOsrmTo */
export async function fetchOsrmFootTo(from: LatLng, to: LatLng) {
  return fetchOsrmTo(from, to, "walk");
}
