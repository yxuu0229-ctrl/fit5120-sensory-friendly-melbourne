import L from "leaflet";

// Custom Leaflet warning icon
export const warningIcon = typeof window !== "undefined" ? L.divIcon({
  html: `
    <div class="map-warning-marker">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#FF7B00" stroke-width="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#FFF2CC" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="#FF7B00" stroke-width="3" stroke-linecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="#FF7B00" stroke-width="3" stroke-linecap="round" />
      </svg>
    </div>
  `,
  className: "custom-warning-div-icon",
  iconSize: [28, 28],
  iconAnchor: [14, 24],
}) : null;

// Custom Leaflet Route Start Icon (Green)
export const startMarkerIcon = typeof window !== "undefined" ? L.divIcon({
  html: `
    <div class="map-route-marker start-marker">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#10B981" stroke-width="2.5">
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="#D1FAE5" />
        <circle cx="12" cy="10" r="3" fill="#10B981" />
      </svg>
      <span class="marker-label-tooltip start-tooltip">Start</span>
    </div>
  `,
  className: "custom-route-marker-icon",
  iconSize: [30, 45],
  iconAnchor: [15, 30],
}) : null;

// Custom Leaflet Route End Icon (Red)
export const endMarkerIcon = typeof window !== "undefined" ? L.divIcon({
  html: `
    <div class="map-route-marker end-marker">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#EF4444" stroke-width="2.5">
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="#FEE2E2" />
        <circle cx="12" cy="10" r="3" fill="#EF4444" />
      </svg>
      <span class="marker-label-tooltip end-tooltip">End</span>
    </div>
  `,
  className: "custom-route-marker-icon",
  iconSize: [30, 45],
  iconAnchor: [15, 30],
}) : null;
