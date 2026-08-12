import { CircleMarker, Popup } from "react-leaflet";
import { densityColor } from "../../lib/densityBands";
import type { SensorReading } from "../../lib/types";

function radiusFor(level: SensorReading["density_level"]) {
  if (level === "High") return 12;
  if (level === "Medium") return 9;
  return 6;
}

function opacityFor(level: SensorReading["density_level"]) {
  if (level === "High") return 0.45;
  if (level === "Medium") return 0.38;
  return 0.28;
}

/** Draws every pedestrian sensor (Low / Medium / High). */
export default function SensorLayer({
  sensors,
}: {
  sensors: SensorReading[];
}) {
  return (
    <>
      {sensors.map((s) => (
        <CircleMarker
          key={s.location_id}
          center={[s.latitude, s.longitude]}
          radius={radiusFor(s.density_level)}
          pathOptions={{
            color: densityColor(s.density_level),
            fillColor: densityColor(s.density_level),
            fillOpacity: opacityFor(s.density_level),
            weight: s.density_level === "Low" ? 1.5 : 2,
          }}
        >
          <Popup>
            <strong>{(s.sensor_name || "Sensor").replace(/_/g, " ")}</strong>
            <br />
            {s.density_level} · {s.total_count} people
            {!s.sensing_datetime ? (
              <>
                <br />
                <em>No live reading yet</em>
              </>
            ) : null}
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
