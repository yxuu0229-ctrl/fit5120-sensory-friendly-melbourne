import { CircleMarker, Popup } from "react-leaflet";
import { inCbd } from "../../lib/densityBands";

// User Location Marker with Glowing Pulse Halo
export default function UserLocationMarker({ location }: { location: { lat: number; lng: number } }) {
  return (
    <>
      <CircleMarker
        center={[location.lat, location.lng]}
        pathOptions={{
          color: "#3EBFFF",
          fillColor: "#3EBFFF",
          fillOpacity: 0.15,
          weight: 1,
          className: "user-location-halo",
        }}
        radius={28}
      />
      <CircleMarker
        center={[location.lat, location.lng]}
        pathOptions={{
          color: "#ffffff",
          fillColor: "#2563eb",
          fillOpacity: 1,
          weight: 2.5,
        }}
        radius={8}
      >
        <Popup>
          <strong>Your location</strong>
          <br />
          {inCbd(location.lat, location.lng) ? "Melbourne CBD" : "Carlton"}
        </Popup>
      </CircleMarker>
    </>
  );
}
