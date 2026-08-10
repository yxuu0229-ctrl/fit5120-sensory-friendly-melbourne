import type { LatLng } from "./geo";
import type { OsrmProfile } from "./transportModes";

export type OsrmRoute = {
  distanceMeters: number;
  durationSeconds: number;
  /** GeoJSON LineString coordinates as [lng, lat][] */
  coordinates: [number, number][];
};

const DEFAULT_OSRM = "https://router.project-osrm.org";

function baseUrl() {
  const env = import.meta.env as Record<string, string | undefined>;
  const configured = env.VITE_OSRM_URL || env.NEXT_PUBLIC_OSRM_URL;
  return configured?.replace(/\/$/, "") || DEFAULT_OSRM;
}

/**
 * Open-source OSRM router (OpenStreetMap graph).
 * Profiles: foot | bike | driving
 */
export async function fetchOsrmRoutes(
  from: LatLng,
  to: LatLng,
  profile: OsrmProfile,
  via?: LatLng | null
): Promise<OsrmRoute[]> {
  const points = via
    ? `${from.lng},${from.lat};${via.lng},${via.lat};${to.lng},${to.lat}`
    : `${from.lng},${from.lat};${to.lng},${to.lat}`;

  const url =
    `${baseUrl()}/route/v1/${profile}/${points}` +
    `?overview=full&geometries=geojson&alternatives=${via ? "false" : "true"}&steps=false`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    code?: string;
    message?: string;
    routes?: Array<{
      distance: number;
      duration: number;
      geometry?: { coordinates?: [number, number][] };
    }>;
  };

  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(data.message || `No ${profile} route found`);
  }

  return data.routes
    .filter((r) => r.geometry?.coordinates?.length)
    .map((r) => ({
      distanceMeters: r.distance,
      durationSeconds: r.duration,
      coordinates: r.geometry!.coordinates!,
    }));
}

/** @deprecated use fetchOsrmRoutes(..., "foot") */
export async function fetchWalkingRoutes(
  from: LatLng,
  to: LatLng,
  via?: LatLng | null
): Promise<OsrmRoute[]> {
  return fetchOsrmRoutes(from, to, "foot", via);
}
