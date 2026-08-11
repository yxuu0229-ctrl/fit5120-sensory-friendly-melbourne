import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import { congestionAreas } from "../lib/congestion";
import type { LatLng } from "../lib/geo";
import type { SensorReading } from "../lib/journeyData";
import { densityColor, destinationMarkerColor, melbourneCenter, type RouteEndpoints } from "./mapShared";

function ActiveJourneyMap({
  endpoints,
  currentLocation,
  routePath,
  sensors,
}: {
  endpoints: RouteEndpoints | null;
  currentLocation: LatLng | null;
  routePath: [number, number][];
  sensors: SensorReading[];
}) {
  const currentPoint: [number, number] | undefined = currentLocation
    ? [currentLocation.lat, currentLocation.lng]
    : endpoints
      ? [endpoints.from.lat, endpoints.from.lng]
      : routePath[0];
  const center = currentPoint ?? (endpoints ? [endpoints.from.lat, endpoints.from.lng] : melbourneCenter);
  const mapKey = [
    "active",
    routePath.length,
    routePath[0]?.join(","),
    routePath[routePath.length - 1]?.join(","),
    currentPoint?.join(","),
  ].join("|");
  const densityAreas = congestionAreas(routePath, sensors);

  return (
    <div className="leaflet-route-map active-leaflet-map" aria-label="Active journey map">
      <MapContainer
        center={center}
        key={mapKey}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        zoom={14}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePath.length > 1 && (
          <Polyline pathOptions={{ color: "#35890e", opacity: 0.95, weight: 7 }} positions={routePath} />
        )}
        {densityAreas.map((area) => (
          <CircleMarker
            center={[area.lat, area.lng]}
            key={area.level}
            pathOptions={{
              color: densityColor(area.level),
              fillColor: densityColor(area.level),
              fillOpacity: 0.3,
              weight: 3,
            }}
            radius={Math.min(34, 12 + area.count * 4)}
          >
            <Popup>
              <strong>{area.level} congestion area</strong>
              <br />
              {area.count} sensors near route
            </Popup>
          </CircleMarker>
        ))}
        {currentPoint && (
          <CircleMarker
            center={currentPoint}
            pathOptions={{ color: "#ffffff", fillColor: "#1b1b85", fillOpacity: 1, weight: 3 }}
            radius={9}
          >
            <Popup>Current location</Popup>
          </CircleMarker>
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
      </MapContainer>
    </div>
  );
}

export default ActiveJourneyMap;
