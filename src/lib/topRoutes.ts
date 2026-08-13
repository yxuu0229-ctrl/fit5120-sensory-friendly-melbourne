import { fetchGoogleModeRoutes, hasGoogleMapsKey } from "../api/googleModeRoutes";
import { fetchTransitRoutes } from "../api/googleTransit";
import { fetchOsrmRoutes } from "../api/osrm";
import { colorForMode } from "./modeColors";
import { sensorsAlongPath } from "./sensorsAlongRoute";
import type { TransportMode } from "./transportModes";
import { loadFromScore, scoreRoutePath } from "./routeScore";
import { indicatorForLoad } from "./sensoryIndicator";
import type {
  LatLng,
  RouteOption,
  RouteSegment,
  SensorReading,
  TransitLeg,
} from "./types";

const MODE_LABELS: Record<TransportMode, [string, string, string]> = {
  walk: ["Calmest walk", "Balanced walk", "Busier walk"],
  cycle: ["Calmest cycle", "Balanced cycle", "Direct cycle"],
  drive: ["Fastest drive", "Alternative drive", "Longer drive"],
  transit: ["Best transit", "Transit alternative", "Other transit"],
};

/** Mode-specific corridor width for crowd scoring. */
function scoreRadius(mode: TransportMode) {
  if (mode === "walk") return 100;
  if (mode === "cycle") return 110;
  if (mode === "drive") return 55;
  return 90;
}

function singleModeSegment(
  mode: Exclude<TransportMode, "transit">,
  positions: [number, number][]
): RouteSegment[] {
  return [
    {
      mode,
      color: colorForMode(mode),
      label: mode[0].toUpperCase() + mode.slice(1),
      positions,
    },
  ];
}

type RawRoute = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  summary?: string;
  transitLegs?: TransitLeg[];
  segments?: RouteSegment[];
};

async function fetchRawRoutes(
  from: LatLng,
  to: LatLng,
  mode: TransportMode
): Promise<RawRoute[]> {
  if (mode === "transit") {
    return fetchTransitRoutes(from, to);
  }

  // Prefer Google when available — real walk / bike / drive ETAs.
  if (hasGoogleMapsKey()) {
    try {
      const google = await fetchGoogleModeRoutes(from, to, mode);
      if (google.length) return google;
    } catch {
      // fall through to OSRM + mode speeds
    }
  }

  return fetchOsrmRoutes(from, to, mode, true);
}

export async function planTopRoutes(
  from: LatLng,
  to: LatLng,
  sensors: SensorReading[],
  threshold: number,
  mode: TransportMode
): Promise<RouteOption[]> {
  const raw = await fetchRawRoutes(from, to, mode);

  const scored = raw.map((route, index) => {
    const coords = route.coordinates;
    const score = scoreRoutePath(coords, sensors, scoreRadius(mode));
    const sensoryLoad = loadFromScore(score);
    const summary =
      typeof route.summary === "string" ? route.summary : undefined;
    const transitLegs = Array.isArray(route.transitLegs)
      ? route.transitLegs
      : undefined;
    const positions = coords.map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );
    const segments: RouteSegment[] =
      Array.isArray(route.segments) && route.segments.length
        ? route.segments
        : mode === "transit"
          ? []
          : singleModeSegment(mode, positions);
    const along = sensorsAlongPath(positions, sensors, scoreRadius(mode) + 20);
    return {
      id: `r-${mode}-${index}-${Math.round(route.durationSeconds)}-${Math.round(route.distanceMeters)}`,
      rank: 0,
      label: summary || `${mode} ${index + 1}`,
      recommended: false,
      sensoryLoad,
      indicator: indicatorForLoad(sensoryLoad, threshold),
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      positions,
      mode,
      alongSensorCount: along.length,
      transitLegs,
      segments,
    };
  });

  scored.sort((a, b) => {
    if (mode === "drive" || mode === "transit") {
      return (
        a.durationSeconds - b.durationSeconds ||
        a.sensoryLoad - b.sensoryLoad ||
        a.distanceMeters - b.distanceMeters
      );
    }
    if (mode === "cycle") {
      return (
        a.sensoryLoad - b.sensoryLoad ||
        a.durationSeconds - b.durationSeconds ||
        a.distanceMeters - b.distanceMeters
      );
    }
    return (
      a.sensoryLoad - b.sensoryLoad ||
      a.durationSeconds - b.durationSeconds ||
      a.distanceMeters - b.distanceMeters
    );
  });

  const labels = MODE_LABELS[mode];
  return scored.slice(0, 3).map((route, index): RouteOption => {
    const keepTransitSummary =
      mode === "transit" && Boolean(route.transitLegs?.length || route.label);
    return {
      ...route,
      rank: index + 1,
      recommended: index === 0,
      label:
        mode === "transit" && keepTransitSummary && route.label
          ? route.label
          : labels[index] ?? route.label,
    };
  });
}
