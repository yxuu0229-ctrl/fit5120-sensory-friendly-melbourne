import { useEffect, useState } from "react";
import type { SensorReading } from "../lib/journeyData";
import type { PlannedRoute } from "../lib/journeyPlanning";
import {
  forecastRouteNextHour,
  type QuietWindowForecast,
  type RouteQuietForecast,
} from "../lib/quietWindowForecast";
import type { RouteEndpoints } from "./mapShared";
import RouteMap from "./RouteMap";

function formatSensorName(name: string | null | undefined) {
  if (!name) return "Route sensor";
  return name.replace(/_/g, " ");
}

function confidenceCopy(forecast: QuietWindowForecast) {
  if (!forecast.window) {
    return "No historical quiet-window row for this sensor at the next hour.";
  }
  if (!forecast.isReliable) {
    return `Low confidence — only ${forecast.sampleCount} past readings for this hour.`;
  }
  return `Based on ${forecast.sampleCount} past readings for this weekday-hour.`;
}

function PredictivePage({
  sensors,
  selectedRoute,
  selectedRoutePath,
  routeEndpoints,
  onDismiss,
  onReviewJourney,
}: {
  sensors: SensorReading[];
  selectedRoute: PlannedRoute | undefined;
  selectedRoutePath: [number, number][];
  routeEndpoints: RouteEndpoints | null;
  onDismiss: () => void;
  onReviewJourney: () => void;
}) {
  const [forecast, setForecast] = useState<RouteQuietForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void forecastRouteNextHour(selectedRoutePath, sensors).then((result) => {
      if (!cancelled) {
        setForecast(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedRoutePath, sensors]);

  const alert = forecast?.alert ?? null;
  const mapSensors = alert ? [alert.sensor] : [];

  return (
    <main className="predictive-page">
      <section className="intro predictive-intro" aria-labelledby="predictive-title">
        <h1 id="predictive-title">Next-hour predictive alert</h1>
        <p>
          Typical pedestrian volume for the next Melbourne hour, from historical quiet-window
          profiles along your route.
        </p>
      </section>

      <section className="predictive-layout">
        <section className="prediction-card" aria-labelledby="prediction-card-title">
          <span className="prediction-pill">
            {loading
              ? "Loading forecast"
              : alert
                ? alert.isReliable
                  ? "Next-hour forecast"
                  : "Limited history"
                : "No alert"}
          </span>
          <h2 id="prediction-card-title">
            {loading
              ? "Checking quiet-window history…"
              : alert
                ? alert.expectedLevel === "High" && alert.isReliable
                  ? `${formatSensorName(alert.sensor.sensor_name)} is usually high around ${forecast?.label}`
                  : alert.delta != null && alert.delta >= 30 && alert.isReliable
                    ? `${formatSensorName(alert.sensor.sensor_name)} typically rises toward ${forecast?.label}`
                    : `${formatSensorName(alert.sensor.sensor_name)} is currently high on your route`
                : "No next-hour warning for this route"}
          </h2>

          {loading ? (
            <p>Loading typical volumes from location quiet windows…</p>
          ) : alert ? (
            <>
              <dl>
                <div>
                  <dt>Area:</dt>
                  <dd>{formatSensorName(alert.sensor.sensor_name)}</dd>
                </div>
                <div>
                  <dt>Window:</dt>
                  <dd>{forecast?.label ?? "Next hour"}</dd>
                </div>
                <div>
                  <dt>Typical volume:</dt>
                  <dd>
                    {alert.isReliable && alert.expectedMean != null
                      ? `About ${Math.round(alert.expectedMean)} people (${alert.expectedLevel})`
                      : "Not enough history for a reliable number"}
                  </dd>
                </div>
                <div>
                  <dt>Current reading:</dt>
                  <dd>
                    {alert.currentCount != null
                      ? `${alert.currentCount} (${alert.sensor.density_level})`
                      : alert.sensor.density_level}
                  </dd>
                </div>
                {alert.delta != null && alert.isReliable && (
                  <div>
                    <dt>Change vs now:</dt>
                    <dd>
                      {alert.delta > 0 ? "+" : ""}
                      {Math.round(alert.delta)} typical pedestrians
                    </dd>
                  </div>
                )}
              </dl>
              <p>{confidenceCopy(alert)}</p>
            </>
          ) : (
            <p>
              {forecast && selectedRoutePath.length > 1
                ? `No high or rising typical volume found near this route for ${forecast.label}.`
                : "Select a route with a mapped path to see next-hour quiet-window forecasts."}
            </p>
          )}
        </section>

        <section className="affected-map-panel" aria-labelledby="affected-map-title">
          <h2 id="affected-map-title">Affected area map</h2>
          <p>
            {alert
              ? "Highlighted sensor is the strongest next-hour / current alert on your path."
              : "No affected sensor to highlight for this forecast window."}
          </p>
          <RouteMap
            endpoints={routeEndpoints}
            routePath={selectedRoutePath}
            routeName={selectedRoute?.name ?? "Selected route"}
            sensors={mapSensors}
          />
          <div className="predictive-actions">
            <button className="secondary-button" onClick={onDismiss} type="button">
              Dismiss alert
            </button>
            <button onClick={onReviewJourney} type="button">
              Review journey
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default PredictivePage;
