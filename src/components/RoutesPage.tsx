import type { SensorReading } from "../lib/journeyData";
import { prototypeRouteOptions } from "../lib/journeyDataPrototype";
import type { PlannedRoute } from "../lib/journeyPlanning";
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
  threshold,
  avoidCongestion,
  routeError,
}: {
  routeOptions: PlannedRoute[];
  selectedRouteIndex: number;
  onSelectRouteIndex: (index: number) => void;
  onSelectRoute: (route: PlannedRoute, index: number) => void;
  selectedRoute: PlannedRoute | undefined;
  selectedRoutePath: [number, number][];
  routeEndpoints: RouteEndpoints | null;
  sensors: SensorReading[];
  threshold: number;
  avoidCongestion: boolean;
  routeError: string;
}) {
  return (
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

          {(routeOptions.length ? routeOptions : prototypeRouteOptions).map((route, index) => (
            <article
              className={index === selectedRouteIndex ? "route-card route-card-selected" : "route-card"}
              key={`${route.name}-${route.label}`}
              onClick={() => onSelectRouteIndex(index)}
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
                  onClick={() => onSelectRoute(route, index)}
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
            sensors={sensors}
          />
          <p className="map-legend">
            Sensors within 500m of route: <span className="legend-low" /> Low congestion <span className="legend-medium" /> Medium congestion <span className="legend-high" /> High congestion
          </p>
          {routeError && <p className="backend-note">{routeError}</p>}
        </section>
      </section>
    </main>
  );
}

export default RoutesPage;
