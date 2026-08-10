import type { LatLng } from "./geo";

/**
 * Area covered by the City of Melbourne pedestrian sensor network.
 *
 * Quiet-route suggestions are only meaningful inside this box: outside it there
 * are no sensors, so every sampled point falls back to a neutral penalty and the
 * "quieter path" is really just the shortest path.
 *
 * NOTE: these bounds are duplicated from `CBD` in scripts/sync/src/config.js.
 * The two live in separate npm workspaces and there is no shared package yet, so
 * changing one means changing the other.
 */
export const COVERAGE_BOUNDS = {
  latMin: -37.825,
  latMax: -37.805,
  lngMin: 144.95,
  lngMax: 144.98,
} as const;

/** [south-west, north-east] corners, for Leaflet bounds. */
export const COVERAGE_RECTANGLE: [[number, number], [number, number]] = [
  [COVERAGE_BOUNDS.latMin, COVERAGE_BOUNDS.lngMin],
  [COVERAGE_BOUNDS.latMax, COVERAGE_BOUNDS.lngMax],
];

export function isWithinCoverage(p: LatLng): boolean {
  return (
    p.lat >= COVERAGE_BOUNDS.latMin &&
    p.lat <= COVERAGE_BOUNDS.latMax &&
    p.lng >= COVERAGE_BOUNDS.lngMin &&
    p.lng <= COVERAGE_BOUNDS.lngMax
  );
}

export type CoveragePoint = "start" | "destination";

export type CoverageNotice = {
  /** Which of the two chosen points fall outside the sensor area. */
  outside: CoveragePoint[];
  /** True when the request could not be served at all (walking only). */
  blocking: boolean;
  message: string;
};

function describe(outside: CoveragePoint[]): string {
  if (outside.length === 2) return "Your start point and destination are";
  return outside[0] === "start"
    ? "Your start point is"
    : "Your destination is";
}

/**
 * AC 1.1.6 — describe a coverage gap in plain language rather than failing.
 *
 * `blocking` is true only for walking, the one mode that depends on sensor
 * data. Cycling and driving are unaffected by the sensor footprint, so those
 * still return a route and carry the notice as context.
 */
export function checkCoverage(
  from: LatLng,
  to: LatLng,
  densityAware: boolean
): CoverageNotice | null {
  const outside: CoveragePoint[] = [];
  if (!isWithinCoverage(from)) outside.push("start");
  if (!isWithinCoverage(to)) outside.push("destination");
  if (outside.length === 0) return null;

  const subject = describe(outside);
  const plural = outside.length === 2 ? "s" : "";

  const message = densityAware
    ? `${subject} outside the Melbourne CBD pedestrian sensor area, so there ` +
      `is no crowd data to plan a quieter walking route here. Move the ` +
      `point${plural} inside the highlighted area, or choose another ` +
      `transport mode.`
    : `${subject} outside the Melbourne CBD pedestrian sensor area. This ` +
      `route is unaffected, but crowd-density information is not available ` +
      `outside the highlighted area.`;

  return { outside, blocking: densityAware, message };
}
