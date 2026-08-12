import { getSupabase, hasSupabaseEnv } from "./supabaseClient";
import type { SensorReading } from "../lib/types";

type DensityRow = SensorReading & { in_cbd?: boolean | null };
type SensorRow = {
  location_id: number;
  sensor_name: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** All Melbourne sensors with live density when available; otherwise Low/0 placeholder. */
export async function fetchDensitySensors(): Promise<SensorReading[]> {
  if (!hasSupabaseEnv()) return [];
  const sb = getSupabase();
  const [densityRes, sensorRes] = await Promise.all([
    sb
      .from("sensor_density_current")
      .select(
        "location_id,sensor_name,latitude,longitude,density_level,total_count,sensing_datetime"
      ),
    sb
      .from("sensors")
      .select("location_id,sensor_name,latitude,longitude"),
  ]);
  if (densityRes.error) throw densityRes.error;
  if (sensorRes.error) throw sensorRes.error;

  const live = new Map<number, SensorReading>();
  for (const row of (densityRes.data ?? []) as DensityRow[]) {
    if (row.latitude == null || row.longitude == null) continue;
    live.set(row.location_id, {
      location_id: row.location_id,
      sensor_name: row.sensor_name,
      latitude: row.latitude,
      longitude: row.longitude,
      density_level: row.density_level,
      total_count: row.total_count,
      sensing_datetime: row.sensing_datetime,
    });
  }

  const merged: SensorReading[] = [];
  const seen = new Set<number>();
  for (const row of (sensorRes.data ?? []) as SensorRow[]) {
    if (row.latitude == null || row.longitude == null) continue;
    seen.add(row.location_id);
    const current = live.get(row.location_id);
    merged.push(
      current ?? {
        location_id: row.location_id,
        sensor_name: row.sensor_name,
        latitude: row.latitude,
        longitude: row.longitude,
        density_level: "Low",
        total_count: 0,
        sensing_datetime: null,
      }
    );
  }

  // Include any density rows not present in sensors master (edge case).
  for (const [id, row] of live) {
    if (!seen.has(id)) merged.push(row);
  }

  return merged;
}

export function overloadSensors(sensors: SensorReading[]) {
  return sensors.filter(
    (s) => s.density_level === "High" || s.density_level === "Medium"
  );
}
