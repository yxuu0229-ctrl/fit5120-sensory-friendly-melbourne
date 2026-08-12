import { decodePolyline } from "../lib/polyline";
import { MODE_COLORS, type SegmentMode } from "../lib/modeColors";
import type { LatLng, RouteSegment, TransitLeg } from "../lib/types";

export type TransitRoute = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  summary: string;
  transitLegs: TransitLeg[];
  segments: RouteSegment[];
};

function googleKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";
}

function vehicleKind(type?: string): Exclude<SegmentMode, "walk" | "cycle" | "drive"> {
  switch ((type || "").toUpperCase()) {
    case "BUS":
    case "INTERCITY_BUS":
    case "TROLLEYBUS":
      return "bus";
    case "TRAM":
      return "tram";
    case "SUBWAY":
    case "METRO_RAIL":
    case "HEAVY_RAIL":
    case "COMMUTER_TRAIN":
    case "HIGH_SPEED_TRAIN":
    case "LONG_DISTANCE_TRAIN":
    case "RAIL":
      return "train";
    default:
      return "transit";
  }
}

function kindLabel(kind: TransitLeg["kind"]) {
  if (kind === "walk") return "Walk";
  if (kind === "bus") return "Bus";
  if (kind === "tram") return "Tram";
  if (kind === "train") return "Train";
  return "Transit";
}

function hexColor(raw: string | null | undefined, fallback: string) {
  if (!raw) return fallback;
  const cleaned = raw.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return fallback;
  return `#${cleaned}`;
}

type GoogleStep = {
  travelMode?: string;
  polyline?: { encodedPolyline?: string };
  navigationInstruction?: { instructions?: string };
  transitDetails?: {
    headsign?: string;
    stopCount?: number;
    stopDetails?: {
      departureStop?: { name?: string };
      arrivalStop?: { name?: string };
      departureTime?: string;
      arrivalTime?: string;
    };
    localizedValues?: {
      departureTime?: { time?: { text?: string } };
      arrivalTime?: { time?: { text?: string } };
    };
    transitLine?: {
      name?: string;
      nameShort?: string;
      color?: string;
      vehicle?: {
        type?: string;
        name?: { text?: string };
      };
    };
  };
};

function stepPositions(step: GoogleStep): [number, number][] {
  const encoded = step.polyline?.encodedPolyline;
  if (!encoded) return [];
  return decodePolyline(encoded).map(([lat, lng]) => [lat, lng] as [number, number]);
}

function parseJourney(steps: GoogleStep[]): {
  transitLegs: TransitLeg[];
  segments: RouteSegment[];
  coordinates: [number, number][];
} {
  const transitLegs: TransitLeg[] = [];
  const segments: RouteSegment[] = [];
  const coordinates: [number, number][] = [];

  for (const step of steps) {
    const positions = stepPositions(step);
    if (positions.length) {
      for (const p of positions) coordinates.push([p[1], p[0]]);
    }

    const mode = (step.travelMode || "").toUpperCase();
    if (mode === "WALK" || mode === "WALKING") {
      if (positions.length >= 2) {
        segments.push({
          mode: "walk",
          color: MODE_COLORS.walk,
          label: "Walk",
          positions,
        });
      }
      continue;
    }

    if (mode !== "TRANSIT") {
      if (positions.length >= 2) {
        segments.push({
          mode: "transit",
          color: MODE_COLORS.transit,
          label: "Transit",
          positions,
        });
      }
      continue;
    }

    const td = step.transitDetails;
    const kind = vehicleKind(td?.transitLine?.vehicle?.type);
    const line =
      td?.transitLine?.nameShort ||
      td?.transitLine?.name ||
      td?.transitLine?.vehicle?.name?.text ||
      kindLabel(kind);
    const color = hexColor(td?.transitLine?.color, MODE_COLORS[kind]);

    transitLegs.push({
      kind,
      line,
      vehicleName: td?.transitLine?.vehicle?.name?.text || kindLabel(kind),
      headsign: td?.headsign || null,
      fromStop: td?.stopDetails?.departureStop?.name || null,
      toStop: td?.stopDetails?.arrivalStop?.name || null,
      departsAt: td?.localizedValues?.departureTime?.time?.text || null,
      arrivesAt: td?.localizedValues?.arrivalTime?.time?.text || null,
      stopCount: td?.stopCount ?? null,
      color,
    });

    if (positions.length >= 2) {
      segments.push({
        mode: kind,
        color,
        label: `${kindLabel(kind)} ${line}`,
        positions,
      });
    }
  }

  return { transitLegs, segments, coordinates };
}

function buildSummary(legs: TransitLeg[], fallback: string) {
  if (!legs.length) return fallback;
  return legs
    .map((leg) => `${kindLabel(leg.kind)} ${leg.line}`)
    .join(" → ");
}

/** Public transport via Google Routes API (needs API key + Routes API enabled). */
export async function fetchTransitRoutes(
  from: LatLng,
  to: LatLng
): Promise<TransitRoute[]> {
  const key = googleKey();
  if (!key) {
    throw new Error(
      "Transit needs VITE_GOOGLE_MAPS_API_KEY with Routes API enabled."
    );
  }

  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": [
          "routes.duration",
          "routes.distanceMeters",
          "routes.polyline.encodedPolyline",
          "routes.description",
          "routes.legs.steps.travelMode",
          "routes.legs.steps.polyline.encodedPolyline",
          "routes.legs.steps.transitDetails",
          "routes.legs.steps.transitDetails.localizedValues",
        ].join(","),
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: from.lat, longitude: from.lng } },
        },
        destination: {
          location: { latLng: { latitude: to.lat, longitude: to.lng } },
        },
        travelMode: "TRANSIT",
        computeAlternativeRoutes: true,
        languageCode: "en-AU",
        regionCode: "AU",
        transitPreferences: {
          routingPreference: "LESS_WALKING",
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Transit routing failed (${res.status}). Enable Routes API in Google Cloud. ${text.slice(0, 160)}`
    );
  }

  const body = (await res.json()) as {
    routes?: Array<{
      distanceMeters?: number;
      duration?: string;
      description?: string;
      polyline?: { encodedPolyline?: string };
      legs?: Array<{ steps?: GoogleStep[] }>;
    }>;
  };

  return (body.routes ?? [])
    .map((r, i) => {
      const steps = (r.legs ?? []).flatMap((leg) => leg.steps ?? []);
      const parsed = parseJourney(steps);
      const encoded = r.polyline?.encodedPolyline;
      const coordinates = encoded
        ? decodePolyline(encoded).map(
            ([lat, lng]) => [lng, lat] as [number, number]
          )
        : parsed.coordinates;
      if (!coordinates.length) return null;
      const seconds = Number((r.duration || "0s").replace(/s$/, "")) || 0;
      const fallback = r.description || `Transit option ${i + 1}`;
      const segments =
        parsed.segments.length > 0
          ? parsed.segments
          : [
              {
                mode: "transit" as const,
                color: MODE_COLORS.transit,
                label: "Transit",
                positions: coordinates.map(
                  ([lng, lat]) => [lat, lng] as [number, number]
                ),
              },
            ];
      return {
        distanceMeters: r.distanceMeters ?? 0,
        durationSeconds: seconds,
        coordinates,
        summary: buildSummary(parsed.transitLegs, fallback),
        transitLegs: parsed.transitLegs,
        segments,
      };
    })
    .filter((r): r is TransitRoute => r != null)
    .slice(0, 3);
}
