import { CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { LatLng } from "../../lib/types";

export default function EndpointMarkers({
  origin,
  destination,
  hideOrigin = false,
}: {
  origin: LatLng | null;
  destination: LatLng | null;
  /** During active navigation, A becomes the user arrow instead. */
  hideOrigin?: boolean;
}) {
  return (
    <>
      {origin && !hideOrigin && (
        <CircleMarker
          center={[origin.lat, origin.lng]}
          radius={9}
          pathOptions={{
            color: "#fff",
            fillColor: "#1f7a6a",
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Tooltip
            direction="top"
            offset={[0, -8]}
            permanent
            className="endpoint-tooltip endpoint-tooltip-start"
          >
            Start (A)
          </Tooltip>
          <Popup>Start</Popup>
        </CircleMarker>
      )}
      {destination && (
        <CircleMarker
          center={[destination.lat, destination.lng]}
          radius={9}
          pathOptions={{
            color: "#fff",
            fillColor: "#1d4e6f",
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Tooltip
            direction="top"
            offset={[0, -8]}
            permanent
            className="endpoint-tooltip endpoint-tooltip-dest"
          >
            Destination (B)
          </Tooltip>
          <Popup>Destination</Popup>
        </CircleMarker>
      )}
    </>
  );
}
