import { useMemo } from "react";
import type { LatLng } from "../lib/geo";
import { progressAlongRoutePercent } from "../lib/geo";
import { highDensitySensorsNearRoute } from "../lib/congestion";
import type { SensorReading } from "../lib/journeyData";
import type { PlannedRoute } from "../lib/journeyPlanning";
import type { RouteEndpoints } from "./mapShared";
import ActiveJourneyMap from "./ActiveJourneyMap";

function MonitorPage({
  selectedRoute,
  selectedRoutePath,
  routeEndpoints,
  currentLocation,
  sensors,
  threshold,
  onShowForecast,
  onFindQuietSpace,
}: {
  selectedRoute: PlannedRoute | undefined;
  selectedRoutePath: [number, number][];
  routeEndpoints: RouteEndpoints | null;
  currentLocation: LatLng | null;
  sensors: SensorReading[];
  threshold: number;
  onShowForecast: () => void;
  onFindQuietSpace: () => void;
}) {
  const progressPoint =
    currentLocation ??
    (routeEndpoints
      ? routeEndpoints.from
      : selectedRoutePath[0]
        ? { lat: selectedRoutePath[0][0], lng: selectedRoutePath[0][1] }
        : null);

  const progressPercent = useMemo(() => {
    if (!progressPoint || selectedRoutePath.length < 2) return 0;
    return progressAlongRoutePercent(progressPoint, selectedRoutePath);
  }, [progressPoint, selectedRoutePath]);

  const highNearby = selectedRoutePath.length
    ? highDensitySensorsNearRoute(selectedRoutePath, sensors)
    : [];

  return (
    <main className="monitor-page">
      <section className="intro monitor-intro" aria-labelledby="monitor-title">
        <h1 id="monitor-title">Active journey monitoring</h1>
        <p>
          Live map of your selected walking route with current location, sensor density along the
          path, next-hour quiet-window forecast and nearby quiet spaces.
        </p>
      </section>

      <section className="monitor-layout">
        <section className="active-map-panel" aria-labelledby="active-map-title">
          <h2 id="active-map-title">Active route map</h2>
          <p>
            Current progress: {progressPercent}%
            {currentLocation
              ? " (from your browser location along the route)."
              : " (start of route — enable location for live progress)."}
          </p>
          <ActiveJourneyMap
            currentLocation={currentLocation}
            endpoints={routeEndpoints}
            routePath={selectedRoutePath}
            sensors={sensors}
          />
          <p className="map-legend">
            Remaining route sensors: <span className="legend-low" /> Low congestion{" "}
            <span className="legend-medium" /> Medium congestion{" "}
            <span className="legend-high" /> High congestion
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
              <strong>{progressPercent}%</strong>
            </div>
            <div>
              <span>Next step</span>
              <strong>Walk</strong>
            </div>
            <div>
              <span>Sensory load</span>
              <strong>{selectedRoute?.sensoryLoad ?? "—"}</strong>
            </div>
            <div>
              <span>High sensors</span>
              <strong>{highNearby.length}</strong>
            </div>
          </div>
          <h3>Active alert</h3>
          <p className="active-alert-copy">
            {highNearby.length > 0
              ? `${highNearby.length} high-density sensor${highNearby.length === 1 ? "" : "s"} within 500 m of this route.`
              : selectedRoute && selectedRoute.sensoryLoad > threshold
                ? "This route’s sensory load is above your preferred threshold."
                : "No high-density warning on the selected route right now."}
          </p>
          <button className="secondary-button" onClick={onShowForecast} type="button">
            Next-hour forecast
          </button>
          <button onClick={onFindQuietSpace} type="button">
            Find quiet space
          </button>
        </aside>
      </section>
    </main>
  );
}

export default MonitorPage;
