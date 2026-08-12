export type LatLng = { lat: number; lng: number };

export type DensityLevel = "Low" | "Medium" | "High";

export type SensoryIndicator = "Low" | "High";

export type SensorReading = {
  location_id: number;
  sensor_name: string | null;
  latitude: number;
  longitude: number;
  density_level: DensityLevel;
  total_count: number;
  sensing_datetime: string | null;
};

export type RefugePlace = {
  id: string;
  name: string;
  category: string | null;
  theme: string | null;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
};

export type PlaceResult = {
  label: string;
  placeId?: string;
  point: LatLng;
};

export type RouteOption = {
  id: string;
  rank: number;
  label: string;
  recommended: boolean;
  sensoryLoad: number;
  indicator: SensoryIndicator;
  distanceMeters: number;
  durationSeconds: number;
  positions: [number, number][];
};

export type QuietAlert = {
  areaName: string;
  periodLabel: string;
  expectedMean: number | null;
  reliable: boolean;
  point: LatLng;
};

export type LocationQuietWindow = {
  location_id: number;
  day_name: string;
  hourday: number;
  mean: number;
  sample_count: number;
  is_reliable: boolean;
};
