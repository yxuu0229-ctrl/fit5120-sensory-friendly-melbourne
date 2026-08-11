import { provenanceClassName, type DataProvenance } from "../lib/dataProvenance";
import type { SensorReading } from "../lib/journeyData";
import type { PlannedRoute } from "../lib/journeyPlanning";
import { DEFAULT_TOLERANCE, type CrowdTolerance } from "../lib/tolerance";
import type { RouteEndpoints } from "./mapShared";
import RouteMap from "./RouteMap";

function RoutesPage({
  routeOptions,
  selectedRouteIndex,
  onSelectRouteIndex,
  onSelectRoute,
  selectedRoute,
  selectedRoutePath,
  routeEndpoints,
  sensors,
  tolerance,
  onToleranceChange,
  avoidCongestion,
  provenance,
  routeError,
  onBackToPlan,
}: {
  routeOptions: PlannedRoute[];
  selectedRouteIndex: number;
  onSelectRouteIndex: (index: number) => void;
  onSelectRoute: (route: PlannedRoute, index: number) => void;
  selectedRoute: PlannedRoute | undefined;
  selectedRoutePath: [number, number][];
  routeEndpoints: RouteEndpoints | null;
  sensors: SensorReading[];
  /** null = no explicit choice; the documented default applies. */
  tolerance: CrowdTolerance | null;
  onToleranceChange: (value: CrowdTolerance) => void;
  avoidCongestion: boolean;
  provenance: DataProvenance | null;
  routeError: string;
  onBackToPlan: () => void;
}) {
  const effectiveTolerance = tolerance ?? DEFAULT_TOLERANCE;

  return (
    <main className="routes-page">
      <section className="intro routes-intro" aria-labelledby="routes-title">
        <h1 id="routes-title">Compare sensory-aware routes</h1>
        <p>
          Review each route&#39;s sensory indicator (its busiest segment&#39;s pedestrian
          volume band), travel time and walking distance. Routes are planned with OSRM and
          scored against cached City of Melbourne sensor readings.
        </p>
      </section>

      <section className="routes-layout">
        <aside className="route-list-panel" aria-label="Route options">
          <div className="route-list-top">
            <span>
              {avoidCongestion
                ? "Sort: calmest first"
                : "Sort: fastest first (routes within your tolerance first)"}
            </span>
            <div className="tolerance-inline" aria-label="Crowd tolerance">
              <span>
                Tolerance{tolerance === null ? ` (default ${DEFAULT_TOLERANCE})` : ""}:
              </span>
              {(["Low", "Medium"] as const).map((option) => (
                <button
                  aria-pressed={effectiveTolerance === option}
                  key={option}
                  onClick={() => onToleranceChange(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {routeOptions.length === 0 ? (
            <div className="route-empty-state">
              <p>
                {routeError ||
                  "No walking routes were returned. Try different CBD points or check your connection."}
              </p>
              <button className="secondary-button" onClick={onBackToPlan} type="button">
                Back to plan
              </button>
            </div>
          ) : (
            routeOptions.map((route, index) => (
              <article
                className={index === selectedRouteIndex ? "route-card route-card-selected" : "route-card"}
                key={`${route.name}-${route.label}-${index}`}
                onClick={() => onSelectRouteIndex(index)}
              >
                <div className="route-card-header">
                  <span className={`sensory-dot sensory-${route.sensoryLevel.toLowerCase()}`}>
                    {route.sensoryLevel === "Medium" ? "Med" : route.sensoryLevel}
                  </span>
                  <h3>
                    {route.name}: {route.label}
                  </h3>
                  <span className={`sensory-pill sensory-pill-${route.sensoryLevel.toLowerCase()}`}>
                    {route.sensoryLevel} sensory
                  </span>
                </div>
                <div className="route-metrics">
                  <div>
                    <span>Congestion</span>
                    <strong>{route.sensoryLevel}</strong>
                  </div>
                  <div>
                    <span>Time</span>
                    <strong>{Math.round(route.durationSeconds / 60)}m</strong>
                  </div>
                  <div>
                    <span>Walk</span>
                    <strong>{Math.round(route.distanceMeters)}m</strong>
                  </div>
                  <div>
                    <span>Mode</span>
                    <strong>Walk</strong>
                  </div>
                </div>
                <div className="route-card-footer">
                  <p>{route.reason}</p>
                  <p>Sensory load {route.sensoryLoad}/100.</p>
                  <button
                    className={route.sensoryLevel === "Low" ? undefined : "secondary-button"}
                    onClick={() => onSelectRoute(route, index)}
                    type="button"
                  >
                    Select {route.name}
                  </button>
                </div>
              </article>
            ))
          )}
        </aside>

        <section className="map-panel" aria-labelledby="map-title">
          <h2 id="map-title">Melbourne CBD route map</h2>
          <p>
            Walking route with pedestrian-density sensor readings and public transport
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
            <span className="legend-high" /> High congestion{" "}
            <span className="legend-transit" /> Public transport access point
          </p>
          {provenance && (
            <p className={provenanceClassName(provenance)}>{provenance.message}</p>
          )}
          {routeError && <p className="backend-note">{routeError}</p>}
        </section>
      </section>
    </main>
  );
}

export default RoutesPage;
