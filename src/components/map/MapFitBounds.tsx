import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "../../lib/types";

export default function MapFitBounds({
  points,
  paths,
  enabled,
}: {
  points: Array<LatLng | null | undefined>;
  paths?: [number, number][][];
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;
    const bounds = L.latLngBounds([]);
    let any = false;
    for (const p of points) {
      if (!p) continue;
      bounds.extend([p.lat, p.lng]);
      any = true;
    }
    for (const path of paths ?? []) {
      for (const [lat, lng] of path) {
        bounds.extend([lat, lng]);
        any = true;
      }
    }
    if (!any || !bounds.isValid()) return;
    map.fitBounds(bounds.pad(0.18), { animate: true, maxZoom: 16 });
  }, [points, paths, enabled, map]);

  return null;
}
