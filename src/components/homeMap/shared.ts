import type { PlannedTrip } from "../../lib/planTypes";

export type HomeMapMode = "chill" | "heat" | "navigate";

export type LocationPoint = { name: string; lat: number; lng: number };

// A planned trip annotated with the sensory threshold warnings along it
export type RankedTrip = PlannedTrip & { warnings: number };

// Carlton center coordinate (Pelham St & Berkeley St area, where Seven Seeds & The Spot are located)
export const CARLTON = { lat: -37.8030, lng: 144.9598 };

// Map center fallback for Carlton
export const CARLTON_COORDS: [number, number] = [CARLTON.lat, CARLTON.lng];

// Helper to format sensor details
export const getSensorColor = (level: string) => {
  if (level === "Low") return "#1EC700"; // Clean Green
  if (level === "Medium") return "#FFD11B"; // Warm Yellow
  return "#DD3333"; // Dangerous Red
};

// Simulated sound level based on pedestrian counts: 30db to 85db
export const sensorSoundLevel = (totalCount: number) =>
  30 + Math.min(55, Math.round(totalCount * 0.3));
