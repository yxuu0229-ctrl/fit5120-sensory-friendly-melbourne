import type { LatLng } from "./geo";
import type { TransportMode } from "./transportModes";

export type RouteLegMode = "walk" | "cycle" | "drive";

export type RouteLeg = {
  mode: RouteLegMode;
  label: string;
  fromName?: string;
  toName?: string;
  distanceMeters: number;
  durationSeconds: number;
  /** [lat, lng] for Leaflet */
  positions: [number, number][];
  color: string;
};

export type PlannedTrip = {
  mode: TransportMode;
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  /**
   * Sensory load indicator (AC 1.1.4). Lower = calmer.
   * Alias of crowdScore for listing/sorting.
   */
  sensoryIndicator?: number;
  /** @deprecated prefer sensoryIndicator — kept for existing UI copy */
  crowdScore?: number;
  alternativesConsidered?: number;
  rank?: number;
  via?: LatLng | null;
  legs: RouteLeg[];
  /** Flattened path for fitBounds */
  allPositions: [number, number][];
  notes?: string[];
};

export function legColor(mode: RouteLegMode): string {
  switch (mode) {
    case "walk":
      return "#0b5fff";
    case "cycle":
      return "#0a7a3e";
    case "drive":
      return "#5b3cc4";
    default:
      return "#333333";
  }
}
