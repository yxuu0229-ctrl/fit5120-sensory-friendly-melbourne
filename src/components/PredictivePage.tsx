import type { SensorReading } from "../lib/journeyData";
import type { PlannedRoute } from "../lib/journeyPlanning";
import type { RouteEndpoints } from "./mapShared";
import RouteMap from "./RouteMap";

function formatSensorName(name: string | null | undefined) {
  if (!name) return "Route sensor";
  return name.replace(/_/g, " ");
}

function PredictivePage({
  alertSensor,
  selectedRoute,
  selectedRoutePath,
  routeEndpoints,
  onDismiss,
  onReviewJourney,
}: {
  alertSensor: SensorReading | undefined;
  selectedRoute: PlannedRoute | undefined;
  selectedRoutePath: [number, number][];
  routeEndpoints: RouteEndpoints | null;
  onDismiss: () => void;
  onReviewJourney: () => void;
}) {
  return (
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
          <span className="prediction-pill">{alertSensor ? "Current alert" : "No alert"}</span>
          <h2 id="prediction-card-title">
            {alertSensor
              ? `${formatSensorName(alertSensor.sensor_name)} is currently high sensory`
              : "No next-hour predictive warning available"}
          </h2>
          {alertSensor ? (
            <>
              <dl>
                <div>
                  <dt>Area:</dt>
                  <dd>{formatSensorName(alertSensor.sensor_name)}</dd>
                </div>
                <div>
                  <dt>Stressor:</dt>
                  <dd>current pedestrian density is high</dd>
                </div>
                <div>
                  <dt>People count:</dt>
                  <dd>{alertSensor.total_count ?? "Unavailable"}</dd>
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
            {alertSensor
              ? "Current high-sensory area is shown from live sensor data."
              : "No affected area is shown because no route-level prediction is available."}
          </p>
          <RouteMap
            endpoints={routeEndpoints}
            routePath={selectedRoutePath}
            routeName={selectedRoute?.name ?? "Selected route"}
            sensors={alertSensor ? [alertSensor] : []}
          />
          <div className="predictive-actions">
            <button className="secondary-button" onClick={onDismiss} type="button">
              Dismiss alert
            </button>
            <button onClick={onReviewJourney} type="button">Review journey</button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default PredictivePage;
