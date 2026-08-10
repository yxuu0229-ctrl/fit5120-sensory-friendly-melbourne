import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { hasSupabaseEnv } from "./lib/supabase";
import {
  distanceMeters,
  distanceToRouteMeters,
  type LatLng,
} from "./lib/geo";
import { planJourney, type PlannedRoute } from "./lib/journeyPlanning";
import { createLiveJourneyData } from "./lib/journeyDataLive";
import type { PlannedTrip, SensorReading } from "./lib/journeyData";
import { useAddressField } from "./lib/useAddressField";
import {
  refuges,
  refugeFromPlace,
  refugeFromStatic,
  type NearbyRefuge,
  type RefugeSearchMode,
  type RefugeView,
} from "./lib/refuge";
import { cbdLocations, defaultOrigin } from "./lib/cbdLocations";
import TopNav, { type Page } from "./components/TopNav";
import type { RouteEndpoints } from "./components/mapShared";
import PlanJourneyPage from "./components/PlanJourneyPage";
import RoutesPage from "./components/RoutesPage";
import WarningPage from "./components/WarningPage";
import ConfirmPage from "./components/ConfirmPage";
import MonitorPage from "./components/MonitorPage";
import PredictivePage from "./components/PredictivePage";
import QuietSpacesPage, { refugePageSize } from "./components/QuietSpacesPage";
import RefugeDetailPage from "./components/RefugeDetailPage";
import LiveMapPage from "./components/LiveMapPage";
import DataStatusPage from "./components/DataStatusPage";
import LandingPage from "./components/LandingPage";

const nearbyRefugeRadiusMeters = 1000;
const sensorRefreshPages: Page[] = [
  "routes",
  "warning",
  "confirm",
  "monitor",
  "predictive",
];

