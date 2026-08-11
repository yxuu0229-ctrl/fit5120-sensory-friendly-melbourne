import type { SensorReading } from "../lib/journeyData";
import type { PlannedRoute } from "../lib/journeyPlanning";
import type { CrowdTolerance } from "../lib/tolerance";
import type { RouteEndpoints } from "./mapShared";
import RouteMap from "./RouteMap";

function ConfirmPage({
  selectedRoute,
  selectedRoutePath,
  routeEndpoints,
  sensors,
  tolerance,
  onStartJourney,
}: {
  selectedRoute: PlannedRoute | undefined;
  selectedRoutePath: [number, number][];
  routeEndpoints: RouteEndpoints | null;
  sensors: SensorReading[];
  tolerance: CrowdTolerance;
  onStartJourney: () => void;
}) {
  const load = selectedRoute?.sensoryLoad ?? 0;
  const withinTolerance = !selectedRoute?.exceedsTolerance;

  return (
    <main className="confirm-page">
      <section className="intro confirm-intro" aria-labelledby="confirm-title">
        <h1 id="confirm-title">Confirm selected route</h1>
        <p>
          Confirm the walking route after reviewing its sensory indicator from cached sensor
          readings and how it matches your preferences.
        </p>
      </section>

      <section className="confirm-layout">
        <section className="confirm-summary" aria-labelledby="confirm-route-title">
          <div className="confirm-heading">
            <span
              className={`sensory-dot sensory-${(selectedRoute?.sensoryLevel ?? "Low").toLowerCase()}`}
            >
              {(selectedRoute?.sensoryLevel ?? "Low") === "Medium"
                ? "Med"
                : (selectedRoute?.sensoryLevel ?? "Low")}
            </span>
            <h2 id="confirm-route-title">
              {selectedRoute ? `${selectedRoute.name}: ${selectedRoute.label}` : "No route selected"}
            </h2>
          </div>
          <p className="confirm-route-meta">
            {selectedRoute?.sensoryLevel ?? "—"} sensory | Sensory load {load}/100 |{" "}
            {Math.round((selectedRoute?.durationSeconds ?? 0) / 60)} min |{" "}
            {Math.round(selectedRoute?.distanceMeters ?? 0)} m walk | Mode: Walk
          </p>

          <section className="route-preview-panel" aria-labelledby="route-preview-title">
            <h3 id="route-preview-title">Route preview</h3>
            <p>
              Walking route preview from OSRM with density sensors and public transport
              access points near the path.
            </p>
            <RouteMap
              endpoints={routeEndpoints}
              routePath={selectedRoutePath}
              routeName={selectedRoute?.name ?? "Selected route"}
              sensors={sensors}
            />
            <p className="map-legend">
              Sensors within 500m of route: <span className="legend-low" /> Low congestion{" "}
              <span className="legend-medium" /> Medium congestion{" "}
              <span className="legend-high" /> High congestion
            </p>
          </section>
        </section>

        <div className="confirm-side">
          <section className="match-panel" aria-labelledby="match-title">
            <h2 id="match-title">Why this route matches</h2>
            <ol>
              <li>
                {selectedRoute?.reason ??
                  "Sensory rating based on nearby Supabase density sensors"}
              </li>
              <li>
                {selectedRoute?.sensoryLevel ?? "—"} busiest segment is{" "}
                {withinTolerance ? "within" : "above"} your {tolerance} crowd tolerance
                (sensory load {load}/100)
              </li>
              <li>{Math.round(selectedRoute?.distanceMeters ?? 0)} m walking distance</li>
              <li>
                Estimated walking time is{" "}
                {Math.round((selectedRoute?.durationSeconds ?? 0) / 60)} min
              </li>
            </ol>
          </section>
          <button
            className="start-journey-button"
            disabled={!selectedRoute || selectedRoutePath.length < 2}
            onClick={onStartJourney}
            type="button"
          >
            Start journey
          </button>
        </div>
      </section>
    </main>
  );
}

export default ConfirmPage;
