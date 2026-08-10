import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getSupabase, hasSupabaseEnv } from "./lib/supabase";

const navItems = ["Plan journey", "Route options", "Journey monitor", "Quiet spaces"];
type Page =
  | "plan"
  | "routes"
  | "warning"
  | "confirm"
  | "monitor"
  | "predictive"
  | "quiet"
  | "refugeDetail";
type SensorPoint = {
  location_id: number;
  sensor_name: string | null;
  latitude: number;
  longitude: number;
  density_level: "Low" | "Medium" | "High";
  total_count?: number;
  sensing_datetime?: string | null;
};
type PlannedTrip = {
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  crowdScore?: number;
  alternativesConsidered?: number;
  allPositions?: [number, number][];
};
type LatLng = {
  lat: number;
  lng: number;
};
type RouteOption = {
  name: string;
  label: string;
  sensoryLevel: "Low" | "Medium" | "High";
  distanceMeters: number;
  durationSeconds: number;
  sensoryLoad: number;
  positions: [number, number][];
};
type OsrmRoute = {
  distance: number;
  duration: number;
  geometry?: { coordinates?: [number, number][] };
};
type PlaceRow = {
  id: string;
  name: string;
  category: string | null;
  theme: string | null;
  sub_theme: string | null;
  source: string;
  latitude: number;
  longitude: number;
};
type NearbyRefuge = PlaceRow & {
  distanceMeters: number;
};
type AddressStatus = "idle" | "checking" | "ready" | "error";
type RefugeSearchMode = "current" | "route";
type Refuge = {
  id: string;
  marker: string;
  name: string;
  type: string;
  distance: string;
  cardDistance: string;
  availability: string;
  cardAvailability: string;
  quietnessData: string;
  cardQuietnessData: string;
  note: string;
  category: string;
  imageUrl: string;
};

const cbdLocations = [
  { name: "Southern Cross Station", lat: -37.8183, lng: 144.9525 },
  { name: "State Library Victoria", lat: -37.8098, lng: 144.9652 },
  { name: "Flagstaff Station", lat: -37.812, lng: 144.9562 },
  { name: "Melbourne Town Hall", lat: -37.815, lng: 144.9667 },
  { name: "Bourke Street Mall", lat: -37.8136, lng: 144.9645 },
];
const defaultOrigin = "Current location";
const defaultDestination = "State Library Victoria, Melbourne CBD";
const melbourneCenter: [number, number] = [-37.8136, 144.9631];
const destinationMarkerColor = "#2563eb";
const routeSensorRadiusMeters = 500;
const nearbyRefugeRadiusMeters = 1000;
const refugePageSize = 4;
const densityLevels: SensorPoint["density_level"][] = ["Low", "Medium", "High"];

const refuges: Refuge[] = [
  {
    id: "state-library",
    marker: "L",
    name: "State Library forecourt quiet zone",
    type: "Library / public forecourt",
    distance: "5 min from current route",
    cardDistance: "5m",
    availability: "Open public area",
    cardAvailability: "Open",
    quietnessData: "Medium confidence, predicted lower crowd",
    cardQuietnessData: "Medium",
    note: "Not guaranteed quiet; use as potential refuge.",
    category: "Library",
    imageUrl: "/images/library.jpg",
  },
  {
    id: "flagstaff-gardens",
    marker: "P",
    name: "Flagstaff Gardens north path",
    type: "Park / outdoor path",
    distance: "7 min from current route",
    cardDistance: "7m",
    availability: "Open public area",
    cardAvailability: "Open",
    quietnessData: "Current lower pedestrian flow",
    cardQuietnessData: "Current",
    note: "Outdoor space with lower pedestrian flow.",
    category: "Park",
    imageUrl: "/images/park.jpg",
  },
  {
    id: "town-hall-arcade",
    marker: "S",
    name: "Town Hall side arcade seating",
    type: "Public seating",
    distance: "3 min from current route",
    cardDistance: "3m",
    availability: "Unknown",
    cardAvailability: "Unknown",
    quietnessData: "Unavailable",
    cardQuietnessData: "Unavailable",
    note: "Quietness unconfirmed; basic access known.",
    category: "Public",
    imageUrl: "/images/public-space.jpg",
  },
];

function densityColor(level: SensorPoint["density_level"]) {
  if (level === "Low") return "#2f9f59";
  if (level === "Medium") return "#d2b538";
  return "#c8573f";
}

function formatSensorName(name: string | null | undefined) {
  if (!name) return "Route sensor";
  return name.replace(/_/g, " ");
}

function getRefugeImage(refuge: NearbyRefuge | null | undefined, fallback: Refuge) {
  if (!refuge) return fallback.imageUrl;

  const text = [
    refuge.name,
    refuge.category,
    refuge.theme,
    refuge.sub_theme,
    refuge.source,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("library")) return "/images/library.jpg";
  if (
    text.includes("park") ||
    text.includes("garden") ||
    text.includes("reserve") ||
    text.includes("open space")
  ) {
    return "/images/park.jpg";
  }
  if (
    text.includes("assembly") ||
    text.includes("arts") ||
    text.includes("culture") ||
    text.includes("museum") ||
    text.includes("gallery") ||
    text.includes("worship") ||
    text.includes("church") ||
    text.includes("synagogue") ||
    text.includes("health") ||
    text.includes("hospital") ||
    text.includes("medical")
  ) {
    return "/images/public-space.jpg";
  }

  return "/images/default-melbourne.jpg";
}

