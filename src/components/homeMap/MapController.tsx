import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Controller to smoothly pan the map when search or center changes
export default function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true, duration: 1.0 });
  }, [center, map]);
  return null;
}
