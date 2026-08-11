import React from "react";
import { CircleMarker, Popup } from "react-leaflet";
import type { Place } from "../../lib/types";

// Quiet place highlights: glowing blur aura + small sharp core with details popup
export default function QuietSpaceMarkers({ spaces }: { spaces: Place[] }) {
  return (
    <>
      {spaces.map((refuge) => (
        <React.Fragment key={refuge.id}>
          {/* Glowing Blur Aura around each place */}
          <CircleMarker
            center={[refuge.latitude, refuge.longitude]}
            pathOptions={{
              fillColor: "#3EBFFF",
              fillOpacity: 0.65,
              color: "transparent",
              weight: 0,
              className: "quiet-highlight-space",
            }}
            radius={25}
          />
          {/* Small sharp core */}
          <CircleMarker
            center={[refuge.latitude, refuge.longitude]}
            pathOptions={{
              fillColor: "#3EBFFF",
              fillOpacity: 1,
              color: "#ffffff",
              weight: 2,
            }}
            radius={7}
          >
            <Popup>
              <strong>{refuge.name}</strong>
              <br />
              <span className="refuge-popup-category">{refuge.category ?? "Quiet Space"}</span>
              <br />
              <span className="refuge-popup-theme">{refuge.theme}</span>
            </Popup>
          </CircleMarker>
        </React.Fragment>
      ))}
    </>
  );
}
