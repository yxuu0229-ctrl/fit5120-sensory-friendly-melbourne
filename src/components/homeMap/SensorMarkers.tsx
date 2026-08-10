import React from "react";
import { CircleMarker, Popup } from "react-leaflet";
import type { SensorDensityCurrent } from "../../lib/types";
import { getSensorColor } from "./shared";

interface SensorMarkerProps {
  sensor: SensorDensityCurrent;
  // Extra popup content appended after the default density/count lines
  popupExtra?: React.ReactNode;
}

// Single pedestrian sensor: density-coloured aura + solid core with details popup
export function SensorMarker({ sensor, popupExtra }: SensorMarkerProps) {
  return (
    <>
      <CircleMarker
        center={[sensor.latitude, sensor.longitude]}
        pathOptions={{
          fillColor: getSensorColor(sensor.density_level),
          fillOpacity: 0.75,
          color: "transparent",
          weight: 0,
          className: "quiet-highlight-space",
        }}
        radius={sensor.density_level === "High" ? 35 : sensor.density_level === "Medium" ? 25 : 15}
      />
      {/* Solid Core */}
      <CircleMarker
        center={[sensor.latitude, sensor.longitude]}
        pathOptions={{
          fillColor: getSensorColor(sensor.density_level),
          fillOpacity: 1,
          color: "#ffffff",
          weight: 1.5,
        }}
        radius={7}
      >
        <Popup>
          <strong>{sensor.sensor_name || `Sensor ${sensor.location_id}`}</strong>
          <br />
          Density: <strong>{sensor.density_level}</strong>
          <br />
          Count: {sensor.total_count} peds/min
          {popupExtra}
        </Popup>
      </CircleMarker>
    </>
  );
}

// Pedestrian sensor markers along a route
export default function SensorMarkers({ sensors }: { sensors: SensorDensityCurrent[] }) {
  return (
    <>
      {sensors.map((sensor) => (
        <SensorMarker key={sensor.location_id} sensor={sensor} />
      ))}
    </>
  );
}
