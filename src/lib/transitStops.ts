import { distanceToRouteMeters } from "./geo";

/**
 * AC 1.1.5 — public transport access points shown as part of walking routes.
 *
 * The project has no live PTV feed, so this is a fixed list of Melbourne CBD
 * railway stations and major tram platform stops (WGS84). Coordinates are
 * approximate street-level access points, close enough for the 150 m
 * near-route radius used below.
 */
export type TransitStop = {
  id: string;
  name: string;
  kind: "Train" | "Tram";
  latitude: number;
  longitude: number;
};

export const CBD_TRANSIT_STOPS: TransitStop[] = [
  { id: "flinders-street", name: "Flinders Street Station", kind: "Train", latitude: -37.8183, longitude: 144.9671 },
  { id: "southern-cross", name: "Southern Cross Station", kind: "Train", latitude: -37.8184, longitude: 144.9525 },
  { id: "melbourne-central", name: "Melbourne Central Station", kind: "Train", latitude: -37.81, longitude: 144.9628 },
  { id: "parliament", name: "Parliament Station", kind: "Train", latitude: -37.811, longitude: 144.973 },
  { id: "flagstaff", name: "Flagstaff Station", kind: "Train", latitude: -37.8119, longitude: 144.956 },
  { id: "bourke-st-mall", name: "Bourke Street Mall tram stop", kind: "Tram", latitude: -37.8136, longitude: 144.964 },
  { id: "federation-square", name: "Federation Square tram stop", kind: "Tram", latitude: -37.8177, longitude: 144.9691 },
  { id: "town-hall", name: "Melbourne Town Hall tram stop", kind: "Tram", latitude: -37.8152, longitude: 144.9668 },
  { id: "state-library", name: "State Library tram stop", kind: "Tram", latitude: -37.8098, longitude: 144.9646 },
  { id: "queen-victoria-market", name: "Queen Victoria Market tram stop", kind: "Tram", latitude: -37.8076, longitude: 144.9568 },
  { id: "spring-street", name: "Spring Street tram stop", kind: "Tram", latitude: -37.8134, longitude: 144.973 },
];

export const TRANSIT_NEAR_ROUTE_METERS = 150;

export type TransitStopNearRoute = TransitStop & { distanceMeters: number };

/**
 * Access points within `radiusMeters` of the route path, nearest first.
 * Fewer than two path points means no route to measure against => [].
 */
export function transitStopsNearRoute(
  routePath: [number, number][],
  radiusMeters: number = TRANSIT_NEAR_ROUTE_METERS
): TransitStopNearRoute[] {
  if (routePath.length < 2) return [];

  return CBD_TRANSIT_STOPS.map((stop) => ({
    ...stop,
    distanceMeters: Math.round(
      distanceToRouteMeters({ lat: stop.latitude, lng: stop.longitude }, routePath)
    ),
  }))
    .filter((stop) => stop.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
