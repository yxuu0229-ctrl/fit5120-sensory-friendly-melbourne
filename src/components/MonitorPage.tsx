import type { LatLng } from "../lib/geo";
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
  return (
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
            sensors={sensors}
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
            onClick={onShowForecast}
            type="button"
          >
            Next-hour forecast
          </button>
          <button onClick={onFindQuietSpace} type="button">Find quiet space</button>
        </aside>
      </section>
    </main>
  );
}

export default MonitorPage;
