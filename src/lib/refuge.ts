import type { RefugePlace } from "./journeyData";

export type RefugeSearchMode = "current" | "route";

export type NearbyRefuge = RefugePlace & {
  distanceMeters: number;
};

export type Refuge = {
  id: string;
  marker: string;
  name: string;
  type: string;
  distance: string;
  cardDistance: string;
  availability: string;
  cardAvailability: string;
  quietnessData: string;
  cardQuietnessData: string;
  note: string;
  category: string;
  imageUrl: string;
};

export const refuges: Refuge[] = [
  {
    id: "state-library",
    marker: "L",
    name: "State Library forecourt quiet zone",
    type: "Library / public forecourt",
    distance: "5 min from current route",
    cardDistance: "5m",
    availability: "Open public area",
    cardAvailability: "Open",
    quietnessData: "Medium confidence, predicted lower crowd",
    cardQuietnessData: "Medium",
    note: "Not guaranteed quiet; use as potential refuge.",
    category: "Library",
    imageUrl: "/images/library.jpg",
  },
  {
    id: "flagstaff-gardens",
    marker: "P",
    name: "Flagstaff Gardens north path",
    type: "Park / outdoor path",
    distance: "7 min from current route",
    cardDistance: "7m",
    availability: "Open public area",
    cardAvailability: "Open",
    quietnessData: "Current lower pedestrian flow",
    cardQuietnessData: "Current",
    note: "Outdoor space with lower pedestrian flow.",
    category: "Park",
    imageUrl: "/images/park.jpg",
  },
  {
    id: "town-hall-arcade",
    marker: "S",
    name: "Town Hall side arcade seating",
    type: "Public seating",
    distance: "3 min from current route",
    cardDistance: "3m",
    availability: "Unknown",
    cardAvailability: "Unknown",
    quietnessData: "Unavailable",
    cardQuietnessData: "Unavailable",
    note: "Quietness unconfirmed; basic access known.",
    category: "Public",
    imageUrl: "/images/public-space.jpg",
  },
];

// Fields named by the detail-page slot they fill.
export type RefugeView = {
  id: string;
  name: string; // h1, img alt, h2
  kind: string; // "Type" dt
  distanceText: string; // "Distance" dt
  source: string; // "Source" dt — static maps availability here (documented mismatch)
  quietness: string; // "Quietness data" dt
  note: string; // "Note" dt
  imageUrl: string;
};

function refugeImageForPlace(place: NearbyRefuge) {
  const text = [place.name, place.category, place.theme, place.sub_theme, place.source]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("library")) return "/images/library.jpg";
  if (
    text.includes("park") ||
    text.includes("garden") ||
    text.includes("reserve") ||
    text.includes("open space")
  ) {
    return "/images/park.jpg";
  }
  if (
    text.includes("assembly") ||
    text.includes("arts") ||
    text.includes("culture") ||
    text.includes("museum") ||
    text.includes("gallery") ||
    text.includes("worship") ||
    text.includes("church") ||
    text.includes("synagogue") ||
    text.includes("health") ||
    text.includes("hospital") ||
    text.includes("medical")
  ) {
    return "/images/public-space.jpg";
  }

  return "/images/default-melbourne.jpg";
}

export function refugeFromPlace(
  place: NearbyRefuge,
  searchMode: "current" | "route"
): RefugeView {
  return {
    id: place.id,
    name: place.name,
    kind: place.category ?? place.source,
    distanceText: `${Math.round(place.distanceMeters)} m from ${
      searchMode === "route" ? "selected route" : "current location"
    }`,
    source: place.source,
    quietness: "Tagged as sensory refuge in places table",
    // Current JSX falls through to selectedRefuge.note, which always resolves to
    // refuges[0] because DB ids never match static ids — preserved verbatim here.
    note: place.theme ?? place.sub_theme ?? "Not guaranteed quiet; use as potential refuge.",
    imageUrl: refugeImageForPlace(place),
  };
}

export function refugeFromStatic(refuge: Refuge): RefugeView {
  return {
    id: refuge.id,
    name: refuge.name,
    kind: refuge.type,
    distanceText: refuge.distance,
    // Preserve shipped output: static availability renders in the page's "Source" slot.
    source: refuge.availability,
    quietness: refuge.quietnessData,
    note: refuge.note,
    imageUrl: refuge.imageUrl,
  };
}
