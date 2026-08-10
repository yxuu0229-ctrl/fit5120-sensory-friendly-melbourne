export type TransportMode =
  | "walk"
  | "cycle"
  | "drive"
  | "transit"
  | "train"
  | "tram"
  | "bus";

export type OsrmProfile = "foot" | "bike" | "driving";

/** PTV route_type values */
export const PTV_ROUTE_TYPES = {
  train: 0,
  tram: 1,
  bus: 2,
  vline: 3,
  nightBus: 4,
} as const;

export const MODE_OPTIONS: Array<{
  id: TransportMode;
  label: string;
  hint: string;
}> = [
  { id: "walk", label: "Walk", hint: "Quieter footpaths (OSRM + density)" },
  { id: "cycle", label: "Cycle", hint: "Bike routing (OSRM)" },
  { id: "drive", label: "Drive", hint: "Car routing (OSRM)" },
  {
    id: "transit",
    label: "Public transport",
    hint: "Train / tram / bus via PTV",
  },
  { id: "train", label: "Train", hint: "Metro / V/Line via PTV" },
  { id: "tram", label: "Tram", hint: "Tram via PTV" },
  { id: "bus", label: "Bus", hint: "Bus via PTV" },
];

export function isTransitMode(mode: TransportMode): boolean {
  return (
    mode === "transit" ||
    mode === "train" ||
    mode === "tram" ||
    mode === "bus"
  );
}

export function osrmProfileForMode(mode: TransportMode): OsrmProfile | null {
  if (mode === "walk") return "foot";
  if (mode === "cycle") return "bike";
  if (mode === "drive") return "driving";
  return null;
}

export function ptvRouteTypesForMode(mode: TransportMode): number[] {
  if (mode === "train") return [PTV_ROUTE_TYPES.train, PTV_ROUTE_TYPES.vline];
  if (mode === "tram") return [PTV_ROUTE_TYPES.tram];
  if (mode === "bus") return [PTV_ROUTE_TYPES.bus, PTV_ROUTE_TYPES.nightBus];
  // all public transport
  return [
    PTV_ROUTE_TYPES.train,
    PTV_ROUTE_TYPES.tram,
    PTV_ROUTE_TYPES.bus,
    PTV_ROUTE_TYPES.vline,
  ];
}

export function routeTypeLabel(routeType: number): string {
  switch (routeType) {
    case 0:
      return "Train";
    case 1:
      return "Tram";
    case 2:
      return "Bus";
    case 3:
      return "V/Line";
    case 4:
      return "Night Bus";
    default:
      return "Transit";
  }
}
