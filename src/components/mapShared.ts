import type { LatLng } from "../lib/geo";
import type { SensorReading } from "../lib/journeyData";

export type RouteEndpoints = { from: LatLng; to: LatLng };

export const melbourneCenter: [number, number] = [-37.8136, 144.9631];
export const destinationMarkerColor = "#2563eb";

export function densityColor(level: SensorReading["density_level"]) {
  if (level === "Low") return "#2f9f59";
  if (level === "Medium") return "#d2b538";
  return "#c8573f";
}
