import type { SensorReading } from "../lib/journeyData";
import type { PlannedRoute } from "../lib/journeyPlanning";
import { highDensitySensorsNearRoute } from "../lib/congestion";

function formatDistance(meters: number) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

function formatSensorName(name: string | null | undefined) {
  if (!name) return "along your route";
  return name.replace(/_/g, " ");
}

function melbourneTimeWindow(durationSeconds: number) {
  const start = new Date();
  const end = new Date(start.getTime() + durationSeconds * 1000);
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmt.format(start)}–${fmt.format(end)}`;
}

function WarningPage({
  selectedRoute,
  alternativeRoute,
  sensors,
  threshold,
  onKeepRoute,
  onSelectAlternative,
}: {
  selectedRoute: PlannedRoute | undefined;
  alternativeRoute: PlannedRoute | undefined;
  sensors: SensorReading[];
  threshold: number;
  onKeepRoute: () => void;
  onSelectAlternative: () => void;
}) {
  const path = selectedRoute?.positions ?? [];
  const highSensors = path.length
    ? highDensitySensorsNearRoute(path, sensors)
    : [];
  const hotspot = highSensors[0];
  const locationLabel = hotspot
    ? formatSensorName(hotspot.sensor_name)
    : "Sections near busy pedestrian sensors";

  const impactLabel = selectedRoute
    ? `${selectedRoute.sensoryLevel} sensory load (${selectedRoute.sensoryLoad}) above your threshold of ${threshold}`
    : `Sensory load above your threshold of ${threshold}`;

  const expectedWindow = selectedRoute
    ? melbourneTimeWindow(selectedRoute.durationSeconds)
    : "During this journey";

  const alt = alternativeRoute;
  const timeDeltaMinutes =
    selectedRoute && alt
      ? Math.round((alt.durationSeconds - selectedRoute.durationSeconds) / 60)
      : null;
  const walkDeltaMeters =
    selectedRoute && alt
      ? Math.round(alt.distanceMeters - selectedRoute.distanceMeters)
      : null;

  return (
    <main className="warning-page">
      <section className="intro warning-intro" aria-labelledby="warning-title">
        <h1 id="warning-title">Route exceeds your threshold</h1>
        <p>
          Explain the affected section and present a lower-stimulation alternative without
          changing the route automatically.
        </p>
      </section>

      <section className="warning-layout">
        <section className="threshold-warning-card" aria-labelledby="threshold-warning-title">
          <div className="warning-icon" aria-hidden="true">!</div>
          <div>
            <h2 id="threshold-warning-title">
              {selectedRoute
                ? `${selectedRoute.name} exceeds your crowd threshold`
                : "Selected route exceeds your crowd threshold"}
            </h2>
            <dl className="warning-details">
              <div>
                <dt>Location</dt>
                <dd>{locationLabel}</dd>
              </div>
              <div>
                <dt>Expected</dt>
                <dd>{expectedWindow}</dd>
              </div>
              <div>
                <dt>Impact</dt>
                <dd>{impactLabel}</dd>
              </div>
              {hotspot?.total_count != null && (
                <div>
                  <dt>Current count</dt>
                  <dd>{hotspot.total_count} pedestrians (sensor reading)</dd>
                </div>
              )}
            </dl>
          </div>
        </section>

        <section className="alternative-panel" aria-labelledby="alternative-title">
          <h2 id="alternative-title">Lower-stimulation alternative</h2>
          {alt ? (
            <>
              <article className="route-card route-card-selected alternative-route-card">
                <div className="route-card-header">
                  <span className={`sensory-dot sensory-${alt.sensoryLevel.toLowerCase()}`}>
                    {alt.sensoryLevel}
                  </span>
                  <h3>
                    {alt.name}
                    {alt.label ? ` · ${alt.label}` : ""}
                  </h3>
                  <span className={`sensory-pill sensory-pill-${alt.sensoryLevel.toLowerCase()}`}>
                    {alt.sensoryLevel} sensory
                  </span>
                </div>
                <div className="route-metrics">
                  <div>
                    <span>Sensory load</span>
                    <strong>{alt.sensoryLoad}</strong>
                  </div>
                  <div>
                    <span>Time</span>
                    <strong>{formatDuration(alt.durationSeconds)}</strong>
                  </div>
                  <div>
                    <span>Walk</span>
                    <strong>{formatDistance(alt.distanceMeters)}</strong>
                  </div>
                  <div>
                    <span>Level</span>
                    <strong>{alt.sensoryLevel}</strong>
                  </div>
                </div>
                <p className="alternative-factors">
                  Factors: lower sensory load than {selectedRoute?.name ?? "your current choice"}
                  {highSensors.length
                    ? `, avoids ${highSensors.length} high-density sensor${highSensors.length === 1 ? "" : "s"} on the current path`
                    : ""}
                </p>
              </article>
              <p className="alternative-copy">
                {timeDeltaMinutes != null && walkDeltaMeters != null
                  ? `${alt.name} is ${
                      timeDeltaMinutes === 0
                        ? "about the same duration"
                        : timeDeltaMinutes > 0
                          ? `${timeDeltaMinutes} min longer`
                          : `${Math.abs(timeDeltaMinutes)} min shorter`
                    } and ${
                      walkDeltaMeters === 0
                        ? "similar walking distance"
                        : walkDeltaMeters > 0
                          ? `${formatDistance(walkDeltaMeters)} more walking`
                          : `${formatDistance(Math.abs(walkDeltaMeters))} less walking`
                    }, with sensory load ${alt.sensoryLoad} vs ${selectedRoute?.sensoryLoad ?? "—"}.`
                  : `${alt.name} has a lower sensory load (${alt.sensoryLoad}).`}
              </p>
            </>
          ) : (
            <p className="alternative-copy">
              No calmer alternative was returned for this journey. Keep your route or go back
              to compare options.
            </p>
          )}
          <div className="alternative-actions">
            <button className="secondary-button" onClick={onKeepRoute} type="button">
              Keep current route
            </button>
            <button
              onClick={onSelectAlternative}
              type="button"
              disabled={!alt}
            >
              Select alternative
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default WarningPage;
