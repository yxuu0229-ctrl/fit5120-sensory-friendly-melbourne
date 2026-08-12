import type { RefugePlace } from "./types";

/** Support / calm place kinds for ND-friendly map icons. */
export type RefugeKind =
  | "park"
  | "library"
  | "quiet"
  | "bathroom"
  | "water"
  | "seating"
  | "pharmacy"
  | "medical"
  | "landmark"
  | "other";

export const REFUGE_KIND_META: Record<
  RefugeKind,
  { label: string; color: string; short: string }
> = {
  park: { label: "Parks & gardens", color: "#2f6f4e", short: "P" },
  library: { label: "Libraries", color: "#1a4f8c", short: "L" },
  quiet: { label: "Quiet rooms", color: "#1f7a6a", short: "Q" },
  bathroom: { label: "Bathrooms", color: "#5b6b7a", short: "B" },
  water: { label: "Water", color: "#0e8f9a", short: "W" },
  seating: { label: "Shaded seating", color: "#6b7c5c", short: "S" },
  pharmacy: { label: "Pharmacies", color: "#8a4a6a", short: "+" },
  medical: { label: "Medical", color: "#a33b32", short: "M" },
  landmark: { label: "Wayfinding", color: "#4a5560", short: "◆" },
  other: { label: "Calm spaces", color: "#1f7a6a", short: "●" },
};

/** Optional map layers users can toggle (support facilities kept filtered). */
export type SupportLayerId =
  | "refuges"
  | "resetRings"
  | "riskZones"
  | "forecast"
  | "bathroom"
  | "water"
  | "seating"
  | "pharmacy"
  | "medical"
  | "landmark";

export const DEFAULT_SUPPORT_LAYERS: Record<SupportLayerId, boolean> = {
  refuges: true,
  resetRings: true,
  riskZones: true,
  forecast: true,
  bathroom: false,
  water: false,
  seating: false,
  pharmacy: false,
  medical: false,
  landmark: false,
};

function haystack(place: RefugePlace) {
  return `${place.category ?? ""} ${place.theme ?? ""} ${place.name ?? ""}`.toLowerCase();
}

export function classifyRefuge(place: RefugePlace): RefugeKind {
  const h = haystack(place);
  if (/toilet|bathroom|restroom|washroom|amenities/.test(h)) return "bathroom";
  if (/drink|fountain|water\b|hydration/.test(h)) return "water";
  if (/seat|bench|shade|rest area|picnic/.test(h)) return "seating";
  if (/pharmac/.test(h)) return "pharmacy";
  if (/hospital|clinic|medical|health/.test(h)) return "medical";
  if (/library|lib\b/.test(h)) return "library";
  if (/park|garden|reserve|green/.test(h)) return "park";
  if (/quiet|sensory|calm|refuge|peace|chapel|prayer/.test(h)) return "quiet";
  if (/landmark|statue|monument|station|square|plaza|cathedral|museum/.test(h)) {
    return "landmark";
  }
  return "other";
}

export function isCoreRefuge(kind: RefugeKind) {
  return kind === "park" || kind === "library" || kind === "quiet" || kind === "other";
}

/** Places shown when core refuges are on, plus any enabled support filters. */
export function filterPlacesForLayers(
  places: RefugePlace[],
  layers: Record<SupportLayerId, boolean>
): RefugePlace[] {
  return places.filter((p) => {
    const kind = classifyRefuge(p);
    if (isCoreRefuge(kind)) return layers.refuges;
    if (kind === "bathroom") return layers.bathroom;
    if (kind === "water") return layers.water;
    if (kind === "seating") return layers.seating;
    if (kind === "pharmacy") return layers.pharmacy;
    if (kind === "medical") return layers.medical;
    if (kind === "landmark") return layers.landmark;
    return false;
  });
}

/** Walk minutes at ~4.9 km/h. */
export function walkMinutesFromMeters(meters: number) {
  return Math.max(1, Math.round(meters / 1.35 / 60));
}
