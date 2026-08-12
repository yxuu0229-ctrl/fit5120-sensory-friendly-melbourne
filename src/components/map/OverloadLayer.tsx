import { CircleMarker, Popup } from "react-leaflet";
import { densityColor } from "../../lib/densityBands";
import type { SensorReading } from "../../lib/types";

export default function OverloadLayer({
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
          radius={s.density_level === "High" ? 12 : 8}
          pathOptions={{
            color: densityColor(s.density_level),
            fillColor: densityColor(s.density_level),
            fillOpacity: 0.35,
            weight: 2,
          }}
        >
          <Popup>
            <strong>{(s.sensor_name || "Sensor").replace(/_/g, " ")}</strong>
            <br />
            {s.density_level} · {s.total_count} people
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
