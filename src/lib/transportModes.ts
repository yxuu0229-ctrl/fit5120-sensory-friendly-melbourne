export type TransportMode = "walk" | "cycle" | "drive" | "transit";

export const TRANSPORT_MODES: Array<{
  id: TransportMode;
  label: string;
}> = [
  { id: "walk", label: "Walk" },
  { id: "cycle", label: "Cycle" },
  { id: "drive", label: "Drive" },
  { id: "transit", label: "Transit" },
];

export function osrmProfile(mode: TransportMode): "foot" | "bike" | "driving" | null {
  if (mode === "walk") return "foot";
  if (mode === "cycle") return "bike";
  if (mode === "drive") return "driving";
  return null;
}