function App() {
  const [page, setPage] = useState<Page>("plan");
  const [threshold, setThreshold] = useState(50);
  const [avoidCongestion, setAvoidCongestion] = useState(true);
  const [sensorPoints, setSensorPoints] = useState<SensorReading[]>([]);
  const [plannedTrip, setPlannedTrip] = useState<PlannedTrip | null>(null);
  const [routeOptions, setRouteOptions] = useState<PlannedRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routeError, setRouteError] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [routeEndpoints, setRouteEndpoints] = useState<RouteEndpoints | null>(null);
  const [nearbyRefuges, setNearbyRefuges] = useState<NearbyRefuge[]>([]);
  const [refugeSearchMode, setRefugeSearchMode] = useState<RefugeSearchMode>("current");
  const [refugePage, setRefugePage] = useState(1);
  const [selectedRefugeId, setSelectedRefugeId] = useState("state-library");
  const isBackendConfigured = useMemo(() => hasSupabaseEnv(), []);
  const journey = useMemo(() => createLiveJourneyData(), []);
  const resolveLocalPoint = useCallback(
    (value: string): LatLng | null => {
      const normalized = value.toLowerCase();
      if (normalized.includes(defaultOrigin.toLowerCase()) && currentLocation) {
        return currentLocation;
      }
      const match = cbdLocations.find((location) =>
        normalized.includes(location.name.toLowerCase())
      );
      return match ?? null;
    },
    [currentLocation]
  );
  const originField = useAddressField({
    resolveLocal: resolveLocalPoint,
    geocode: (q) => journey.geocode(q),
    onValueEdited: (v) => {
      if (v.trim().toLowerCase() !== defaultOrigin.toLowerCase()) {
        setLocationStatus("idle");
      }
    },
    skipDefaultOrigin: true,
  });
  const destinationField = useAddressField({
    resolveLocal: resolveLocalPoint,
    geocode: (q) => journey.geocode(q),
  });
  const needsCurrentLocation =
    originField.value.trim().toLowerCase() === defaultOrigin.toLowerCase();
  const canPlanJourney =
    originField.value.trim() !== "" &&
    destinationField.value.trim() !== "" &&
    originField.point !== null &&
    destinationField.point !== null &&
    (!needsCurrentLocation || locationStatus === "ready");
  const selectedNearbyRefuge = nearbyRefuges.find(
    (refuge) => refuge.id === selectedRefugeId
  );
  const selectedRefugeView: RefugeView = selectedNearbyRefuge
    ? refugeFromPlace(selectedNearbyRefuge, refugeSearchMode)
    : refugeFromStatic(
        refuges.find((refuge) => refuge.id === selectedRefugeId) ?? refuges[0]
      );
  const selectedRoute = routeOptions[selectedRouteIndex];
  const selectedRoutePath =
    selectedRoute?.positions ?? plannedTrip?.allPositions ?? [];
  const alternativeRoute =
    routeOptions.find(
      (route, index) =>
        index !== selectedRouteIndex &&
        selectedRoute != null &&
        route.sensoryLoad < selectedRoute.sensoryLoad
    ) ?? routeOptions.find((_, index) => index !== selectedRouteIndex);

  const refreshSensors = useCallback(async () => {
    if (!isBackendConfigured) return [];
    const sensors = await journey.sensorReadings();
    setSensorPoints(sensors);
    return sensors;
  }, [isBackendConfigured, journey]);

  // Keep density fresh while the user is in the journey flow.
  useEffect(() => {
    if (!isBackendConfigured || !sensorRefreshPages.includes(page)) return;

    void refreshSensors();
    if (page !== "monitor") return;

    const id = window.setInterval(() => {
      void refreshSensors();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [isBackendConfigured, page, refreshSensors]);

  const isEmbedded = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }, []);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isEmbedded) {
      document.body.classList.add("embedded");
    } else {
      document.body.classList.remove("embedded");
    }
  }, [isEmbedded]);

  if (!isMobile && !isEmbedded) {
    return <LandingPage />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPlanJourney || isPlanning) return;

    setIsPlanning(true);
    setRouteError("");
    setRouteOptions([]);
    setSelectedRouteIndex(0);
    setPlannedTrip(null);

    try {
      const from = originField.point;
      const to = destinationField.point;
      if (!from || !to) {
        setRouteError(
          "Address not recognised. Please choose one of the suggested locations."
        );
        return;
      }
      setRouteEndpoints({ from, to });

      const sensors = await refreshSensors();
      const { candidates, error, trip } = await journey.walkingRoutes(from, to);
      if (trip) setPlannedTrip(trip);
      if (error) setRouteError(error);

      const planned = planJourney(candidates, sensors, { avoidCongestion });
      setRouteOptions(planned);

      if (!planned.length && !error) {
        setRouteError(
          "No walking routes found between these points. Try locations inside the Melbourne CBD."
        );
      }

      setPage("routes");
    } finally {
      setIsPlanning(false);
    }
  }

  function selectRoute(route: PlannedRoute, index: number) {
    setSelectedRouteIndex(index);
    if (route.sensoryLoad > threshold) {
      setPage("warning");
    } else {
      setPage("confirm");
    }
  }

  function useCurrentLocation() {
    if (!originField.value) originField.setValue(defaultOrigin);
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);
        originField.setResult(location, "Using your current location.");
        setLocationStatus("ready");
      },
      () => {
        setCurrentLocation(null);
        originField.setResult(
          null,
          "Location was not allowed. Enter an origin manually."
        );
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

  async function loadNearbyRefugesFromLocation(location: LatLng) {
    if (!isBackendConfigured) return;

    const places = await journey.sensoryRefuges();
    const refugesWithinRange = places
      .map((place) => ({
        ...place,
        distanceMeters: distanceMeters(location, {
          lat: place.latitude,
          lng: place.longitude,
        }),
      }))
      .filter((place) => place.distanceMeters <= nearbyRefugeRadiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    setNearbyRefuges(refugesWithinRange);
    setRefugePage(1);
    if (refugesWithinRange[0]) setSelectedRefugeId(refugesWithinRange[0].id);
  }

  async function loadNearbyRefugesFromRoute() {
    if (!isBackendConfigured || selectedRoutePath.length < 2) return;

    const places = await journey.sensoryRefuges();
    const refugesAlongRoute = places
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
      <TopNav page={page} onNavigate={setPage} />

      {page === "plan" && (
        <PlanJourneyPage
          originField={originField}
          destinationField={destinationField}
          threshold={threshold}
          onThresholdChange={setThreshold}
          avoidCongestion={avoidCongestion}
          onToggleAvoidCongestion={() =>
            setAvoidCongestion((current) => !current)
          }
          canPlanJourney={canPlanJourney}
          needsCurrentLocation={needsCurrentLocation}
          locationStatus={locationStatus}
          routeError={routeError}
          isBackendConfigured={isBackendConfigured}
          isPlanning={isPlanning}
          onSubmit={handleSubmit}
          onUseCurrentLocation={useCurrentLocation}
        />
      )}

      {page === "routes" && (
        <RoutesPage
          routeOptions={routeOptions}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRouteIndex={setSelectedRouteIndex}
          onSelectRoute={selectRoute}
          selectedRoute={selectedRoute}
          selectedRoutePath={selectedRoutePath}
          routeEndpoints={routeEndpoints}
          sensors={sensorPoints}
          threshold={threshold}
          avoidCongestion={avoidCongestion}
          routeError={routeError}
          onBackToPlan={() => setPage("plan")}
        />
      )}

      {page === "warning" && (
        <WarningPage
          selectedRoute={selectedRoute}
          alternativeRoute={alternativeRoute}
          sensors={sensorPoints}
          threshold={threshold}
          onKeepRoute={() => setPage("routes")}
          onSelectAlternative={() => {
            if (alternativeRoute) {
              const index = routeOptions.findIndex(
                (route) => route === alternativeRoute
              );
              if (index >= 0) setSelectedRouteIndex(index);
            }
            setPage("confirm");
          }}
        />
      )}

      {page === "confirm" && (
        <ConfirmPage
          selectedRoute={selectedRoute}
          selectedRoutePath={selectedRoutePath}
          routeEndpoints={routeEndpoints}
          sensors={sensorPoints}
          threshold={threshold}
          onStartJourney={startJourney}
        />
      )}

      {page === "monitor" && (
        <MonitorPage
          selectedRoute={selectedRoute}
          selectedRoutePath={selectedRoutePath}
          routeEndpoints={routeEndpoints}
          currentLocation={currentLocation}
          sensors={sensorPoints}
          threshold={threshold}
          onShowForecast={() => setPage("predictive")}
          onFindQuietSpace={findQuietSpacesByCurrentLocation}
        />
      )}

      {page === "predictive" && (
        <PredictivePage
          sensors={sensorPoints}
          selectedRoute={selectedRoute}
          selectedRoutePath={selectedRoutePath}
          routeEndpoints={routeEndpoints}
          onDismiss={() => setPage("monitor")}
          onReviewJourney={() => setPage("confirm")}
        />
      )}

      {page === "quiet" && (
        <QuietSpacesPage
          refugeSearchMode={refugeSearchMode}
          currentLocation={currentLocation}
          nearbyRefuges={nearbyRefuges}
          refugePage={refugePage}
          onRefugePageChange={setRefugePage}
          selectedRefugeId={selectedRefugeId}
          onSelectRefuge={selectRefuge}
          selectedRoutePath={selectedRoutePath}
          routeEndpoints={routeEndpoints}
          onSearchByCurrentLocation={findQuietSpacesByCurrentLocation}
          onSearchByRoute={findQuietSpacesByRoute}
          onBackToJourney={() => setPage("monitor")}
          onViewDetail={() => setPage("refugeDetail")}
        />
      )}

      {page === "refugeDetail" && (
        <RefugeDetailPage
          refuge={selectedRefugeView}
          onBackToJourney={() => setPage("monitor")}
          onOptionalDirections={() => setPage("quiet")}
        />
      )}

      {page === "livemap" && (
        <LiveMapPage onShowDataStatus={() => setPage("datastatus")} />
      )}

      {page === "datastatus" && <DataStatusPage />}
    </div>
  );
}

export default App;
