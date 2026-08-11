import { checkCoverage, type CoverageNotice } from "./coverage";
import { buildProvenance, type DataProvenance } from "./dataProvenance";
import type { LatLng } from "./geo";
import type { PlannedTrip } from "./planTypes";
import { planOsrmModeRoute, planQuietWalkingRoute } from "./quietRoute";
import { getSupabase, hasSupabaseEnv } from "./supabase";
import type { TransportMode } from "./transportModes";
import type { SensorDensityCurrent } from "./types";

export type PlanRouteResult = {
  trip?: PlannedTrip;
  /** AC 1.1.4: ordered lowest → highest sensory indicator. */
  trips?: PlannedTrip[];
  coverage?: CoverageNotice | null;
  dataProvenance?: DataProvenance | null;
};

/**
 * Plan an A→B trip for the live map. Formerly POST /api/route/plan in the
 * retired Next.js app — now runs in the browser against Supabase + OSRM.
 */
export async function planRoute(
  from: LatLng,
  to: LatLng,
  mode: TransportMode
): Promise<PlanRouteResult> {
  // AC 1.1.6 — points outside the sensor footprint are a coverage limit, not
  // an error. Only walking depends on that data, so only walking is blocked;
  // every other mode still routes and carries the notice as context.
  const coverage = checkCoverage(from, to, mode === "walk");
  if (coverage?.blocking) {
    return { coverage };
  }

  if (mode === "cycle" || mode === "drive") {
    const trip = await planOsrmModeRoute(mode, from, to);
    return { trip, coverage };
  }

  // walk (default) — density-aware
  let sensors: SensorDensityCurrent[] = [];
  let densityAvailable = true;
  try {
    if (!hasSupabaseEnv()) throw new Error("Supabase env is not configured");
    const { data, error } = await getSupabase()
      .from("sensor_density_current")
      .select("*");
    // Supabase reports failures in `error` rather than throwing, so an
    // unchecked destructure would degrade silently.
    if (error) throw error;
    sensors = (data || []) as SensorDensityCurrent[];
  } catch {
    sensors = [];
    densityAvailable = false;
  }
  // AC 1.1.7 / 1.3.6 / 2.1.3 — the route always runs on cached readings, so
  // say which ones and how old they are rather than implying they are live.
  const dataProvenance = buildProvenance(sensors, densityAvailable);
  const { trip, trips } = await planQuietWalkingRoute(from, to, sensors);
  return { trip, trips, coverage, dataProvenance };
}
