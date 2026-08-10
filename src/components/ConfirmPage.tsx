import type { SensorReading } from "../lib/journeyData";
import type { PlannedRoute } from "../lib/journeyPlanning";
import type { RouteEndpoints } from "./mapShared";
import RouteMap from "./RouteMap";

function ConfirmPage({
  selectedRoute,
  selectedRoutePath,
  routeEndpoints,
  sensors,
  threshold,
  onStartJourney,
}: {
  selectedRoute: PlannedRoute | undefined;
  selectedRoutePath: [number, number][];
  routeEndpoints: RouteEndpoints | null;
  sensors: SensorReading[];
  threshold: number;
  onStartJourney: () => void;
}) {
  const load = selectedRoute?.sensoryLoad ?? 0;
  const withinThreshold = load <= threshold;

  return (
    <main className="confirm-page">
      <section className="intro confirm-intro" aria-labelledby="confirm-title">
        <h1 id="confirm-title">Confirm selected route</h1>
        <p>
          Confirm the walking route after reviewing sensory load from live sensors and how it
          matches your preferences.
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
            <p>Walking route preview from OSRM with live density sensors near the path.</p>
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
                {selectedRoute?.sensoryLevel ?? "—"} sensory based on nearby Supabase density
                sensors
              </li>
              <li>
                Sensory load {load}/100 is {withinThreshold ? "within" : "above"} your threshold of{" "}
                {threshold}
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
