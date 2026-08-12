import { getSupabase, hasSupabaseEnv } from "./supabaseClient";
import type { SensorReading } from "../lib/types";

type DensityRow = SensorReading & { in_cbd?: boolean | null };
type SensorRow = {
  location_id: number;
  sensor_name: string | null;
  latitude: number | null;
  longitude: number | null;
};

export const MOCK_FALLBACK_SENSORS: SensorReading[] = [
  { location_id: 1, sensor_name: "Flinders St Station", latitude: -37.8180, longitude: 144.9671, density_level: "High", total_count: 320 },
  { location_id: 2, sensor_name: "Bourke St Mall", latitude: -37.8130, longitude: 144.9650, density_level: "High", total_count: 280 },
  { location_id: 3, sensor_name: "Southern Cross", latitude: -37.8184, longitude: 144.9525, density_level: "Medium", total_count: 140 },
  { location_id: 4, sensor_name: "Melbourne Central", latitude: -37.8102, longitude: 144.9628, density_level: "High", total_count: 260 },
  { location_id: 5, sensor_name: "State Library", latitude: -37.8098, longitude: 144.9652, density_level: "Medium", total_count: 120 },
  { location_id: 6, sensor_name: "Federation Square", latitude: -37.8180, longitude: 144.9690, density_level: "High", total_count: 310 },
  { location_id: 7, sensor_name: "Queen Victoria Market", latitude: -37.8076, longitude: 144.9568, density_level: "Low", total_count: 35 },
  { location_id: 8, sensor_name: "Docklands Library", latitude: -37.8194, longitude: 144.9450, density_level: "Low", total_count: 20 },
  { location_id: 9, sensor_name: "Southbank Promenade", latitude: -37.8210, longitude: 144.9640, density_level: "Medium", total_count: 110 },
  { location_id: 10, sensor_name: "Flagstaff Gardens", latitude: -37.8105, longitude: 144.9545, density_level: "Low", total_count: 15 },
];

/** All Melbourne sensors with live density when available; otherwise fallback / Supabase data. */
export async function fetchDensitySensors(): Promise<SensorReading[]> {
  if (!hasSupabaseEnv()) return MOCK_FALLBACK_SENSORS;
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