function distanceMeters(a: LatLng, b: LatLng) {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function distanceToRouteMeters(point: LatLng, routePath: [number, number][]) {
  return Math.min(
    ...routePath.map(([lat, lng]) => distanceMeters(point, { lat, lng }))
  );
}

function RouteMap({
  endpoints,
  routePath,
  routeName,
  sensors,
}: {
  endpoints: { from: LatLng; to: LatLng } | null;
  routePath: [number, number][];
  routeName: string;
  sensors: SensorPoint[];
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
  const routeSensors =
    routePath.length > 1
      ? sensors.filter((sensor) =>
          routePath.some(
            ([lat, lng]) =>
              distanceMeters({ lat, lng }, { lat: sensor.latitude, lng: sensor.longitude }) <=
              routeSensorRadiusMeters
          )
        )
      : sensors;
  const densityAreas = densityLevels
    .map((level) => {
      const matches = routeSensors.filter((sensor) => sensor.density_level === level);
      if (!matches.length) return null;

      return {
        level,
        count: matches.length,
        lat: matches.reduce((sum, sensor) => sum + sensor.latitude, 0) / matches.length,
        lng: matches.reduce((sum, sensor) => sum + sensor.longitude, 0) / matches.length,
      };
    })
    .filter((area): area is { level: SensorPoint["density_level"]; count: number; lat: number; lng: number } =>
      Boolean(area)
    );

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

function ActiveJourneyMap({
  endpoints,
  currentLocation,
  routePath,
  sensors,
}: {
  endpoints: { from: LatLng; to: LatLng } | null;
  currentLocation: LatLng | null;
  routePath: [number, number][];
  sensors: SensorPoint[];
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
  const routeSensors =
    routePath.length > 1
      ? sensors.filter((sensor) =>
          routePath.some(
            ([lat, lng]) =>
              distanceMeters({ lat, lng }, { lat: sensor.latitude, lng: sensor.longitude }) <=
              routeSensorRadiusMeters
          )
        )
      : sensors;
  const densityAreas = densityLevels
    .map((level) => {
      const matches = routeSensors.filter((sensor) => sensor.density_level === level);
      if (!matches.length) return null;

      return {
        level,
        count: matches.length,
        lat: matches.reduce((sum, sensor) => sum + sensor.latitude, 0) / matches.length,
        lng: matches.reduce((sum, sensor) => sum + sensor.longitude, 0) / matches.length,
      };
    })
    .filter((area): area is { level: SensorPoint["density_level"]; count: number; lat: number; lng: number } =>
      Boolean(area)
    );

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
  endpoints: { from: LatLng; to: LatLng } | null;
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

function App() {
  const [page, setPage] = useState<Page>("plan");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [openLocationMenu, setOpenLocationMenu] = useState<"origin" | "destination" | null>(null);
  const [originPoint, setOriginPoint] = useState<LatLng | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<LatLng | null>(null);
  const [originStatus, setOriginStatus] = useState<AddressStatus>("idle");
  const [destinationStatus, setDestinationStatus] = useState<AddressStatus>("idle");
  const [originMessage, setOriginMessage] = useState("");
  const [destinationMessage, setDestinationMessage] = useState("");
  const [threshold, setThreshold] = useState(50);
  const [avoidCongestion, setAvoidCongestion] = useState(true);
  const [sensorPoints, setSensorPoints] = useState<SensorPoint[]>([]);
  const [plannedTrip, setPlannedTrip] = useState<PlannedTrip | null>(null);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeError, setRouteError] = useState("");
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [routeEndpoints, setRouteEndpoints] = useState<{ from: LatLng; to: LatLng } | null>(null);
  const [nearbyRefuges, setNearbyRefuges] = useState<NearbyRefuge[]>([]);
  const [refugeSearchMode, setRefugeSearchMode] = useState<RefugeSearchMode>("current");
  const [refugePage, setRefugePage] = useState(1);
  const [selectedRefugeId, setSelectedRefugeId] = useState("state-library");
  const isBackendConfigured = useMemo(() => hasSupabaseEnv(), []);
  const needsCurrentLocation = origin.trim().toLowerCase() === defaultOrigin.toLowerCase();
  const canPlanJourney =
    origin.trim() !== "" &&
    destination.trim() !== "" &&
    originPoint !== null &&
    destinationPoint !== null &&
    (!needsCurrentLocation || locationStatus === "ready");
  const selectedRefuge = refuges.find((refuge) => refuge.id === selectedRefugeId) ?? refuges[0];
  const selectedNearbyRefuge = nearbyRefuges.find((refuge) => refuge.id === selectedRefugeId);
  const selectedRefugeImage = getRefugeImage(selectedNearbyRefuge, selectedRefuge);
  const selectedRoute = routeOptions[selectedRouteIndex];
  const selectedRoutePath = selectedRoute?.positions ?? plannedTrip?.allPositions ?? [];
  const totalRefugePages = Math.max(1, Math.ceil(nearbyRefuges.length / refugePageSize));
  const visibleRefuges = nearbyRefuges.slice(
    (refugePage - 1) * refugePageSize,
    refugePage * refugePageSize
  );
  const routeHighSensors = selectedRoutePath.length
    ? sensorPoints.filter(
        (sensor) =>
          sensor.density_level === "High" &&
          selectedRoutePath.some(
            ([lat, lng]) =>
              distanceMeters({ lat, lng }, { lat: sensor.latitude, lng: sensor.longitude }) <=
              routeSensorRadiusMeters
          )
      )
    : [];
  const predictiveAlertSensor = routeHighSensors[0];

  useEffect(() => {
    if (!isBackendConfigured || page !== "routes") return;

    void getSupabase()
      .from("sensor_density_current")
      .select("location_id,sensor_name,latitude,longitude,density_level,total_count,sensing_datetime")
      .limit(12)
      .then(({ data }) => {
        setSensorPoints((data ?? []) as SensorPoint[]);
      });
  }, [isBackendConfigured, page]);

  useEffect(() => {
    function closeLocationMenu(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest(".location-field")) return;
      setOpenLocationMenu(null);
    }

    document.addEventListener("mousedown", closeLocationMenu);
    return () => document.removeEventListener("mousedown", closeLocationMenu);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPlanJourney) return;

    setRouteError("");
    setRouteOptions([]);
    setSelectedRouteIndex(0);

    const from = originPoint;
    const to = destinationPoint;
    if (!from || !to) {
      setRouteError("Address not recognised. Please choose one of the suggested locations.");
      return;
    }
    setRouteEndpoints({ from, to });
    const sensors = await loadSensorPoints();

    try {
      const [backendResponse, osrmRoutes] = await Promise.all([
        fetch("/api/route/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, mode: "walk" }),
        }),
        fetchOsrmRouteOptions(from, to),
      ]);

      if (backendResponse.ok) {
        const body = (await backendResponse.json()) as { trip: PlannedTrip };
        setPlannedTrip(body.trip);
        setRouteOptions(
          buildRouteOptions(
            [
              ...(body.trip.allPositions
                ? [
                    {
                      label: body.trip.label,
                      distanceMeters: body.trip.distanceMeters,
                      durationSeconds: body.trip.durationSeconds,
                      positions: body.trip.allPositions,
                    },
                  ]
                : []),
              ...osrmRoutes.map((route, index) => ({
                label: index === 0 ? "Direct walking route" : `Walking alternative ${index + 1}`,
                distanceMeters: route.distance,
                durationSeconds: route.duration,
                positions:
                  route.geometry?.coordinates?.map(([lng, lat]) => [lat, lng] as [number, number]) ??
                  [],
              })),
            ],
            sensors,
            avoidCongestion
          )
        );
      } else {
        setRouteError("Backend route API is not available. Showing prototype route data.");
      }
    } catch {
      setRouteError("Backend route API is not available. Showing prototype route data.");
    }

    setPage("routes");
  }

  async function loadSensorPoints() {
    if (!isBackendConfigured) return sensorPoints;

    const { data } = await getSupabase()
      .from("sensor_density_current")
      .select("location_id,sensor_name,latitude,longitude,density_level,total_count,sensing_datetime")
      .limit(40);
    const sensors = (data ?? []) as SensorPoint[];
    setSensorPoints(sensors);
    return sensors;
  }

  async function fetchOsrmRouteOptions(from: LatLng, to: LatLng) {
    const points = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${points}?overview=full&geometries=geojson&alternatives=true&steps=false`
    );
    if (!response.ok) return [];
    const body = (await response.json()) as { routes?: OsrmRoute[] };
    return body.routes ?? [];
  }

  function buildRouteOptions(
    routes: Array<{
      label: string;
      distanceMeters: number;
      durationSeconds: number;
      positions: [number, number][];
    }>,
    sensors: SensorPoint[],
    shouldAvoidCongestion: boolean
  ): RouteOption[] {
    return routes
      .filter((route) => route.positions.length > 1)
      .filter((route, index, allRoutes) => {
        const routeKey = routeSignature(route);
        return allRoutes.findIndex((candidate) => routeSignature(candidate) === routeKey) === index;
      })
      .map((route) => ({
        ...route,
        durationSeconds: walkingDurationSeconds(route.distanceMeters),
        sensoryLoad: sensoryLoad(route.positions, sensors),
      }))
      .sort((a, b) =>
        shouldAvoidCongestion
          ? a.sensoryLoad - b.sensoryLoad || a.durationSeconds - b.durationSeconds
          : a.durationSeconds - b.durationSeconds || a.distanceMeters - b.distanceMeters
      )
      .slice(0, 3)
      .map((route, index) => ({
        ...route,
        name: `Route ${String.fromCharCode(65 + index)}`,
        sensoryLevel: sensoryLevel(route.sensoryLoad),
      }));
  }

  function routeSignature(route: { distanceMeters: number; positions: [number, number][] }) {
    const start = route.positions[0];
    const end = route.positions[route.positions.length - 1];
    return [
      Math.round(route.distanceMeters / 25),
      start?.map((value) => value.toFixed(4)).join(","),
      end?.map((value) => value.toFixed(4)).join(","),
    ].join("|");
  }

  function sensoryLoad(positions: [number, number][], sensors: SensorPoint[]) {
    if (!sensors.length) return 20;

    const densityWeight = { Low: 0, Medium: 2, High: 5 };
    const samples = positions.filter((_, index) => index % Math.max(1, Math.floor(positions.length / 24)) === 0);
    const total = samples.reduce((sum, [lat, lng]) => {
      const nearest = sensors.reduce(
        (current, sensor) => {
          const distance = distanceMeters({ lat, lng }, { lat: sensor.latitude, lng: sensor.longitude });
          return distance < current.distance ? { distance, level: sensor.density_level } : current;
        },
        { distance: Number.POSITIVE_INFINITY, level: "Low" as SensorPoint["density_level"] }
      );

      return sum + (nearest.distance <= 120 ? densityWeight[nearest.level] : 0.4);
    }, 0);

    return Math.round((total / samples.length / 5) * 100);
  }

  function walkingDurationSeconds(distanceMeters: number) {
    return Math.round((distanceMeters / 80) * 60);
  }

  function sensoryLevel(load: number): RouteOption["sensoryLevel"] {
    if (load < 30) return "Low";
    if (load < 70) return "Medium";
    return "High";
  }

  function selectRoute(route: RouteOption, index: number) {
    setSelectedRouteIndex(index);
    if (route.sensoryLoad > threshold) {
      setPage("warning");
    } else {
      setPage("confirm");
    }
  }

  function resolveCbdLocation(value: string): LatLng | null {
    const normalized = value.toLowerCase();
    if (normalized.includes(defaultOrigin.toLowerCase()) && currentLocation) {
      return currentLocation;
    }
    const match = cbdLocations.find((location) => normalized.includes(location.name.toLowerCase()));
    return match ?? null;
  }

  async function validateAddress(field: "origin" | "destination") {
    const value = field === "origin" ? origin.trim() : destination.trim();
    if (!value || value.toLowerCase() === defaultOrigin.toLowerCase()) return;

    const localMatch = resolveCbdLocation(value);
    if (localMatch) {
      setAddressResult(field, localMatch, `Using: ${value}`);
      return;
    }

    setAddressStatus(field, "checking", "Checking address...");
    try {
      const result = await geocodeAddress(value);
      if (!result) {
        setAddressResult(field, null, "Address not recognised. Please choose a suggested location or enter more detail.");
        return;
      }

      setAddressResult(field, result.point, `Using: ${result.label}`);
    } catch {
      setAddressResult(field, null, "Address lookup failed. Please choose a suggested location.");
    }
  }

  async function geocodeAddress(value: string) {
    const query = encodeURIComponent(`${value}, Melbourne, Victoria, Australia`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=au&q=${query}`
    );
    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const first = results[0];
    if (!first) return null;

    return {
      label: first.display_name,
      point: {
        lat: Number(first.lat),
        lng: Number(first.lon),
      },
    };
  }

  function setAddressStatus(field: "origin" | "destination", status: AddressStatus, message: string) {
    if (field === "origin") {
      setOriginStatus(status);
      setOriginMessage(message);
    } else {
      setDestinationStatus(status);
      setDestinationMessage(message);
    }
  }

  function setAddressResult(field: "origin" | "destination", point: LatLng | null, message: string) {
    if (field === "origin") {
      setOriginPoint(point);
      setOriginStatus(point ? "ready" : "error");
      setOriginMessage(message);
    } else {
      setDestinationPoint(point);
      setDestinationStatus(point ? "ready" : "error");
      setDestinationMessage(message);
    }
  }

  function useCurrentLocation() {
    if (!origin) setOrigin(defaultOrigin);
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);
        setOriginPoint(location);
        setOriginStatus("ready");
        setOriginMessage("Using your current location.");
        setLocationStatus("ready");
      },
      () => {
        setCurrentLocation(null);
        setOriginPoint(null);
        setOriginStatus("error");
        setOriginMessage("Location was not allowed. Enter an origin manually.");
        setLocationStatus("error");
      }
    );
  }

  function startJourney() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setPage("monitor");
      },
      () => setPage("monitor")
    );
  }

  function chooseLocation(field: "origin" | "destination", value: string) {
    const location = cbdLocations.find((item) => item.name === value);
    if (field === "origin") {
      setOrigin(value);
      setLocationStatus("idle");
    } else {
      setDestination(value);
    }
    if (location) {
      setAddressResult(field, { lat: location.lat, lng: location.lng }, `Using: ${location.name}`);
    }
    setOpenLocationMenu(null);
  }

  async function loadNearbyRefugesFromLocation(location: LatLng) {
    if (!isBackendConfigured) return;

    const { data } = await getSupabase()
      .from("places")
      .select("id,name,category,theme,sub_theme,source,latitude,longitude")
      .eq("is_sensory_refuge", true);
    const refugesWithinRange = ((data ?? []) as PlaceRow[])
      .map((place) => ({
        ...place,
        distanceMeters: distanceMeters(location, { lat: place.latitude, lng: place.longitude }),
      }))
      .filter((place) => place.distanceMeters <= nearbyRefugeRadiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    setNearbyRefuges(refugesWithinRange);
    setRefugePage(1);
    if (refugesWithinRange[0]) setSelectedRefugeId(refugesWithinRange[0].id);
  }

  async function loadNearbyRefugesFromRoute() {
    if (!isBackendConfigured || selectedRoutePath.length < 2) return;

    const { data } = await getSupabase()
      .from("places")
      .select("id,name,category,theme,sub_theme,source,latitude,longitude")
      .eq("is_sensory_refuge", true);
    const refugesAlongRoute = ((data ?? []) as PlaceRow[])
      .map((place) => ({
        ...place,
        distanceMeters: distanceToRouteMeters(
          { lat: place.latitude, lng: place.longitude },
          selectedRoutePath
        ),
      }))
      .filter((place) => place.distanceMeters <= nearbyRefugeRadiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    setNearbyRefuges(refugesAlongRoute);
    setRefugePage(1);
    if (refugesAlongRoute[0]) setSelectedRefugeId(refugesAlongRoute[0].id);
  }

  function findQuietSpacesByCurrentLocation() {
    setRefugeSearchMode("current");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);
        void loadNearbyRefugesFromLocation(location);
        setPage("quiet");
      },
      () => {
        setNearbyRefuges([]);
        setRefugePage(1);
        setPage("quiet");
      }
    );
  }

  function findQuietSpacesByRoute() {
    setRefugeSearchMode("route");
    void loadNearbyRefugesFromRoute();
    setPage("quiet");
  }

  function selectRefuge(id: string) {
    const refugeIndex = nearbyRefuges.findIndex((refuge) => refuge.id === id);
    if (refugeIndex >= 0) {
      setRefugePage(Math.floor(refugeIndex / refugePageSize) + 1);
    }
    setSelectedRefugeId(id);
  }

  return (
    <div className="app-shell">
      <header className="top-nav" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Relax Maps home">
          Relax Maps
        </a>
        <nav className="nav-links">
          {navItems.map((item) => (
            <button
              className={
                (page === "plan" && item === "Plan journey") ||
                ((page === "routes" || page === "warning" || page === "confirm") &&
                  item === "Route options") ||
                ((page === "monitor" || page === "predictive") && item === "Journey monitor") ||
                ((page === "quiet" || page === "refugeDetail") && item === "Quiet spaces")
                  ? "nav-link nav-link-active"
                  : "nav-link"
              }
              key={item}
              onClick={() => {
                if (item === "Plan journey") setPage("plan");
                if (item === "Route options") setPage("routes");
                if (item === "Journey monitor") setPage("monitor");
                if (item === "Quiet spaces") setPage("quiet");
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      {page === "plan" && (
        <main className="journey-page">
          <section className="intro" aria-labelledby="page-title">
            <h1 id="page-title">Plan a sensory-aware journey</h1>
            <p>
              Enter a Melbourne CBD destination, set a crowd-density threshold, and choose whether
              to avoid highly congested pedestrian corridors.
            </p>
          </section>

          <form className="journey-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="origin">Origin</label>
              <div className="location-field">
                <input
                  id="origin"
                  name="origin"
                  onBlur={() => {
                    void validateAddress("origin");
                  }}
                  onClick={() => setOpenLocationMenu("origin")}
                  placeholder={defaultOrigin}
                  type="text"
                  value={origin}
                  onChange={(event) => {
                    setOrigin(event.target.value);
                    setOriginPoint(null);
                    setOriginStatus("idle");
                    setOriginMessage("");
                    setOpenLocationMenu("origin");
                    if (event.target.value.trim().toLowerCase() !== defaultOrigin.toLowerCase()) {
                      setLocationStatus("idle");
                    }
                  }}
                  onFocus={() => {
                    setOpenLocationMenu("origin");
                    if (!origin) useCurrentLocation();
                  }}
                />
                {openLocationMenu === "origin" && (
                  <div className="location-menu">
                    {cbdLocations.map((location) => (
                      <button
                        key={location.name}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          chooseLocation("origin", location.name);
                        }}
                        type="button"
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {originStatus !== "idle" && <p className={`address-note address-note-${originStatus}`}>{originMessage}</p>}
            </div>

            <div className="field-group">
              <label htmlFor="destination">Destination</label>
              <div className="location-field">
                <input
                  id="destination"
                  name="destination"
                  onBlur={() => {
                    void validateAddress("destination");
                  }}
                  onClick={() => setOpenLocationMenu("destination")}
                  placeholder={defaultDestination}
                  type="text"
                  value={destination}
                  onChange={(event) => {
                    setDestination(event.target.value);
                    setDestinationPoint(null);
                    setDestinationStatus("idle");
                    setDestinationMessage("");
                    setOpenLocationMenu("destination");
                  }}
                  onFocus={() => {
                    setOpenLocationMenu("destination");
                    if (!destination) {
                      setDestination(defaultDestination);
                      const location = cbdLocations.find((item) => item.name === "State Library Victoria");
                      if (location) {
                        setAddressResult("destination", { lat: location.lat, lng: location.lng }, `Using: ${defaultDestination}`);
                      }
                    }
                  }}
                />
                {openLocationMenu === "destination" && (
                  <div className="location-menu">
                    {cbdLocations.map((location) => (
                      <button
                        key={location.name}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          chooseLocation("destination", location.name);
                        }}
                        type="button"
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {destinationStatus !== "idle" && (
                <p className={`address-note address-note-${destinationStatus}`}>{destinationMessage}</p>
              )}
            </div>

            <section className="card threshold-card" aria-labelledby="threshold-title">
              <h2 id="threshold-title">Preferred crowd-density threshold</h2>
              <p>Routes above this limit trigger a warning and lower-stimulation alternatives.</p>
              <div className="range-wrap">
                <input
                  aria-label="Preferred crowd-density threshold"
                  className="threshold-range"
                  max="100"
                  min="0"
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  style={{ "--threshold": `${threshold}%` } as CSSProperties}
                  type="range"
                  value={threshold}
                />
                <output
                  className="range-value"
                  style={{ left: `calc(${threshold}% + ${19 - threshold * 0.38}px)` }}
                >
                  {threshold}
                </output>
              </div>
            </section>

            <section className="card preferences-card" aria-labelledby="preferences-title">
              <div className="preferences-heading">
                <h2 id="preferences-title">Avoidance preferences</h2>
                <button
                  aria-label="Avoid highly congested corridors"
                  aria-pressed={avoidCongestion}
                  className={avoidCongestion ? "toggle toggle-on" : "toggle"}
                  onClick={() => setAvoidCongestion((current) => !current)}
                  type="button"
                >
                  <span />
                </button>
              </div>
              <h3>Avoid highly congested corridors</h3>
              <p>
                Uses pedestrian-density information to reduce crowd-related stress before route
                generation. Factors: pedestrian volume, construction activity and events.
              </p>
            </section>

            <div className="action-area">
              <button className="primary-action" disabled={!canPlanJourney} type="submit">
                Find sensory-aware routes
              </button>
              {needsCurrentLocation && locationStatus === "loading" && (
                <p className="backend-note">Waiting for browser location permission.</p>
              )}
              {needsCurrentLocation && locationStatus === "error" && (
                <p className="backend-note">Location was not allowed. Enter an origin manually.</p>
              )}
              {needsCurrentLocation && locationStatus === "ready" && (
                <p className="backend-note">Current location is ready.</p>
              )}
              {routeError && <p className="backend-note">{routeError}</p>}
              {!isBackendConfigured && (
                <p className="backend-note">
                  Supabase keys are not configured yet. Route generation can be wired once the
                  browser-safe anon key is available.
                </p>
              )}
            </div>
          </form>
        </main>
      )}

      {page === "routes" && (
        <main className="routes-page">
          <section className="intro routes-intro" aria-labelledby="routes-title">
            <h1 id="routes-title">Compare sensory-aware routes</h1>
            <p>
              Review High and Low sensory indicators, congestion, travel time, walking distance and
              public-transport access points.
            </p>
          </section>

          <section className="routes-layout">
            <aside className="route-list-panel" aria-label="Route options">
              <div className="route-list-top">
                <span>{avoidCongestion ? "Sort: Low sensory first" : "Sort: Fastest walk first"}</span>
              </div>

              {(routeOptions.length ? routeOptions : [
                {
                  name: "Route A",
                  label: "Prototype route via Flagstaff Station",
                  sensoryLevel: "Low" as const,
                  distanceMeters: 480,
                  durationSeconds: 31 * 60,
                  sensoryLoad: 12,
                  positions: [],
                },
                {
                  name: "Route B",
                  label: "Prototype route via Parliament Station",
                  sensoryLevel: "Medium" as const,
                  distanceMeters: 620,
                  durationSeconds: 35 * 60,
                  sensoryLoad: 48,
                  positions: [],
                },
                {
                  name: "Route C",
                  label: "Prototype route via Swanston Street",
                  sensoryLevel: "High" as const,
                  distanceMeters: 220,
                  durationSeconds: 24 * 60,
                  sensoryLoad: 84,
                  positions: [],
                },
              ]).map((route, index) => (
                <article
                  className={index === selectedRouteIndex ? "route-card route-card-selected" : "route-card"}
                  key={`${route.name}-${route.label}`}
                  onClick={() => setSelectedRouteIndex(index)}
                >
                  <div className="route-card-header">
                    <span className={`sensory-dot sensory-${route.sensoryLevel.toLowerCase()}`}>
                      {route.sensoryLevel === "Medium" ? "Med" : route.sensoryLevel}
                    </span>
                    <h3>{route.name}: {route.label}</h3>
                    <span className={`sensory-pill sensory-pill-${route.sensoryLevel.toLowerCase()}`}>
                      {route.sensoryLevel} sensory
                    </span>
                  </div>
                  <div className="route-metrics">
                    <div><span>Congestion</span><strong>{route.sensoryLevel}</strong></div>
                    <div><span>Time</span><strong>{Math.round(route.durationSeconds / 60)}m</strong></div>
                    <div><span>Walk</span><strong>{Math.round(route.distanceMeters)}m</strong></div>
                    <div><span>PT access</span><strong>Walk</strong></div>
                  </div>
                  <div className="route-card-footer">
                    <p>Sensory load {route.sensoryLoad}/100; your threshold is {threshold}.</p>
                    <button
                      className={route.sensoryLevel === "Low" ? undefined : "secondary-button"}
                      onClick={() => selectRoute(route, index)}
                      type="button"
                    >
                      Select {route.name}
                    </button>
                  </div>
                </article>
              ))}
            </aside>

            <section className="map-panel" aria-labelledby="map-title">
              <h2 id="map-title">Melbourne CBD route map</h2>
              <p>
                Real walking route with live pedestrian-density sensor points from Supabase.
              </p>
              <RouteMap
                endpoints={routeEndpoints}
                routePath={selectedRoutePath}
                routeName={selectedRoute?.name ?? "Route A"}
                sensors={sensorPoints}
              />
              <p className="map-legend">
                Sensors within 500m of route: <span className="legend-low" /> Low congestion <span className="legend-medium" /> Medium congestion <span className="legend-high" /> High congestion
              </p>
              {routeError && <p className="backend-note">{routeError}</p>}
            </section>
          </section>
        </main>
      )}

      {page === "warning" && (
        <main className="warning-page">
          <section className="intro warning-intro" aria-labelledby="warning-title">
            <h1 id="warning-title">Route exceeds your threshold</h1>
            <p>
              Explain the affected section and present a lower-stimulation alternative without
              changing the route automatically.
            </p>
          </section>

          <section className="warning-layout">
            <section className="threshold-warning-card" aria-labelledby="threshold-warning-title">
              <div className="warning-icon" aria-hidden="true">!</div>
              <div>
                <h2 id="threshold-warning-title">Route B exceeds your crowd threshold</h2>
                <dl className="warning-details">
                  <div>
                    <dt>Location</dt>
                    <dd>Swanston Street</dd>
                  </div>
                  <div>
                    <dt>Expected</dt>
                    <dd>5:20-5:55 PM</dd>
                  </div>
                  <div>
                    <dt>Impact</dt>
                    <dd>High crowd density</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="alternative-panel" aria-labelledby="alternative-title">
              <h2 id="alternative-title">Lower-stimulation alternative</h2>
              <article className="route-card route-card-selected alternative-route-card">
                <div className="route-card-header">
                  <span className="sensory-dot sensory-low">Low</span>
                  <h3>Route A via Flagstaff Station</h3>
                  <span className="sensory-pill sensory-pill-low">Low sensory</span>
                </div>
                <div className="route-metrics">
                  <div><span>Congestion</span><strong>Low</strong></div>
                  <div><span>Time</span><strong>31m</strong></div>
                  <div><span>Walk</span><strong>480m</strong></div>
                  <div><span>PT access</span><strong>Train</strong></div>
                </div>
                <p className="alternative-factors">
                  Factors: lower pedestrian volume, no nearby events, no construction
                </p>
              </article>
              <p className="alternative-copy">
                Route A is 7 minutes longer and 260 m more walking, but avoids the affected
                corridor.
              </p>
              <div className="alternative-actions">
                <button className="secondary-button" onClick={() => setPage("routes")} type="button">
                  Keep current route
                </button>
                <button onClick={() => setPage("confirm")} type="button">Select alternative</button>
              </div>
            </section>
          </section>
        </main>
      )}

      {page === "confirm" && (
        <main className="confirm-page">
          <section className="intro confirm-intro" aria-labelledby="confirm-title">
            <h1 id="confirm-title">Confirm selected route</h1>
            <p>
              Confirm the route after reviewing sensory indicator, public-transport connection and
              preference match.
            </p>
          </section>

          <section className="confirm-layout">
            <section className="confirm-summary" aria-labelledby="confirm-route-title">
              <div className="confirm-heading">
                <span className={`sensory-dot sensory-${(selectedRoute?.sensoryLevel ?? "Low").toLowerCase()}`}>
                  {(selectedRoute?.sensoryLevel ?? "Low") === "Medium"
                    ? "Med"
                    : selectedRoute?.sensoryLevel ?? "Low"}
                </span>
                <h2 id="confirm-route-title">
                  {selectedRoute ? `${selectedRoute.name}: ${selectedRoute.label}` : "Route A"}
                </h2>
              </div>
              <p className="confirm-route-meta">
                {selectedRoute?.sensoryLevel ?? "Low"} sensory | Sensory load{" "}
                {selectedRoute?.sensoryLoad ?? 0}/100 |{" "}
                {Math.round((selectedRoute?.durationSeconds ?? 0) / 60)} min |{" "}
                {Math.round(selectedRoute?.distanceMeters ?? 0)} m walk | Walk access
              </p>

              <section className="route-preview-panel" aria-labelledby="route-preview-title">
                <h3 id="route-preview-title">Route preview</h3>
                <p>Walking route preview based on the selected option.</p>
                <RouteMap
                  endpoints={routeEndpoints}
                  routePath={selectedRoutePath}
                  routeName={selectedRoute?.name ?? "Route A"}
                  sensors={sensorPoints}
                />
                <p className="map-legend">
                  Sensors within 500m of route: <span className="legend-low" /> Low congestion <span className="legend-medium" /> Medium congestion <span className="legend-high" /> High congestion
                </p>
              </section>
            </section>

            <div className="confirm-side">
              <section className="match-panel" aria-labelledby="match-title">
                <h2 id="match-title">Why this route matches</h2>
                <ol>
                  <li>{selectedRoute?.sensoryLevel ?? "Low"} sensory based on nearby sensor density</li>
                  <li>Sensory load {selectedRoute?.sensoryLoad ?? 0}/100 is below your threshold of {threshold}</li>
                  <li>{Math.round(selectedRoute?.distanceMeters ?? 0)} m walking distance</li>
                  <li>Estimated walking time is {Math.round((selectedRoute?.durationSeconds ?? 0) / 60)} min</li>
                </ol>
              </section>
              <button
                className="start-journey-button"
                onClick={startJourney}
                type="button"
              >
                Start journey
              </button>
            </div>
          </section>
        </main>
      )}

      {page === "monitor" && (
        <main className="monitor-page">
          <section className="intro monitor-intro" aria-labelledby="monitor-title">
            <h1 id="monitor-title">Active journey monitoring</h1>
            <p>
              Map-focused view with calm real-time monitoring and access to next-hour forecast and
              quiet spaces.
            </p>
          </section>

          <section className="monitor-layout">
            <section className="active-map-panel" aria-labelledby="active-map-title">
              <h2 id="active-map-title">Active route map</h2>
              <p>Current progress: 0%. The map shows current location and the selected route.</p>
              <ActiveJourneyMap
                currentLocation={currentLocation}
                endpoints={routeEndpoints}
                routePath={selectedRoutePath}
                sensors={sensorPoints}
              />
              <p className="map-legend">
                Remaining route sensors: <span className="legend-low" /> Low congestion <span className="legend-medium" /> Medium congestion <span className="legend-high" /> High congestion
              </p>
            </section>

            <aside className="journey-panel" aria-label="Current route">
              <h2>Current route</h2>
              <p className="journey-route-name">
                {selectedRoute ? `${selectedRoute.name}: ${selectedRoute.label}` : "Selected route"}
              </p>
              <div className="journey-metrics">
                <div>
                  <span>Progress</span>
                  <strong>0%</strong>
                </div>
                <div>
                  <span>Next step</span>
                  <strong>Walk</strong>
                </div>
              </div>
              <h3>Active alert</h3>
              <p className="active-alert-copy">
                {selectedRoute && selectedRoute.sensoryLoad > threshold
                  ? "This route is currently above your preferred threshold."
                  : "No high-density warning on the selected route."}
              </p>
              <button
                className="secondary-button"
                onClick={() => setPage("predictive")}
                type="button"
              >
                Next-hour forecast
              </button>
              <button onClick={findQuietSpacesByCurrentLocation} type="button">Find quiet space</button>
            </aside>
          </section>
        </main>
      )}

      {page === "predictive" && (
        <main className="predictive-page">
          <section className="intro predictive-intro" aria-labelledby="predictive-title">
            <h1 id="predictive-title">Next-hour predictive alert</h1>
            <p>
              Understand which area may become overwhelming, when it is expected and how confident
              the forecast is.
            </p>
          </section>

          <section className="predictive-layout">
            <section className="prediction-card" aria-labelledby="prediction-card-title">
              <span className="prediction-pill">{predictiveAlertSensor ? "Current alert" : "No alert"}</span>
              <h2 id="prediction-card-title">
                {predictiveAlertSensor
                  ? `${formatSensorName(predictiveAlertSensor.sensor_name)} is currently high sensory`
                  : "No next-hour predictive warning available"}
              </h2>
              {predictiveAlertSensor ? (
                <>
                  <dl>
                    <div>
                      <dt>Area:</dt>
                      <dd>{formatSensorName(predictiveAlertSensor.sensor_name)}</dd>
                    </div>
                    <div>
                      <dt>Stressor:</dt>
                      <dd>current pedestrian density is high</dd>
                    </div>
                    <div>
                      <dt>People count:</dt>
                      <dd>{predictiveAlertSensor.total_count ?? "Unavailable"}</dd>
                    </div>
                  </dl>
                  <p>
                    Information type: current sensor reading. One-hour prediction is not available
                    from the current backend tables.
                  </p>
                </>
              ) : (
                <p>
                  No high-sensory sensor is currently detected within 500m of the selected route.
                  The current backend does not provide route-level one-hour forecast data.
                </p>
              )}
            </section>

            <section className="affected-map-panel" aria-labelledby="affected-map-title">
              <h2 id="affected-map-title">Affected area map</h2>
              <p>
                {predictiveAlertSensor
                  ? "Current high-sensory area is shown from live sensor data."
                  : "No affected area is shown because no route-level prediction is available."}
              </p>
              <RouteMap
                endpoints={routeEndpoints}
                routePath={selectedRoutePath}
                routeName={selectedRoute?.name ?? "Selected route"}
                sensors={predictiveAlertSensor ? [predictiveAlertSensor] : []}
              />
              <div className="predictive-actions">
                <button className="secondary-button" onClick={() => setPage("monitor")} type="button">
                  Dismiss alert
                </button>
                <button onClick={() => setPage("confirm")} type="button">Review journey</button>
              </div>
            </section>
          </section>
        </main>
      )}

      {page === "quiet" && (
        <main className="quiet-page">
          <section className="intro quiet-intro" aria-labelledby="quiet-title">
            <h1 id="quiet-title">Nearby sensory refuge locations</h1>
            <p>
              Find parks, libraries and quiet public spaces on demand. Quietness is not guaranteed
              when data is unavailable.
            </p>
          </section>

          <section className="quiet-layout">
            <aside className="refuge-list" aria-label="Nearby sensory refuge options">
              <h2>Nearby options</h2>

              <div className="refuge-search-actions">
                <button
                  className={refugeSearchMode === "current" ? "refuge-search-active" : ""}
                  onClick={findQuietSpacesByCurrentLocation}
                  type="button"
                >
                  Use current location
                </button>
                <button
                  className={refugeSearchMode === "route" ? "refuge-search-active" : ""}
                  disabled={selectedRoutePath.length < 2}
                  onClick={findQuietSpacesByRoute}
                  type="button"
                >
                  Search near route
                </button>
              </div>

              {refugeSearchMode === "current" && !currentLocation && (
                <p className="backend-note">Allow location access to find quiet spaces within 1km.</p>
              )}
              {refugeSearchMode === "current" && currentLocation && nearbyRefuges.length === 0 && (
                <p className="backend-note">No tagged quiet spaces found within 1km of your current location.</p>
              )}
              {refugeSearchMode === "route" && selectedRoutePath.length < 2 && (
                <p className="backend-note">Select a route before searching for quiet spaces near it.</p>
              )}
              {refugeSearchMode === "route" && selectedRoutePath.length > 1 && nearbyRefuges.length === 0 && (
                <p className="backend-note">No tagged quiet spaces found within 1km of the selected route.</p>
              )}

              {visibleRefuges.map((refuge, index) => (
                <article
                  className={
                    refuge.id === selectedRefugeId
                      ? "refuge-card refuge-card-selected"
                      : "refuge-card"
                  }
                  key={refuge.id}
                  onClick={() => selectRefuge(refuge.id)}
                >
                  <div className="refuge-card-header">
                    <span className="refuge-marker">
                      {(refugePage - 1) * refugePageSize + index + 1}
                    </span>
                    <h3>{refuge.name}</h3>
                    <span>{refuge.category ?? refuge.source}</span>
                  </div>
                  <div className="refuge-metrics">
                    <div>
                      <span>{refugeSearchMode === "route" ? "From route" : "Distance"}</span>
                      <strong>{Math.round(refuge.distanceMeters)}m</strong>
                    </div>
                    <div><span>Source</span><strong>{refuge.source}</strong></div>
                    <div><span>Data</span><strong>Tagged</strong></div>
                  </div>
                  <p>{refuge.theme ?? refuge.sub_theme ?? "Quietness is tagged, not guaranteed."}</p>
                </article>
              ))}

              {nearbyRefuges.length > refugePageSize && (
                <div className="refuge-pagination" aria-label="Quiet space result pages">
                  <button
                    className="secondary-button"
                    disabled={refugePage === 1}
                    onClick={() => setRefugePage((pageNumber) => Math.max(1, pageNumber - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <span>
                    Page {refugePage} of {totalRefugePages}
                  </span>
                  <button
                    className="secondary-button"
                    disabled={refugePage === totalRefugePages}
                    onClick={() =>
                      setRefugePage((pageNumber) => Math.min(totalRefugePages, pageNumber + 1))
                    }
                    type="button"
                  >
                    Next
                  </button>
                </div>
              )}
            </aside>

            <section className="refuge-map-panel" aria-labelledby="refuge-map-title">
              <h2 id="refuge-map-title">Refuge map</h2>
              <RefugeMap
                currentLocation={currentLocation}
                endpoints={routeEndpoints}
                focusMode={refugeSearchMode}
                onSelectRefuge={selectRefuge}
                refuges={nearbyRefuges}
                routePath={selectedRoutePath}
                selectedRefugeId={selectedRefugeId}
              />
              <div className="refuge-actions">
                <button className="secondary-button" onClick={() => setPage("monitor")} type="button">
                  Back to Journey
                </button>
                <button disabled={!nearbyRefuges.length} onClick={() => setPage("refugeDetail")} type="button">View detail</button>
              </div>
            </section>
          </section>
        </main>
      )}

      {page === "refugeDetail" && (
        <main className="refuge-detail-page">
          <section className="intro refuge-detail-intro" aria-labelledby="refuge-detail-title">
            <h1 id="refuge-detail-title">{selectedNearbyRefuge?.name ?? selectedRefuge.name}</h1>
            <p>View basic refuge information and return to the active journey when ready.</p>
          </section>

          <section className="refuge-detail-layout">
            <img
              alt={selectedNearbyRefuge?.name ?? selectedRefuge.name}
              className="refuge-detail-image"
              src={selectedRefugeImage}
            />

            <section className="refuge-detail-panel" aria-labelledby="refuge-panel-title">
              <div className="refuge-detail-heading">
                <span className="library-icon" aria-hidden="true" />
                <h2 id="refuge-panel-title">{selectedNearbyRefuge?.name ?? selectedRefuge.name}</h2>
              </div>
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{selectedNearbyRefuge?.category ?? selectedNearbyRefuge?.source ?? selectedRefuge.type}</dd>
                </div>
                <div>
                  <dt>Distance</dt>
                  <dd>
                    {selectedNearbyRefuge
                      ? `${Math.round(selectedNearbyRefuge.distanceMeters)} m from ${
                          refugeSearchMode === "route" ? "selected route" : "current location"
                        }`
                      : selectedRefuge.distance}
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{selectedNearbyRefuge?.source ?? selectedRefuge.availability}</dd>
                </div>
                <div>
                  <dt>Quietness data</dt>
                  <dd>{selectedNearbyRefuge ? "Tagged as sensory refuge in places table" : selectedRefuge.quietnessData}</dd>
                </div>
                <div>
                  <dt>Note</dt>
                  <dd>{selectedNearbyRefuge?.theme ?? selectedNearbyRefuge?.sub_theme ?? selectedRefuge.note}</dd>
                </div>
              </dl>
              <div className="refuge-detail-actions">
                <button onClick={() => setPage("monitor")} type="button">Back to journey</button>
                <button className="secondary-button" onClick={() => setPage("quiet")} type="button">
                  Optional directions
                </button>
              </div>
            </section>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
