import { getSupabase, hasSupabaseEnv } from "./supabaseClient";
import type { SensorReading } from "../lib/types";

export async function fetchDensitySensors(): Promise<SensorReading[]> {
  if (!hasSupabaseEnv()) return [];
  const { data, error } = await getSupabase()
    .from("sensor_density_current")
    .select(
      "location_id,sensor_name,latitude,longitude,density_level,total_count,sensing_datetime"
    );
  if (error) throw error;
  return (data ?? []) as SensorReading[];
}

export function overloadSensors(sensors: SensorReading[]) {
  return sensors.filter(
    (s) => s.density_level === "High" || s.density_level === "Medium"
  );
}
