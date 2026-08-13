/** Map / UI colours for each travel mode — clearly distinct on transit maps. */
export const MODE_COLORS = {
  walk: "#2f6f4e",
  cycle: "#0e8f9a",
  drive: "#1a4f8c",
  tram: "#e85d04",
  train: "#5b3d8f",
  bus: "#d4a017",
  transit: "#4a5560",
} as const;

export type SegmentMode = keyof typeof MODE_COLORS;

export function colorForMode(mode: SegmentMode | string): string {
  return MODE_COLORS[mode as SegmentMode] ?? MODE_COLORS.walk;
}

export function labelForSegmentMode(mode: SegmentMode | string): string {
  if (mode === "walk") return "Walk";
  if (mode === "cycle") return "Cycle";
  if (mode === "drive") return "Drive";
  if (mode === "tram") return "Tram";
  if (mode === "train") return "Train";
  if (mode === "bus") return "Bus";
  return "Transit";
}
