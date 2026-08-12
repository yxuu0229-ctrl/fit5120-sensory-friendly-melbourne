import type { PlaceResult } from "../lib/types";

export const cbdLandmarks: PlaceResult[] = [
  {
    label: "Flinders Street Station",
    point: { lat: -37.8183, lng: 144.9671 },
  },
  {
    label: "State Library Victoria",
    point: { lat: -37.8098, lng: 144.9652 },
  },
  {
    label: "Federation Square",
    point: { lat: -37.8182, lng: 144.9691 },
  },
  {
    label: "Queen Victoria Market",
    point: { lat: -37.8076, lng: 144.9568 },
  },
  {
    label: "Flagstaff Gardens",
    point: { lat: -37.8105, lng: 144.9543 },
  },
  {
    label: "Melbourne Central",
    point: { lat: -37.8105, lng: 144.9632 },
  },
];

export function searchLandmarks(query: string): PlaceResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return cbdLandmarks.filter((p) => p.label.toLowerCase().includes(q));
}
