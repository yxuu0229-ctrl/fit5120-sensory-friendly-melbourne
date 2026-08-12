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

export type TransitLeg = {
  kind: "tram" | "train" | "bus" | "transit" | "walk";
  line: string;
  vehicleName: string;
  headsign: string | null;
  fromStop: string | null;
  toStop: string | null;
  departsAt: string | null;
  arrivesAt: string | null;
  stopCount: number | null;
  color: string | null;
};

/** Coloured polyline slice for one mode on a journey. */
export type RouteSegment = {
  mode: "walk" | "cycle" | "drive" | "tram" | "train" | "bus" | "transit";
  color: string;
  label?: string;
  positions: [number, number][];
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
  /** Populated for public-transport plans. */
  transitLegs?: TransitLeg[];
  /** Coloured map segments by mode (walk/tram/bus/…). */
  segments?: RouteSegment[];
};

export type QuietAlert = {
  locationId?: number;
  areaName: string;
  periodLabel: string;
  expectedMean: number | null;
  currentCount?: number | null;
  densityLevel: DensityLevel;
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
