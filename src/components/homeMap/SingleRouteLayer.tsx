import { CircleMarker, Polyline, Popup } from "react-leaflet";
import type { Place, SensorDensityCurrent } from "../../lib/types";
import QuietSpaceMarkers from "./QuietSpaceMarkers";
import SensorMarkers from "./SensorMarkers";
import type { LocationPoint } from "./shared";

interface SingleRouteLayerProps {
  destination: LocationPoint | null;
  routePath: [number, number][];
  // Quiet spaces / sensors along the route; hidden when the active mode already renders them
  showQuietSpaces: boolean;
  showSensors: boolean;
  quietSpaces: Place[];
  sensors: SensorDensityCurrent[];
}

// Non-navigate modes: single planned walking route with destination pin and
// the quiet spaces & sensors along it
export default function SingleRouteLayer({
  destination,
  routePath,
  showQuietSpaces,
  showSensors,
  quietSpaces,
  sensors,
}: SingleRouteLayerProps) {
  if (routePath.length === 0) return null;

  return (
    <>
      {/* Destination Pin */}
      {destination && (
        <CircleMarker
          center={[destination.lat, destination.lng]}
          pathOptions={{
            fillColor: "#000000",
            fillOpacity: 1,
            color: "#ffffff",
            weight: 2,
          }}
          radius={7}
        >
          <Popup>
            <strong>{destination.name}</strong>
            <br />
            Destination
          </Popup>
        </CircleMarker>
      )}
      {/* Walking path polyline */}
      <Polyline
        positions={routePath}
        pathOptions={{
          color: "#000000",
          weight: 5,
          opacity: 0.85,
          dashArray: "1, 8",
          lineCap: "round",
        }}
      />

      {showQuietSpaces && <QuietSpaceMarkers spaces={quietSpaces} />}

      {showSensors && <SensorMarkers sensors={sensors} />}
    </>
  );
}
