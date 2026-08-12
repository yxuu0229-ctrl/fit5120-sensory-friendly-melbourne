import type { RouteExposure, SensoryIndicator } from "./types";

/**
 * Minimum share of a route that must run through a density band before the
 * badge reports it. At 45 m sampling this is roughly 180 m of a 1.8 km route —
 * a stretch the walker will notice, not a single incidental sample.
 */
export const MIN_EXPOSURE_SHARE = 0.1;

/**
 * Badge for a route.
 *
 * Two independent signals promote a route: the averaged load crossing the
 * user's threshold, and sustained exposure to Medium/High sensors. Exposure
 * matters because the average dilutes short busy stretches to near nothing — a
 * route past several Medium sensors can score a load of 12 against a threshold
 * of 50 and still be the busiest option on offer.
 */
export function indicatorForLoad(
  sensoryLoad: number,
  threshold: number,
  exposure?: RouteExposure
): SensoryIndicator {
  if (sensoryLoad > threshold) return "High";
  if (exposure && exposure.high >= MIN_EXPOSURE_SHARE) return "High";

  if (sensoryLoad > threshold / 2) return "Medium";
  if (exposure && exposure.medium >= MIN_EXPOSURE_SHARE) return "Medium";
  // Any High exposure at all is worth flagging, even if brief.
  if (exposure && exposure.high > 0) return "Medium";

  return "Low";
}

export function formatWalk(meters: number) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

export function formatMins(seconds: number) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}
