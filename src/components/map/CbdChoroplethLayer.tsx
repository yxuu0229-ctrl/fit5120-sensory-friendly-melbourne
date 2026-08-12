import React, { useMemo, useState, useEffect } from "react";
import { Polygon, Popup, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { CBD_BOUNDS, densityColor } from "../../lib/densityBands";
import type { SensorReading } from "../../lib/types";

interface HexCellData {
  id: string;
  points: [number, number][]; // [[lat, lng], ...]
  center: [number, number];
  sensorName: string;
  totalCount: number;
  densityLevel: "Low" | "Medium" | "High";
}

interface CbdChoroplethLayerProps {
  sensors: SensorReading[];
  radiusMeters?: number;
  visible?: boolean;
}

/** Generates 6 vertices of a regular hexagon given center lat/lng and radius in meters */
function generateHexCorners(
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): [number, number][] {
  const radiusLat = radiusMeters / 111000;
  const radiusLng = radiusMeters / (111000 * Math.cos((-37.8136 * Math.PI) / 180));

  const corners: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const lat = centerLat + radiusLat * Math.sin(angle);
    const lng = centerLng + radiusLng * Math.cos(angle);
    corners.push([lat, lng]);
  }
  return corners;
}

/** Creates custom Leaflet DivIcon scaled dynamically according to pixel radius of the hexagon */
function createScaledHexTextIcon(count: number, strokeColor: string, hexPixelRadius: number) {
  // Scale font size proportionately to the hexagon radius in pixels on screen
  const fontSize = Math.max(9, Math.min(28, Math.round(hexPixelRadius * 0.45)));
  const iconDim = Math.round(hexPixelRadius * 1.8);
  const halfDim = Math.round(iconDim / 2);

  return L.divIcon({
    className: "hex-count-label",
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${iconDim}px;
      height: ${iconDim}px;
      color: ${strokeColor};
      font-weight: 800;
      font-size: ${fontSize}px;
      font-family: var(--font-sans, system-ui, sans-serif);
      text-align: center;
      line-height: 1;
      text-shadow: 0 0 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.85);
      pointer-events: none;
      white-space: nowrap;
    ">${count}</div>`,
    iconSize: [iconDim, iconDim],
    iconAnchor: [halfDim, halfDim],
  });
}

export default function CbdChoroplethLayer({
  sensors,
  radiusMeters = 80, // ~80m radius per non-overlapping hexagon bin
  visible = true,
}: CbdChoroplethLayerProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [map]);

  // Compute screen pixel radius of hexagon at current map zoom level
  const hexPixelRadius = useMemo(() => {
    const center = map.getCenter();
    const pointCenter = map.latLngToContainerPoint(center);
    const radiusLat = radiusMeters / 111000;
    const pointEdge = map.latLngToContainerPoint([center.lat + radiusLat, center.lng]);
    return Math.abs(pointCenter.y - pointEdge.y);
  }, [map, zoom, radiusMeters]);

  const hexCells = useMemo(() => {
    if (!visible || !sensors.length) return [];

    const validSensors = sensors.filter(
      (s) => s.latitude != null && s.longitude != null
    );

    const radiusLat = radiusMeters / 111000;
    const radiusLng = radiusMeters / (111000 * Math.cos((-37.8136 * Math.PI) / 180));

    const rowStep = radiusLat * 1.5;
    const colStep = radiusLng * Math.sqrt(3);

    const latMin = CBD_BOUNDS.latMin - radiusLat;
    const latMax = CBD_BOUNDS.latMax + radiusLat;
    const lngMin = CBD_BOUNDS.lngMin - radiusLng;
    const lngMax = CBD_BOUNDS.lngMax + radiusLng;

    const cells: HexCellData[] = [];
    const occupiedHexes = new Set<string>();

    validSensors.forEach((s) => {
      const approxRow = Math.round((s.latitude - latMin) / rowStep);
      let bestRow = approxRow;
      let bestCol = 0;
      let minDistance = Infinity;

      for (let r = approxRow - 2; r <= approxRow + 2; r++) {
        const rowLat = latMin + r * rowStep;
        const lngOffset = (Math.abs(r) % 2 === 1) ? colStep / 2 : 0;
        const approxCol = Math.round((s.longitude - (lngMin + lngOffset)) / colStep);

        for (let c = approxCol - 2; c <= approxCol + 2; c++) {
          const hexKey = `${r}_${c}`;
          if (occupiedHexes.has(hexKey)) continue;

          const colLng = lngMin + lngOffset + c * colStep;
          const dLat = s.latitude - rowLat;
          const dLng = s.longitude - colLng;
          const distSq = dLat * dLat + dLng * dLng;

          if (distSq < minDistance) {
            minDistance = distSq;
            bestRow = r;
            bestCol = c;
          }
        }
      }

      const hexKey = `${bestRow}_${bestCol}`;
      occupiedHexes.add(hexKey);

      const lngOffset = (Math.abs(bestRow) % 2 === 1) ? colStep / 2 : 0;
      const centerLat = latMin + bestRow * rowStep;
      const centerLng = lngMin + lngOffset + bestCol * colStep;

      const corners = generateHexCorners(centerLat, centerLng, radiusMeters);

      cells.push({
        id: `sensor-hex-${s.location_id}`,
        points: corners,
        center: [centerLat, centerLng],
        sensorName: (s.sensor_name || "Sensor").replace(/_/g, " "),
        totalCount: s.total_count || 0,
        densityLevel: s.density_level || "Low",
      });
    });

    return cells;
  }, [sensors, radiusMeters, visible]);

  if (!visible || hexCells.length === 0) return null;

  return (
    <>
      {hexCells.map((cell) => {
        const color = densityColor(cell.densityLevel);
        const fillOpacity =
          cell.densityLevel === "High"
            ? 0.55
            : cell.densityLevel === "Medium"
            ? 0.42
            : 0.28;

        const textIcon = createScaledHexTextIcon(cell.totalCount, color, hexPixelRadius);

        return (
          <React.Fragment key={cell.id}>
            <Polygon
              positions={cell.points}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: fillOpacity,
                weight: 2,
                opacity: 0.95,
              }}
            >
              <Popup>
                <strong>{cell.sensorName}</strong>
                <br />
                Crowd Density: <strong>{cell.densityLevel}</strong>
                <br />
                Count: {cell.totalCount} people
              </Popup>
            </Polygon>

            <Marker position={cell.center} icon={textIcon} interactive={false} />
          </React.Fragment>
        );
      })}
    </>
  );
}
