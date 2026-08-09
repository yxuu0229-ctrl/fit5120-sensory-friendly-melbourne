import { haversineMeters, type LatLng } from "./geo";
import { fetchOsrmRoutes } from "./osrm";
import type { PlannedTrip, RouteLeg, RouteLegMode } from "./planTypes";
import { legColor } from "./planTypes";
import {
  nextDeparture,
  stopDetails,
  stopsNear,
  stopsOnRoute,
  type PtvRoute,
  type PtvStop,
} from "./ptvServer";
import {
  ptvRouteTypesForMode,
  routeTypeLabel,
  type TransportMode,
} from "./transportModes";

function transitLegMode(routeType: number): RouteLegMode {
  if (routeType === 0) return "train";
  if (routeType === 1) return "tram";
  if (routeType === 2 || routeType === 4) return "bus";
  if (routeType === 3) return "vline";
  return "transit";
}

function stopLatLng(s: PtvStop): LatLng {
  return { lat: s.stop_latitude, lng: s.stop_longitude };
}

async function walkLeg(
  from: LatLng,
  to: LatLng,
  fromName: string,
  toName: string
): Promise<RouteLeg> {
  const routes = await fetchOsrmRoutes(from, to, "foot");
  const r = routes[0];
  return {
    mode: "walk",
    label: `Walk: ${fromName} → ${toName}`,
    fromName,
    toName,
    distanceMeters: r.distanceMeters,
    durationSeconds: r.durationSeconds,
    positions: r.coordinates.map(([lng, lat]) => [lat, lng]),
    color: legColor("walk"),
  };
}

type Candidate = {
  origin: PtvStop;
  dest: PtvStop;
  route: PtvRoute;
  score: number;
};

async function routesForStop(stop: PtvStop): Promise<PtvRoute[]> {
  try {
    const details = await stopDetails(stop.stop_id, stop.route_type);
    return (details.routes || []).filter(
      (r) => r.route_type === stop.route_type || r.route_type == null
    );
  } catch {
    return [];
  }
}

/**
 * Simple PTV-based journey:
 * walk to nearby stop → ride shared route → walk to destination.
 * PTV Timetable API has no official A→B planner; this uses stops/routes/departures.
 */
export async function planPtvTransitTrip(
  from: LatLng,
  to: LatLng,
  mode: TransportMode
): Promise<PlannedTrip> {
  const routeTypes = ptvRouteTypesForMode(mode);
  const [originStops, destStops] = await Promise.all([
    stopsNear(from.lat, from.lng, 1000, routeTypes),
    stopsNear(to.lat, to.lng, 1000, routeTypes),
  ]);

  if (!originStops.length) {
    throw new Error("No PTV stops found near start (A)");
  }
  if (!destStops.length) {
    throw new Error("No PTV stops found near end (B)");
  }

  // Limit API fan-out
  const originSample = originStops.slice(0, 8);
  const destSample = destStops.slice(0, 8);

  const originRoutes = await Promise.all(
    originSample.map(async (s) => ({ stop: s, routes: await routesForStop(s) }))
  );

  const destRouteIds = new Map<number, PtvStop[]>();
  await Promise.all(
    destSample.map(async (s) => {
      const routes = await routesForStop(s);
      for (const r of routes) {
        const list = destRouteIds.get(r.route_id) || [];
        list.push(s);
        destRouteIds.set(r.route_id, list);
      }
    })
  );

  const candidates: Candidate[] = [];
  for (const { stop: origin, routes } of originRoutes) {
    for (const route of routes) {
      const destMatches = destRouteIds.get(route.route_id);
      if (!destMatches?.length) continue;
      for (const dest of destMatches) {
        if (dest.stop_id === origin.stop_id) continue;
        if (
          routeTypes.length &&
          !routeTypes.includes(route.route_type ?? origin.route_type)
        ) {
          continue;
        }
        const walkIn = origin.stop_distance ?? haversineMeters(from, stopLatLng(origin));
        const walkOut = dest.stop_distance ?? haversineMeters(to, stopLatLng(dest));
        const rideEst = haversineMeters(stopLatLng(origin), stopLatLng(dest));
        candidates.push({
          origin,
          dest,
          route,
          score: walkIn + walkOut + rideEst * 0.55,
        });
      }
    }
  }

  if (!candidates.length) {
    throw new Error(
      "No shared PTV route found between nearby stops. Try a different mode or points closer to the CBD network."
    );
  }

  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];
  const routeType = best.route.route_type ?? best.origin.route_type;

  const [routeStops, departure, legWalkIn, legWalkOut] = await Promise.all([
    stopsOnRoute(best.route.route_id, routeType),
    nextDeparture(routeType, best.origin.stop_id, best.route.route_id),
    walkLeg(from, stopLatLng(best.origin), "Start (A)", best.origin.stop_name),
    walkLeg(stopLatLng(best.dest), to, best.dest.stop_name, "End (B)"),
  ]);

  let transitPositions: [number, number][] = [
    [best.origin.stop_latitude, best.origin.stop_longitude],
    [best.dest.stop_latitude, best.dest.stop_longitude],
  ];

  if (routeStops.length) {
    const i0 = routeStops.findIndex((s) => s.stop_id === best.origin.stop_id);
    const i1 = routeStops.findIndex((s) => s.stop_id === best.dest.stop_id);
    if (i0 >= 0 && i1 >= 0) {
      const slice =
        i0 <= i1 ? routeStops.slice(i0, i1 + 1) : routeStops.slice(i1, i0 + 1).reverse();
      if (slice.length >= 2) {
        transitPositions = slice.map((s) => [
          s.stop_latitude,
          s.stop_longitude,
        ]);
      }
    }
  }

  const rideMeters = haversineMeters(
    stopLatLng(best.origin),
    stopLatLng(best.dest)
  );
  // Rough ride duration: ~25 km/h average for metro modes
  const rideSeconds = Math.max(180, (rideMeters / 25000) * 3600);

  const modeLabel = routeTypeLabel(routeType);
  const routeName =
    best.route.route_number || best.route.route_name || modeLabel;

  const transitLeg: RouteLeg = {
    mode: transitLegMode(routeType),
    label: `${modeLabel} ${routeName}${
      departure?.directionName ? ` · ${departure.directionName}` : ""
    }`,
    fromName: best.origin.stop_name,
    toName: best.dest.stop_name,
    distanceMeters: rideMeters,
    durationSeconds: rideSeconds,
    positions: transitPositions,
    departureUtc: departure?.estimated || departure?.scheduled || null,
    color: legColor(transitLegMode(routeType)),
  };

  const legs = [legWalkIn, transitLeg, legWalkOut];
  const allPositions = legs.flatMap((l) => l.positions);
  const distanceMeters = legs.reduce((s, l) => s + l.distanceMeters, 0);
  const durationSeconds = legs.reduce((s, l) => s + l.durationSeconds, 0);

  const notes = [
    "Built from PTV Timetable API (stops, routes, departures) — not an official journey planner.",
    `Board at ${best.origin.stop_name}`,
    `Alight at ${best.dest.stop_name}`,
  ];
  if (departure?.estimated || departure?.scheduled) {
    notes.push(
      `Next departure (UTC): ${departure.estimated || departure.scheduled}`
    );
  }

  return {
    mode,
    label: `PTV ${modeLabel}: ${routeName}`,
    distanceMeters,
    durationSeconds,
    legs,
    allPositions,
    alternativesConsidered: candidates.length,
    notes,
  };
}
