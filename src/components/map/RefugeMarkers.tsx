import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import {
  classifyRefuge,
  REFUGE_KIND_META,
  type RefugeKind,
} from "../../lib/refugeCategories";
import type { RefugePlace } from "../../lib/types";

function formatDistance(meters?: number) {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

function kindIcon(kind: RefugeKind, selected: boolean) {
  const meta = REFUGE_KIND_META[kind];
  const size = selected ? 32 : 26;
  const isDiamond = kind === "quiet" || kind === "other" || kind === "landmark";
  const shape = isDiamond
    ? `<span class="refuge-glyph refuge-glyph-diamond" style="--c:${meta.color}"><span class="refuge-glyph-inner">${meta.short}</span></span>`
    : `<span class="refuge-glyph" style="--c:${meta.color}">${meta.short}</span>`;
  return L.divIcon({
    className: `refuge-pin-wrap${selected ? " is-selected" : ""}`,
    html: `<div class="refuge-pin-modern${selected ? " is-selected" : ""}" aria-hidden="true">${shape}</div>`,
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

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const p of places) {
      const kind = classifyRefuge(p);
      const key = `${kind}-${selectedId === p.id}`;
      if (!map.has(key)) map.set(key, kindIcon(kind, selectedId === p.id));
    }
    return map;
  }, [places, selectedId]);

  useEffect(() => {
    if (navigating) {
      markerRefs.current.forEach((marker) => marker.closePopup());
      return;
    }
    if (!selectedId) return;
    markerRefs.current.get(selectedId)?.openPopup();
  }, [selectedId, navigating]);

  return (
    <>
      {places.slice(0, 50).map((p) => {
        const kind = classifyRefuge(p);
        const selected = selectedId === p.id;
        const icon =
          icons.get(`${kind}-${selected}`) ?? kindIcon(kind, selected);
        const meta = REFUGE_KIND_META[kind];
        return (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={icon}
            zIndexOffset={selected ? 420 : 220}
            eventHandlers={{
              click: () => {
                if (!navigating) onSelect(p.id);
              },
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
                  <p>
                    {meta.label}
                    {p.category ? ` · ${p.category}` : ""}
                  </p>
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
