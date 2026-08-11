import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import type { LatLng } from "../lib/geo";
import type { NearbyRefuge, RefugeSearchMode } from "../lib/refuge";
import { destinationMarkerColor, melbourneCenter, type RouteEndpoints } from "./mapShared";

function RefugeMap({
  currentLocation,
  endpoints,
  focusMode,
  onSelectRefuge,
  refuges,
  routePath,
  selectedRefugeId,
}: {
  currentLocation: LatLng | null;
  endpoints: RouteEndpoints | null;
  focusMode: RefugeSearchMode;
  onSelectRefuge: (id: string) => void;
  refuges: NearbyRefuge[];
  routePath: [number, number][];
  selectedRefugeId: string;
}) {
  const routeCenter = routePath[Math.floor(routePath.length / 2)] ?? melbourneCenter;
  const center =
    focusMode === "current" && currentLocation
      ? [currentLocation.lat, currentLocation.lng] as [number, number]
      : routeCenter;
  const mapKey = [
    "refuge",
    focusMode,
    refuges.length,
    routePath.length,
    routePath[0]?.join(","),
    routePath[routePath.length - 1]?.join(","),
  ].join("|");

  return (
    <div className="leaflet-route-map refuge-leaflet-map" aria-label="Nearby sensory refuge map">
      <MapContainer
        center={center}
        key={mapKey}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        zoom={15}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePath.length > 1 && (
          <Polyline pathOptions={{ color: "#35890e", opacity: 0.9, weight: 6 }} positions={routePath} />
        )}
        {currentLocation && (
          <>
            <CircleMarker
              center={[currentLocation.lat, currentLocation.lng]}
              pathOptions={{ color: "#ffffff", fillColor: "#1b1b85", fillOpacity: 1, weight: 3 }}
              radius={9}
            >
              <Popup>Current location</Popup>
            </CircleMarker>
            <CircleMarker
              center={[currentLocation.lat, currentLocation.lng]}
              pathOptions={{ color: "#1b1b85", fillColor: "#1b1b85", fillOpacity: 0.05, weight: 1 }}
              radius={70}
            />
          </>
        )}
        {endpoints && (
          <CircleMarker
            center={[endpoints.to.lat, endpoints.to.lng]}
            pathOptions={{ color: "#1f2120", fillColor: destinationMarkerColor, fillOpacity: 1, weight: 2 }}
            radius={8}
          >
            <Popup>Destination</Popup>
          </CircleMarker>
        )}
        {refuges.map((refuge, index) => {
          const isSelected = refuge.id === selectedRefugeId;

          return (
            <CircleMarker
              center={[refuge.latitude, refuge.longitude]}
              eventHandlers={{ click: () => onSelectRefuge(refuge.id) }}
              key={refuge.id}
              pathOptions={{
                color: isSelected ? "#2f8f12" : "#1f2120",
                fillColor: isSelected ? "#2f8f12" : "#d6ffd6",
                fillOpacity: isSelected ? 1 : 0.9,
                weight: isSelected ? 4 : 2,
              }}
              radius={isSelected ? 14 : 10}
            >
              <Popup>
                <strong>{index + 1}. {refuge.name}</strong>
                <br />
                {Math.round(refuge.distanceMeters)} m away
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default RefugeMap;
