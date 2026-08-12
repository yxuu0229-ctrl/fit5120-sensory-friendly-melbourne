import { useEffect, useRef } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import type { CircleMarker as LeafletCircleMarker } from "leaflet";
import type { RefugePlace } from "../../lib/types";

function formatDistance(meters?: number) {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

export default function RefugeMarkers({
  places,
  selectedId,
  onSelect,
  onNavigate,
}: {
  places: RefugePlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNavigate: (place: RefugePlace) => void;
}) {
  const markerRefs = useRef<Map<string, LeafletCircleMarker>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    const marker = markerRefs.current.get(selectedId);
    marker?.openPopup();
  }, [selectedId]);

  return (
    <>
      {places.slice(0, 40).map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.latitude, p.longitude]}
          radius={selectedId === p.id ? 10 : 7}
          ref={(instance) => {
            if (instance) markerRefs.current.set(p.id, instance);
            else markerRefs.current.delete(p.id);
          }}
          eventHandlers={{ click: () => onSelect(p.id) }}
          pathOptions={{
            color: "#1d4e6f",
            fillColor: selectedId === p.id ? "#1d4e6f" : "#7ea0b5",
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup className="refuge-popup" maxWidth={260}>
            <div className="refuge-popup-body">
              <strong>{p.name}</strong>
              <p>{p.category || p.theme || "Quiet public space"}</p>
              {formatDistance(p.distanceMeters) ? (
                <p className="refuge-popup-meta">
                  {formatDistance(p.distanceMeters)}
                </p>
              ) : null}
              <p className="refuge-popup-meta">
                {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
              </p>
              <button
                type="button"
                className="btn btn-primary refuge-popup-nav"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onNavigate(p);
                }}
              >
                Navigate to it
              </button>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
