import type { TransportMode } from "./transportModes";

/** Map / UI colours for each travel mode on a journey. */
export const MODE_COLORS = {
  walk: "#2f6f4e",
  cycle: "#1f7a6a",
  drive: "#1d4e6f",
  tram: "#c45c26",
  train: "#5b3d8f",
  bus: "#b07d2a",
  transit: "#4a5560",
} as const;

export type SegmentMode = keyof typeof MODE_COLORS;

export function colorForMode(mode: SegmentMode | TransportMode): string {
  return MODE_COLORS[mode as SegmentMode] ?? MODE_COLORS.walk;
}

export function labelForSegmentMode(mode: SegmentMode): string {
  if (mode === "walk") return "Walk";
  if (mode === "cycle") return "Cycle";
  if (mode === "drive") return "Drive";
  if (mode === "tram") return "Tram";
  if (mode === "train") return "Train";
  if (mode === "bus") return "Bus";
  return "Transit";
}
