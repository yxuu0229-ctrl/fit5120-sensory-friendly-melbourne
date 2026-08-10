import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import { congestionAreas } from "../lib/congestion";
import type { SensorReading } from "../lib/journeyData";
import { transitStopsNearRoute } from "../lib/transitStops";
import { densityColor, destinationMarkerColor, melbourneCenter, type RouteEndpoints } from "./mapShared";

function RouteMap({
  endpoints,
  routePath,
  routeName,
  sensors,
}: {
  endpoints: RouteEndpoints | null;
  routePath: [number, number][];
  routeName: string;
  sensors: SensorReading[];
}) {
  const center =
    routePath[Math.floor(routePath.length / 2)] ??
    (endpoints ? [endpoints.from.lat, endpoints.from.lng] : melbourneCenter);
  const mapKey = [
    routeName,
    routePath.length,
    routePath[0]?.join(","),
    routePath[routePath.length - 1]?.join(","),
  ].join("|");
  const densityAreas = congestionAreas(routePath, sensors);
  // AC 1.1.5 — stations and tram stops within 150 m of the walking route.
  const transitStops = transitStopsNearRoute(routePath);

  return (
    <div className="leaflet-route-map" aria-label="Melbourne CBD route map">
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
        {densityAreas.map((area) => (
          <CircleMarker
            center={[area.lat, area.lng]}
            key={area.level}
            pathOptions={{
              color: densityColor(area.level),
              fillColor: densityColor(area.level),
              fillOpacity: 0.32,
              weight: 3,
            }}
            radius={Math.min(34, 12 + area.count * 4)}
          >
            <Popup>
              <strong>{area.level} congestion area</strong>
              <br />
              {area.count} nearby route sensors
            </Popup>
          </CircleMarker>
        ))}
        {transitStops.map((stop) => (
          <CircleMarker
            center={[stop.latitude, stop.longitude]}
            key={stop.id}
            pathOptions={{ color: "#1d4ed8", fillColor: "#ffffff", fillOpacity: 1, weight: 3 }}
            radius={6}
          >
            <Popup>
              <strong>{stop.name}</strong>
              <br />
              {stop.kind} access point · {stop.distanceMeters} m from route
            </Popup>
          </CircleMarker>
        ))}
        {routePath.length > 1 && (
          <Polyline
            pathOptions={{ color: "#35890e", opacity: 0.95, weight: 6 }}
            positions={routePath}
          >
            <Popup>{routeName}</Popup>
          </Polyline>
        )}
        {endpoints && (
          <>
            <CircleMarker
              center={[endpoints.from.lat, endpoints.from.lng]}
              pathOptions={{ color: "#1f2120", fillColor: "#35890e", fillOpacity: 1, weight: 2 }}
              radius={8}
            >
              <Popup>Origin</Popup>
            </CircleMarker>
            <CircleMarker
              center={[endpoints.to.lat, endpoints.to.lng]}
              pathOptions={{ color: "#1f2120", fillColor: destinationMarkerColor, fillOpacity: 1, weight: 2 }}
              radius={8}
            >
              <Popup>Destination</Popup>
            </CircleMarker>
          </>
        )}
      </MapContainer>
    </div>
  );
}

export default RouteMap;
