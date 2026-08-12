import { useMemo } from "react";
import { Delaunay } from "d3-delaunay";
import { Polygon, Popup } from "react-leaflet";
import { densityColor } from "../../lib/densityBands";
import { distanceMeters } from "../../lib/geo";
import {
  sensorLevelForThreshold,
  sensorLoadScore,
} from "../../lib/sensoryIndicator";
import type { DensityLevel, SensorReading } from "../../lib/types";

const LEVEL_RANK: Record<DensityLevel, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
};

/** ~150 m street/building coverage radius. */
const MAX_COVERAGE_M = 150;

function fillOpacity(
  level: DensityLevel,
  alongRoute: boolean,
  focusRoute: boolean
) {
  if (focusRoute && !alongRoute) {
    return level === "High" ? 0.12 : level === "Medium" ? 0.08 : 0.04;
  }
  if (alongRoute) {
    if (level === "High") return 0.72;
    if (level === "Medium") return 0.62;
    return 0.42;
  }
  if (level === "High") return 0.55;
  if (level === "Medium") return 0.45;
  return 0.16;
}

function strokeWeight(level: DensityLevel, alongRoute: boolean) {
  if (alongRoute) return 3;
  if (level === "High") return 2;
  if (level === "Medium") return 1.6;
  return 0.8;
}

type CoverageCell = {
  sensor: SensorReading;
  positions: [number, number][];
};

function clipCellToRadius(
  poly: [number, number][],
  lat: number,
  lng: number,
  maxM: number
): [number, number][] {
  const center = { lat, lng };
  return poly.map(([pLat, pLng]) => {
    const d = distanceMeters(center, { lat: pLat, lng: pLng });
    if (d <= maxM || d < 1) return [pLat, pLng] as [number, number];
    const t = maxM / d;
    return [
      lat + (pLat - lat) * t,
      lng + (pLng - lng) * t,
    ] as [number, number];
  });
}

function buildCoverageCells(sensors: SensorReading[]): CoverageCell[] {
  if (sensors.length < 2) {
    return sensors.map((sensor) => ({
      sensor,
      positions: blockAround(sensor.latitude, sensor.longitude, 0.0006),
    }));
  }

  const points = sensors.map((s) => [s.longitude, s.latitude] as [number, number]);
  const lons = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const pad = 0.001;
  const bounds: [number, number, number, number] = [
    Math.min(...lons) - pad,
    Math.min(...lats) - pad,
    Math.max(...lons) + pad,
    Math.max(...lats) + pad,
  ];

  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi(bounds);

  return sensors
    .map((sensor, i) => {
      const poly = voronoi.cellPolygon(i);
      if (!poly || poly.length < 3) return null;
      const raw = poly.map(([lng, lat]) => [lat, lng] as [number, number]);
      const positions = clipCellToRadius(
        raw,
        sensor.latitude,
        sensor.longitude,
        MAX_COVERAGE_M
      );
      return { sensor, positions };
    })
    .filter((c): c is CoverageCell => c != null);
}

function blockAround(lat: number, lng: number, half: number): [number, number][] {
  return [
    [lat - half, lng - half * 1.35],
    [lat - half, lng + half * 1.35],
    [lat + half, lng + half * 1.35],
    [lat + half, lng - half * 1.35],
  ];
}

/** Street/building coverage areas; route zones follow the user threshold. */
export default function SensorLayer({
  sensors,
  highlightIds,
  threshold = 50,
}: {
  sensors: SensorReading[];
  /** All crowd zones along the selected route. */
  highlightIds?: Set<number>;
  /** User crowd-density threshold (0–100). */
  threshold?: number;
}) {
  const focusRoute = Boolean(highlightIds && highlightIds.size > 0);

  const cells = useMemo(() => {
    const built = buildCoverageCells(sensors);
    return [...built].sort((a, b) => {
      const aHit = highlightIds?.has(a.sensor.location_id) ? 1 : 0;
      const bHit = highlightIds?.has(b.sensor.location_id) ? 1 : 0;
      if (aHit !== bHit) return aHit - bHit;
      const aLevel = highlightIds?.has(a.sensor.location_id)
        ? sensorLevelForThreshold(a.sensor, threshold)
        : a.sensor.density_level;
      const bLevel = highlightIds?.has(b.sensor.location_id)
        ? sensorLevelForThreshold(b.sensor, threshold)
        : b.sensor.density_level;
      return LEVEL_RANK[aLevel] - LEVEL_RANK[bLevel];
    });
  }, [sensors, highlightIds, threshold]);

  return (
    <>
      {cells.map(({ sensor: s, positions }) => {
        const alongRoute = highlightIds?.has(s.location_id) ?? false;
        // Along the selected route, colours follow the user's threshold.
        const displayLevel = alongRoute
          ? sensorLevelForThreshold(s, threshold)
          : s.density_level;
        const color = densityColor(displayLevel);
        const load = sensorLoadScore(s);
        return (
          <Polygon
            key={s.location_id}
            positions={positions}
            pathOptions={{
              color: alongRoute ? "#12171c" : color,
              fillColor: color,
              fillOpacity: fillOpacity(displayLevel, alongRoute, focusRoute),
              weight: strokeWeight(displayLevel, alongRoute),
              opacity: alongRoute
                ? 0.95
                : focusRoute
                  ? 0.2
                  : displayLevel === "Low"
                    ? 0.25
                    : 0.65,
              lineJoin: "round",
            }}
          >
            <Popup>
              <strong className="map-popup-title">
                {(s.sensor_name || "Coverage zone").replace(/_/g, " ")}
              </strong>
              <br />
              <span
                className={`map-popup-level level-${displayLevel.toLowerCase()}`}
              >
                {displayLevel} for your threshold
              </span>
              {" · "}
              load {load}/{threshold}
              <br />
              Live reading: {s.density_level} · {s.total_count} people
              <br />
              Area this sensor covers (streets &amp; buildings nearby)
              {alongRoute ? (
                <>
                  <br />
                  <em>Along your selected route</em>
                </>
              ) : null}
              {!s.sensing_datetime ? (
                <>
                  <br />
                  <em>No live reading yet</em>
                </>
              ) : null}
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}
