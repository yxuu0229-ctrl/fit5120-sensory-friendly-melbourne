import type { SupabaseClient } from "@supabase/supabase-js";
import type { DensityLevel, SensorDensityCurrent } from "@/lib/types";

/** Agreed interactive SLA for sensor detail queries (AC 2.2.7). */
export const DETAIL_VIEW_SLA_MS = 2000;

export type PedestrianLivePoint = {
  sensing_datetime: string;
  total_count: number;
  density_level: DensityLevel;
  direction_1: number;
  direction_2: number;
};

export type SensorDetailResult = {
  locationId: number;
  sensor: SensorDensityCurrent | null;
  series: PedestrianLivePoint[];
  /** Wall-clock duration of the Supabase queries in milliseconds. */
  queryMs: number;
  slaMs: number;
  withinSla: boolean;
};

/**
 * Detail-view query: current sensor snapshot + past-hour time series
 * for one location_id. Timed for AC 2.2.7 verification.
 */
export async function fetchSensorDetail(
  supabase: SupabaseClient,
  locationId: number
): Promise<SensorDetailResult> {
  const started = performance.now();

  const [sensorRes, seriesRes] = await Promise.all([
    supabase
      .from("sensor_density_current")
      .select("*")
      .eq("location_id", locationId)
      .maybeSingle(),
    supabase
      .from("pedestrian_live")
      .select(
        "sensing_datetime, total_count, density_level, direction_1, direction_2"
      )
      .eq("location_id", locationId)
      .order("sensing_datetime", { ascending: false })
      .limit(120),
  ]);

  const queryMs = Math.round(performance.now() - started);

  if (sensorRes.error) throw new Error(sensorRes.error.message);
  if (seriesRes.error) throw new Error(seriesRes.error.message);

  const series = ([...(seriesRes.data || [])] as PedestrianLivePoint[]).reverse();

  return {
    locationId,
    sensor: (sensorRes.data as SensorDensityCurrent | null) ?? null,
    series,
    queryMs,
    slaMs: DETAIL_VIEW_SLA_MS,
    withinSla: queryMs <= DETAIL_VIEW_SLA_MS,
  };
}
