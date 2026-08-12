import { useEffect, type ReactNode } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLng } from "../../lib/types";
import { CBD_CENTER } from "../../lib/densityBands";
import "leaflet/dist/leaflet.css";

function FollowCam({
  follow,
  point,
  centerTarget,
}: {
  follow: boolean;
  point: LatLng | null;
  centerTarget?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (centerTarget) {
      map.setView([centerTarget.lat, centerTarget.lng], 15, { animate: true });
      return;
    }
    if (!follow || !point) return;
    map.panTo([point.lat, point.lng], { animate: true, duration: 0.6 });
  }, [follow, point, centerTarget, map]);
  return null;
}

export default function MapCanvas({
  follow,
  followPoint,
  centerTarget,
  children,
}: {
  follow: boolean;
  followPoint: LatLng | null;
  centerTarget?: { lat: number; lng: number } | null;
  children?: ReactNode;
}) {
  return (
    <MapContainer
      center={[CBD_CENTER.lat, CBD_CENTER.lng]}
      zoom={15}
      className="map-canvas"
      zoomControl={false}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <FollowCam follow={follow} point={followPoint} centerTarget={centerTarget} />
      {children}
    </MapContainer>
  );
}
