import { Marker, Polyline, Popup } from "react-leaflet";
import type { Place, SensorDensityCurrent } from "../../lib/types";
import { endMarkerIcon, startMarkerIcon } from "./markerIcons";
import QuietSpaceMarkers from "./QuietSpaceMarkers";
import SensorMarkers from "./SensorMarkers";
import type { LocationPoint, RankedTrip } from "./shared";

interface NavigateRoutesLayerProps {
  origin: LocationPoint | null;
  destination: LocationPoint | null;
  trips: RankedTrip[];
  selectedIdx: number;
  onSelectRoute: (idx: number) => void;
  quietSpaces: Place[];
  sensors: SensorDensityCurrent[];
}

// Navigate mode map layer: start/end pins, the ranked route polylines, and the
// quiet spaces & sensors along the selected route
export default function NavigateRoutesLayer({
  origin,
  destination,
  trips,
  selectedIdx,
  onSelectRoute,
  quietSpaces,
  sensors,
}: NavigateRoutesLayerProps) {
  return (
    <>
      {/* Origin Pin */}
      {origin && startMarkerIcon && (
        <Marker position={[origin.lat, origin.lng]} icon={startMarkerIcon}>
          <Popup>
            <strong>{origin.name}</strong>
            <br />
            Start Location
          </Popup>
        </Marker>
      )}

      {/* Destination Pin */}
      {destination && endMarkerIcon && (
        <Marker position={[destination.lat, destination.lng]} icon={endMarkerIcon}>
          <Popup>
            <strong>{destination.name}</strong>
            <br />
            Destination
          </Popup>
        </Marker>
      )}

      {/* Multiple walking path polylines */}
      {trips.map((trip, idx) => {
        const isCalmest = idx === 0;
        const isSelected = selectedIdx === idx;
        return (
          <Polyline
            key={idx}
            positions={trip.allPositions}
            eventHandlers={{
              click: () => {
                onSelectRoute(idx);
              },
            }}
            pathOptions={{
              color: isCalmest ? "#2563eb" : "#222222",
              weight: isSelected ? 6 : 4,
              opacity: isSelected ? 0.95 : 0.45,
              dashArray: isSelected ? undefined : "5, 10",
              lineCap: "round",
              className: "interactive-route-line",
            }}
          />
        );
      })}

      {/* Render quiet spaces along the route */}
      <QuietSpaceMarkers spaces={quietSpaces} />

      {/* Render sensors along the route */}
      <SensorMarkers sensors={sensors} />
    </>
  );
}
