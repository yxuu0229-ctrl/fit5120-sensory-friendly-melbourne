import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import type { RefugePlace } from "../../lib/types";

function formatDistance(meters?: number) {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

function refugeIcon(selected: boolean) {
  const size = selected ? 34 : 28;
  return L.divIcon({
    className: "refuge-pin-wrap",
    html: `<div class="refuge-pin${selected ? " is-selected" : ""}" aria-hidden="true">
      <svg viewBox="0 0 32 40" width="${size}" height="${Math.round(size * 1.25)}">
        <path d="M16 2 L30 16 L16 38 L2 16 Z" fill="${selected ? "#155a4d" : "#1f7a6a"}" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="16" cy="16" r="4.5" fill="#ffffff"/>
      </svg>
    </div>`,
    iconSize: [size, Math.round(size * 1.25)],
    iconAnchor: [size / 2, Math.round(size * 1.25) - 2],
    popupAnchor: [0, -Math.round(size * 1.1)],
  });
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
  const markerRefs = useRef<Map<string, LeafletMarker>>(new Map());
  const icons = useMemo(
    () => ({
      default: refugeIcon(false),
      selected: refugeIcon(true),
    }),
    []
  );

  useEffect(() => {
    if (!selectedId) return;
    const marker = markerRefs.current.get(selectedId);
    marker?.openPopup();
  }, [selectedId]);

  return (
    <>
      {places.slice(0, 40).map((p) => {
        const selected = selectedId === p.id;
        return (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={selected ? icons.selected : icons.default}
            zIndexOffset={selected ? 400 : 200}
            eventHandlers={{ click: () => onSelect(p.id) }}
            ref={(instance) => {
              if (instance) markerRefs.current.set(p.id, instance);
              else markerRefs.current.delete(p.id);
            }}
          >
            <Popup className="refuge-popup" maxWidth={280}>
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
          </Marker>
        );
      })}
    </>
  );
}
