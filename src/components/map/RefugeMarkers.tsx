import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef } from "react";
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
    html: `<div class="refuge-pin${selected ? " is-selected" : ""}" aria-hidden="true" style="font-size: ${size}px;">😇</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export default function RefugeMarkers({
  places,
  selectedId,
  navigating,
  onSelect,
  onNavigate,
}: {
  places: RefugePlace[];
  selectedId: string | null;
  navigating: boolean;
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

  const handleMarkerClick = useCallback(
    (id: string) => {
      if (!navigating) onSelect(id);
    },
    [navigating, onSelect]
  );

  useEffect(() => {
    if (navigating) {
      markerRefs.current.forEach((marker) => marker.closePopup());
      return;
    }
    if (!selectedId) return;
    const marker = markerRefs.current.get(selectedId);
    marker?.openPopup();
  }, [selectedId, navigating]);

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
            eventHandlers={{
              click: () => handleMarkerClick(p.id),
            }}
            ref={(instance) => {
              if (instance) markerRefs.current.set(p.id, instance);
              else markerRefs.current.delete(p.id);
            }}
          >
            {!navigating ? (
              <Popup className="refuge-popup" maxWidth={280}>
                <div className="refuge-popup-body">
                  <strong>{p.name}</strong>
                  <p>{p.category || p.theme || "Quiet public space"}</p>
                  {formatDistance(p.distanceMeters) ? (
                    <p className="refuge-popup-meta">
                      {formatDistance(p.distanceMeters)}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary refuge-popup-nav"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      markerRefs.current.get(p.id)?.closePopup();
                      onNavigate(p);
                    }}
                  >
                    Navigate to it
                  </button>
                </div>
              </Popup>
            ) : null}
          </Marker>
        );
      })}
    </>
  );
}
