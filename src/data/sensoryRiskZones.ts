import type { LatLng } from "../lib/types";

export type RiskKind = "tram" | "retail" | "construction" | "event";

export type SensoryRiskZone = {
  id: string;
  name: string;
  kind: RiskKind;
  blurb: string;
  /** Leaflet [lat, lng] ring. */
  positions: [number, number][];
};

export const RISK_META: Record<
  RiskKind,
  { label: string; color: string; fillOpacity: number }
> = {
  tram: { label: "Tram corridor", color: "#c45c26", fillOpacity: 0.14 },
  retail: { label: "Bright retail strip", color: "#b07d2a", fillOpacity: 0.16 },
  construction: { label: "Noise / works", color: "#a33b32", fillOpacity: 0.18 },
  event: { label: "Event / crowd zone", color: "#5b3d8f", fillOpacity: 0.14 },
};

/**
 * Hand-curated Melbourne CBD sensory-risk polygons.
 * Approximate street blocks — guidance for ND planning, not live events.
 */
export const SENSORY_RISK_ZONES: SensoryRiskZone[] = [
  {
    id: "tram-swanston",
    name: "Swanston Street tram spine",
    kind: "tram",
    blurb: "Frequent trams, bells, and platform crowds.",
    positions: [
      [-37.8078, 144.963],
      [-37.8078, 144.9642],
      [-37.8186, 144.966],
      [-37.8186, 144.9648],
    ],
  },
  {
    id: "tram-bourke",
    name: "Bourke Street tram corridor",
    kind: "tram",
    blurb: "Busy tram stops and mixed foot traffic.",
    positions: [
      [-37.8132, 144.9585],
      [-37.8124, 144.9587],
      [-37.8136, 144.9715],
      [-37.8144, 144.9713],
    ],
  },
  {
    id: "retail-bourke-mall",
    name: "Bourke Street Mall",
    kind: "retail",
    blurb: "Bright shopfronts, buskers, and dense footfall.",
    positions: [
      [-37.8132, 144.9632],
      [-37.8126, 144.9634],
      [-37.8134, 144.9678],
      [-37.814, 144.9676],
    ],
  },
  {
    id: "retail-collins",
    name: "Collins Street retail strip",
    kind: "retail",
    blurb: "Glass façades and midday shopping peak.",
    positions: [
      [-37.8156, 144.961],
      [-37.8149, 144.9612],
      [-37.816, 144.969],
      [-37.8167, 144.9688],
    ],
  },
  {
    id: "works-flinders",
    name: "Flinders precinct works risk",
    kind: "construction",
    blurb: "Possible construction noise near station approaches.",
    positions: [
      [-37.8188, 144.965],
      [-37.8178, 144.9652],
      [-37.8186, 144.9692],
      [-37.8196, 144.969],
    ],
  },
  {
    id: "event-fed-square",
    name: "Federation Square / riverside events",
    kind: "event",
    blurb: "Occasional events, speakers, and crowd surges.",
    positions: [
      [-37.8189, 144.9682],
      [-37.8178, 144.9684],
      [-37.8184, 144.9714],
      [-37.8195, 144.9712],
    ],
  },
];

export function riskZoneCenter(zone: SensoryRiskZone): LatLng {
  const lats = zone.positions.map((p) => p[0]);
  const lngs = zone.positions.map((p) => p[1]);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  };
}
