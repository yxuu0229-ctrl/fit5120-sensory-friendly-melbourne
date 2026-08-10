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
  return (
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
              sensors={sensors}
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
