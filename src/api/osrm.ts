import type { LatLng } from "../lib/types";
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

async function requestRoute(
  profile: "foot" | "bike" | "driving",
  coords: string,
  alternatives: boolean | number
): Promise<OsrmRoute[]> {
  const url = `${baseUrl()}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&alternatives=${alternatives}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const body = (await res.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
      geometry?: { coordinates?: [number, number][] };
    }>;
  };
  return (body.routes ?? []).map((r) => ({
    distanceMeters: r.distance,
    durationSeconds: r.duration,
    coordinates: r.geometry?.coordinates ?? [],
  }));
}

export async function fetchOsrmRoutes(
  from: LatLng,
  to: LatLng,
  mode: TransportMode,
  alternatives: boolean | number = 3
): Promise<OsrmRoute[]> {
  const profile = osrmProfile(mode);
  if (!profile) return [];

  const direct = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const routes = await requestRoute(profile, direct, alternatives);

  // Ask OSRM for more variety when a profile returns few alternatives.
  if (routes.length < 3 && (mode === "walk" || mode === "cycle" || mode === "drive")) {
    const midLat = (from.lat + to.lat) / 2;
    const midLng = (from.lng + to.lng) / 2;
    const spread = mode === "drive" ? 0.006 : mode === "cycle" ? 0.005 : 0.004;
    const offsets = [
      { lat: midLat + spread, lng: midLng - spread * 0.75 },
      { lat: midLat - spread * 0.75, lng: midLng + spread },
    ];
    for (const via of offsets) {
      if (routes.length >= 3) break;
      try {
        const viaPath = `${from.lng},${from.lat};${via.lng},${via.lat};${to.lng},${to.lat}`;
        const extra = await requestRoute(profile, viaPath, false);
        if (extra[0]?.coordinates.length) routes.push(extra[0]);
      } catch {
        // ignore
      }
    }
  }

  return routes;
}

export async function fetchOsrmTo(
  from: LatLng,
  to: LatLng,
  mode: TransportMode = "walk"
): Promise<OsrmRoute | null> {
  const profile = osrmProfile(mode) ?? "foot";
  const routes = await requestRoute(
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
  alternatives: boolean | number = 3
) {
  return fetchOsrmRoutes(from, to, "walk", alternatives);
}

/** @deprecated use fetchOsrmTo */
export async function fetchOsrmFootTo(from: LatLng, to: LatLng) {
  return fetchOsrmTo(from, to, "walk");
}
