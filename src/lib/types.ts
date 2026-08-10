export type DensityLevel = "Low" | "Medium" | "High";

export type SensorDensityCurrent = {
  location_id: number;
  sensor_name: string | null;
  latitude: number;
  longitude: number;
  in_cbd: boolean | null;
  total_count: number;
  density_level: DensityLevel;
  sensing_datetime: string | null;
  updated_at: string;
};

/**
 * Typical pedestrian volume for one sensor at one weekday-hour.
 * `is_reliable` is computed during sync from `sample_count`; consumers must not
 * re-derive it, so the threshold lives in exactly one place.
 */
export type LocationQuietWindow = {
  location_id: number;
  day_name: string;
  hourday: number;
  mean: number;
  median: number;
  std: number;
  sample_count: number;
  is_reliable: boolean;
  updated_at: string;
};

export type Place = {
  id: string;
  name: string;
  category: string | null;
  theme: string | null;
  sub_theme: string | null;
  source: string;
  is_sensory_refuge: boolean;
  in_cbd: boolean | null;
  latitude: number;
  longitude: number;
  updated_at: string;
};

export type SyncRun = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "error";
  mode: string;
  rows_upserted: Record<string, number>;
  error: string | null;
};
