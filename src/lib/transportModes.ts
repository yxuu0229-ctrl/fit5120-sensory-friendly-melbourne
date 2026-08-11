export type TransportMode = "walk" | "cycle" | "drive";

export type OsrmProfile = "foot" | "bike" | "driving";

export const MODE_OPTIONS: Array<{
  id: TransportMode;
  label: string;
  hint: string;
}> = [
  { id: "walk", label: "Walk", hint: "Quieter footpaths (OSRM + density)" },
  { id: "cycle", label: "Cycle", hint: "Bike routing (OSRM)" },
  { id: "drive", label: "Drive", hint: "Car routing (OSRM)" },
];

export function osrmProfileForMode(mode: TransportMode): OsrmProfile | null {
  if (mode === "walk") return "foot";
  if (mode === "cycle") return "bike";
  if (mode === "drive") return "driving";
  return null;
}
