import { distanceMeters } from "./geo";

export const routeSensorRadiusMeters = 500;

export type SensorLike = {
  latitude: number;
  longitude: number;
  density_level: "Low" | "Medium" | "High";
};

export type CongestionArea = {
  level: SensorLike["density_level"];
  count: number;
  lat: number;
  lng: number;
};

const densityLevels: SensorLike["density_level"][] = ["Low", "Medium", "High"];

/**
 * Filters sensors down to those within `radiusMeters` of any point on `routePath`.
 *
 * QUIRK (intentional, do not "fix"): when `routePath.length <= 1` there is no
 * meaningful route to measure against, so this returns ALL sensors
 * unfiltered. Callers that need an empty result for an unrouted map must
 * guard for that themselves (see App.tsx's routeHighSensors).
 */
export function sensorsNearRoute<T extends SensorLike>(
  routePath: [number, number][],
  sensors: T[],
  radiusMeters: number = routeSensorRadiusMeters
): T[] {
  if (routePath.length <= 1) return sensors;

  return sensors.filter((sensor) =>
    routePath.some(
      ([lat, lng]) =>
        distanceMeters({ lat, lng }, { lat: sensor.latitude, lng: sensor.longitude }) <=
        radiusMeters
    )
  );
}

/**
 * Groups sensors near the route into per-density-level congestion areas,
 * each centred on the mean lat/lng of its matching sensors. Levels with no
 * matches are omitted; remaining levels are returned in Low, Medium, High
 * order.
 */
export function congestionAreas(
  routePath: [number, number][],
  sensors: SensorLike[],
  radiusMeters: number = routeSensorRadiusMeters
): CongestionArea[] {
  const nearby = sensorsNearRoute(routePath, sensors, radiusMeters);

  return densityLevels
    .map((level) => {
      const matches = nearby.filter((sensor) => sensor.density_level === level);
      if (!matches.length) return null;

      return {
        level,
        count: matches.length,
        lat: matches.reduce((sum, sensor) => sum + sensor.latitude, 0) / matches.length,
        lng: matches.reduce((sum, sensor) => sum + sensor.longitude, 0) / matches.length,
      };
    })
    .filter((area): area is CongestionArea => Boolean(area));
}

/**
 * Returns the High-density sensors near the route, preserving full input
 * objects.
 *
 * QUIRK (inherited from sensorsNearRoute): when `routePath.length <= 1` this
 * returns ALL High sensors, not none. App.tsx opts out of this by guarding
 * with its own empty-path check before calling in.
 */
export function highDensitySensorsNearRoute<T extends SensorLike>(
  routePath: [number, number][],
  sensors: T[],
  radiusMeters: number = routeSensorRadiusMeters
): T[] {
  return sensorsNearRoute(routePath, sensors, radiusMeters).filter(
    (sensor) => sensor.density_level === "High"
  );
}
