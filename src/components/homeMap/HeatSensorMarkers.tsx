import React from "react";
import { Marker, Popup } from "react-leaflet";
import type { SensorDensityCurrent } from "../../lib/types";
import { warningIcon } from "./markerIcons";
import { SensorMarker } from "./SensorMarkers";
import { sensorSoundLevel } from "./shared";

interface HeatSensorMarkersProps {
  sensors: SensorDensityCurrent[];
  soundThreshold: number;
  crowdThreshold: number;
}

// Heat Zones mode: sensors exceeding the crowd threshold render as density dots,
// sensors exceeding the sound threshold render a warning triangle
export default function HeatSensorMarkers({ sensors, soundThreshold, crowdThreshold }: HeatSensorMarkersProps) {
  return (
    <>
      {sensors.map((sensor) => {
        const sensorSound = sensorSoundLevel(sensor.total_count);
        const isCrowdExceeded = sensor.total_count >= crowdThreshold;
        const isSoundExceeded = sensorSound >= soundThreshold;
        return (
          <React.Fragment key={sensor.location_id}>
            {/* Dots (CircleMarkers) for when crowd exceeds threshold */}
            {isCrowdExceeded && (
              <SensorMarker
                sensor={sensor}
                popupExtra={
                  <>
                    <br />
                    Crowd Threshold Exceeded! ({crowdThreshold}p)
                  </>
                }
              />
            )}

            {/* Warning Triangle Marker for when sound exceeds threshold */}
            {isSoundExceeded && warningIcon && (
              <Marker
                position={[sensor.latitude, sensor.longitude]}
                icon={warningIcon}
              >
                <Popup>
                  <strong>{sensor.sensor_name || `Sensor ${sensor.location_id}`} WARNING</strong>
                  <br />
                  Sound level exceeds threshold!
                  <br />
                  Sound: {sensorSound} db (Threshold: {soundThreshold}db)
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
