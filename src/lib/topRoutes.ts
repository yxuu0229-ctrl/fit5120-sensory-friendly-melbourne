import { fetchTransitRoutes } from "../api/googleTransit";
import { fetchOsrmRoutes } from "../api/osrm";
import type { TransportMode } from "./transportModes";
import { loadFromScore, scoreRoutePath } from "./routeScore";
import { indicatorForLoad } from "./sensoryIndicator";
import type { LatLng, RouteOption, SensorReading } from "./types";

const MODE_LABELS: Record<TransportMode, [string, string, string]> = {
  walk: ["Calmest walk", "Balanced walk", "Busier walk"],
  cycle: ["Calmest cycle", "Balanced cycle", "Direct cycle"],
  drive: ["Recommended drive", "Alternative drive", "Longer drive"],
  transit: ["Best transit", "Transit alternative", "Other transit"],
};

export async function planTopRoutes(
  from: LatLng,
  to: LatLng,
  sensors: SensorReading[],
  threshold: number,
  mode: TransportMode
): Promise<RouteOption[]> {
  const raw =
    mode === "transit"
      ? await fetchTransitRoutes(from, to)
      : await fetchOsrmRoutes(from, to, mode, 3);

  const scored = raw.map((route, index) => {
    const coords = route.coordinates;
    const score = scoreRoutePath(coords, sensors);
    const sensoryLoad =
      mode === "drive"
        ? Math.round(loadFromScore(score) * 0.5)
        : loadFromScore(score);
    const summary =
      "summary" in route && typeof route.summary === "string"
        ? route.summary
        : undefined;
    return {
      id: `r-${mode}-${index}`,
      rank: 0,
      label: summary || `${mode} ${index + 1}`,
      recommended: false,
      sensoryLoad,
      indicator: indicatorForLoad(sensoryLoad, threshold),
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      positions: coords.map(
        ([lng, lat]) => [lat, lng] as [number, number]
      ),
    };
  });

  scored.sort((a, b) =>
    mode === "drive" || mode === "transit"
      ? a.durationSeconds - b.durationSeconds || a.sensoryLoad - b.sensoryLoad
      : a.sensoryLoad - b.sensoryLoad || a.durationSeconds - b.durationSeconds
  );

  const labels = MODE_LABELS[mode];
  return scored.slice(0, 3).map((route, index): RouteOption => {
    const keepTransitSummary =
      mode === "transit" && !/^\w+ \d+$/.test(route.label);
    return {
      ...route,
      rank: index + 1,
      recommended: index === 0,
      label: keepTransitSummary ? route.label : labels[index] ?? route.label,
    };
  });
}
