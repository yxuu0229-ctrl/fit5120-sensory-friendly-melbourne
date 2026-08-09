import { haversineMeters, midpoint, sampleLine, type LatLng } from "./geo";
import { fetchOsrmRoutes, type OsrmRoute } from "./osrm";
import type { PlannedTrip, RouteLeg } from "./planTypes";
import { legColor } from "./planTypes";
import type { OsrmProfile, TransportMode } from "./transportModes";
import type { DensityLevel, SensorDensityCurrent } from "./types";

const DENSITY_WEIGHT: Record<DensityLevel, number> = {
  Low: 0,
  Medium: 2,
  High: 5,
};

function scoreRoute(
  route: OsrmRoute,
  sensors: SensorDensityCurrent[],
  radiusMeters = 90
): number {
  const samples = sampleLine(route.coordinates, 45);
  if (samples.length === 0) return Number.POSITIVE_INFINITY;

  let total = 0;
  for (const p of samples) {
    let nearestPenalty = 0.4;
    let nearestDist = Infinity;
    for (const s of sensors) {
      const d = haversineMeters(p, {
        lat: s.latitude,
        lng: s.longitude,
      });
      if (d < nearestDist && d <= radiusMeters) {
        nearestDist = d;
        nearestPenalty = DENSITY_WEIGHT[s.density_level] ?? 1;
      }
    }
    total += nearestPenalty;
  }

  const lengthFactor = route.distanceMeters / 1000;
  return total / samples.length + lengthFactor * 0.15;
}

function pickQuietWaypoint(
  from: LatLng,
  to: LatLng,
  sensors: SensorDensityCurrent[]
): LatLng | null {
  const mid = midpoint(from, to);
  const corridor = haversineMeters(from, to);

  const candidates = sensors
    .filter((s) => s.density_level === "Low")
    .map((s) => {
      const p = { lat: s.latitude, lng: s.longitude };
      const toMid = haversineMeters(p, mid);
      const toA = haversineMeters(p, from);
      const toB = haversineMeters(p, to);
      return { p, toMid, toA, toB };
    })
    .filter(
      (c) =>
        c.toMid < corridor * 0.55 &&
        c.toA > 120 &&
        c.toB > 120 &&
        c.toA + c.toB < corridor * 1.8
    )
    .sort((a, b) => a.toMid - b.toMid);

  return candidates[0]?.p ?? null;
}

function toPositions(coords: [number, number][]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng]);
}

function tripFromOsrm(
  mode: TransportMode,
  profile: OsrmProfile,
  route: OsrmRoute,
  label: string,
  extras?: Partial<PlannedTrip>
): PlannedTrip {
  const positions = toPositions(route.coordinates);
  const legMode =
    profile === "foot" ? "walk" : profile === "bike" ? "cycle" : "drive";
  const leg: RouteLeg = {
    mode: legMode,
    label,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    positions,
    color: legColor(legMode),
  };
  return {
    mode,
    label,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    legs: [leg],
    allPositions: positions,
    via: null,
    ...extras,
  };
}

/** Walk with quieter alternatives (density-aware). */
export async function planQuietWalkingRoute(
  from: LatLng,
  to: LatLng,
  sensors: SensorDensityCurrent[]
): Promise<PlannedTrip> {
  const direct = await fetchOsrmRoutes(from, to, "foot");
  const via = pickQuietWaypoint(from, to, sensors);

  let candidates: Array<{
    route: OsrmRoute;
    via: LatLng | null;
    label: string;
  }> = direct.map((route, i) => ({
    route,
    via: null,
    label: i === 0 ? "Direct walk (OSRM)" : `Walk alternative ${i + 1}`,
  }));

  if (via) {
    try {
      const viaRoutes = await fetchOsrmRoutes(from, to, "foot", via);
      candidates = candidates.concat(
        viaRoutes.map((route, i) => ({
          route,
          via,
          label:
            i === 0
              ? "Walk via quieter sensor area"
              : `Quiet walk alternative ${i + 1}`,
        }))
      );
    } catch {
      // keep direct
    }
  }

  let best = candidates[0];
  let bestScore = scoreRoute(best.route, sensors);
  for (let i = 1; i < candidates.length; i++) {
    const score = scoreRoute(candidates[i].route, sensors);
    if (score < bestScore) {
      best = candidates[i];
      bestScore = score;
    }
  }

  return tripFromOsrm("walk", "foot", best.route, best.label, {
    crowdScore: Number(bestScore.toFixed(3)),
    alternativesConsidered: candidates.length,
    via: best.via,
  });
}

/** Cycle or drive via OSRM (shortest/fastest alternative). */
export async function planOsrmModeRoute(
  mode: "cycle" | "drive",
  from: LatLng,
  to: LatLng
): Promise<PlannedTrip> {
  const profile: OsrmProfile = mode === "cycle" ? "bike" : "driving";
  const routes = await fetchOsrmRoutes(from, to, profile);
  const route = routes[0];
  return tripFromOsrm(
    mode,
    profile,
    route,
    mode === "cycle" ? "Cycle (OSRM)" : "Drive (OSRM)",
    { alternativesConsidered: routes.length }
  );
}
