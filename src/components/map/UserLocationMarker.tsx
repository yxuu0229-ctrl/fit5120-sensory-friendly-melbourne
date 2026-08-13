import L from "leaflet";
import { useMemo } from "react";
import { CircleMarker, Marker, Popup } from "react-leaflet";
import type { LatLng } from "../../lib/types";

function arrowIcon(bearing: number) {
  return L.divIcon({
    className: "nav-arrow-wrap",
    html: `<div class="nav-arrow" style="transform: rotate(${bearing}deg)" aria-hidden="true">
      <svg viewBox="0 0 40 40" width="36" height="36">
        <circle cx="20" cy="20" r="17" fill="#1f7a6a" stroke="#ffffff" stroke-width="3"/>
        <path d="M20 8 L28 26 L20 22 L12 26 Z" fill="#ffffff"/>
      </svg>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export default function UserLocationMarker({
  point,
  navigating,
  bearing = 0,
}: {
  point: LatLng | null;
  navigating: boolean;
  bearing?: number;
}) {
  const icon = useMemo(() => arrowIcon(bearing), [bearing]);

  if (!point) return null;

  if (navigating) {
    return (
      <Marker position={[point.lat, point.lng]} icon={icon} zIndexOffset={900}>
        <Popup>Navigating — you are here</Popup>
      </Marker>
    );
  }

  return (
    <CircleMarker
      center={[point.lat, point.lng]}
      radius={8}
      pathOptions={{
        color: "#ffffff",
        fillColor: "#0f1419",
        fillOpacity: 1,
        weight: 3,
      }}
    >
      <Popup>You are here</Popup>
    </CircleMarker>
  );
}
