import type { LatLng } from "./geo";
import type { RouteCandidate } from "./journeyPlanning";

export type SensorReading = {
  location_id: number;
  sensor_name: string | null;
  latitude: number;
  longitude: number;
  density_level: "Low" | "Medium" | "High";
  total_count?: number;
  sensing_datetime?: string | null;
};

export type RefugePlace = {
  id: string;
  name: string;
  category: string | null;
  theme: string | null;
  sub_theme: string | null;
  source: string;
  latitude: number;
  longitude: number;
};

export type GeocodeResult = { label: string; point: LatLng };

export type PlannedTrip = {
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  crowdScore?: number;
  alternativesConsidered?: number;
  allPositions?: [number, number][];
};

export type WalkingRoutesResult = {
  candidates: RouteCandidate[];
  error: string | null; // only the backend-unavailable message, else null
  trip: PlannedTrip | null;
};

export const BACKEND_UNAVAILABLE_MESSAGE =
  "Backend route API is not available. Showing prototype route data.";

export interface JourneyData {
  /** Missing env => []; never throws. */
  sensorReadings(limit: number): Promise<SensorReading[]>;
  /** Returns UNFILTERED rows. Missing env => []; never throws. */
  sensoryRefuges(): Promise<RefugePlace[]>;
  walkingRoutes(from: LatLng, to: LatLng): Promise<WalkingRoutesResult>;
  /** No match/failure => null; never throws. */
  geocode(query: string): Promise<GeocodeResult | null>;
}
