import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabase, hasSupabaseEnv } from "./lib/supabase";

const navItems = ["Plan journey", "Route options", "Journey monitor", "Quiet spaces"];
const melbourneBounds = {
  north: -37.805,
  south: -37.823,
  west: 144.945,
  east: 144.98,
};

type Page =
  | "plan"
  | "routes"
  | "warning"
  | "confirm"
  | "monitor"
  | "predictive"
  | "quiet"
  | "refugeDetail";
type SensorPoint = {
  location_id: number;
  sensor_name: string | null;
  latitude: number;
  longitude: number;
  density_level: "Low" | "Medium" | "High";
};
type Refuge = {
  id: string;
  marker: string;
  name: string;
  type: string;
  distance: string;
  cardDistance: string;
  availability: string;
  cardAvailability: string;
  quietnessData: string;
  cardQuietnessData: string;
  note: string;
  category: string;
  imageUrl: string;
};

const refuges: Refuge[] = [
  {
    id: "state-library",
    marker: "L",
    name: "State Library forecourt quiet zone",
    type: "Library / public forecourt",
    distance: "5 min from current route",
    cardDistance: "5m",
    availability: "Open public area",
    cardAvailability: "Open",
    quietnessData: "Medium confidence, predicted lower crowd",
    cardQuietnessData: "Medium",
    note: "Not guaranteed quiet; use as potential refuge.",
    category: "Library",
    imageUrl: "https://www.figma.com/api/mcp/asset/3c55515b-58bd-4546-bd88-aeaa6e951e44.png",
  },
  {
    id: "flagstaff-gardens",
    marker: "P",
    name: "Flagstaff Gardens north path",
    type: "Park / outdoor path",
    distance: "7 min from current route",
    cardDistance: "7m",
    availability: "Open public area",
    cardAvailability: "Open",
    quietnessData: "Current lower pedestrian flow",
    cardQuietnessData: "Current",
    note: "Outdoor space with lower pedestrian flow.",
    category: "Park",
    imageUrl: "https://www.figma.com/api/mcp/asset/3c55515b-58bd-4546-bd88-aeaa6e951e44.png",
  },
  {
    id: "town-hall-arcade",
    marker: "S",
    name: "Town Hall side arcade seating",
    type: "Public seating",
    distance: "3 min from current route",
    cardDistance: "3m",
    availability: "Unknown",
    cardAvailability: "Unknown",
    quietnessData: "Unavailable",
    cardQuietnessData: "Unavailable",
    note: "Quietness unconfirmed; basic access known.",
    category: "Public",
    imageUrl: "https://www.figma.com/api/mcp/asset/3c55515b-58bd-4546-bd88-aeaa6e951e44.png",
  },
];

function App() {
  const [page, setPage] = useState<Page>("plan");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [threshold, setThreshold] = useState(50);
  const [avoidCongestion, setAvoidCongestion] = useState(true);
  const [sensorPoints, setSensorPoints] = useState<SensorPoint[]>([]);
  const [selectedRefugeId, setSelectedRefugeId] = useState("state-library");
  const isBackendConfigured = useMemo(() => hasSupabaseEnv(), []);
  const canPlanJourney = origin.trim() !== "" && destination.trim() !== "";
  const selectedRefuge = refuges.find((refuge) => refuge.id === selectedRefugeId) ?? refuges[0];

  useEffect(() => {
    if (!isBackendConfigured || page !== "routes") return;

    void getSupabase()
      .from("sensor_density_current")
      .select("location_id,sensor_name,latitude,longitude,density_level")
      .limit(12)
      .then(({ data }) => {
        setSensorPoints((data ?? []) as SensorPoint[]);
      });
  }, [isBackendConfigured, page]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canPlanJourney) return;
    setPage("routes");
  }

  return (
    <div className="app-shell">
      <header className="top-nav" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Relax Maps home">
          Relax Maps
        </a>
        <nav className="nav-links">
          {navItems.map((item) => (
            <button
              className={
                (page === "plan" && item === "Plan journey") ||
                ((page === "routes" || page === "warning" || page === "confirm") &&
                  item === "Route options") ||
                ((page === "monitor" || page === "predictive") && item === "Journey monitor") ||
                ((page === "quiet" || page === "refugeDetail") && item === "Quiet spaces")
                  ? "nav-link nav-link-active"
                  : "nav-link"
              }
              key={item}
              onClick={() => {
                if (item === "Plan journey") setPage("plan");
                if (item === "Route options") setPage("routes");
                if (item === "Journey monitor") setPage("monitor");
                if (item === "Quiet spaces") setPage("quiet");
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </header>

      {page === "plan" && (
        <main className="journey-page">
          <section className="intro" aria-labelledby="page-title">
            <h1 id="page-title">Plan a sensory-aware journey</h1>
            <p>
              Enter a Melbourne CBD destination, set a crowd-density threshold, and choose whether
              to avoid highly congested pedestrian corridors.
            </p>
          </section>

          <form className="journey-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="origin">Origin</label>
              <input
                id="origin"
                name="origin"
                placeholder="Current location: Southern Cross Station"
                type="text"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
              />
            </div>

            <div className="field-group">
              <label htmlFor="destination">Destination</label>
              <input
                id="destination"
                name="destination"
                placeholder="State Library Victoria, Melbourne CBD"
                type="text"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              />
            </div>

            <section className="card threshold-card" aria-labelledby="threshold-title">
              <h2 id="threshold-title">Preferred crowd-density threshold</h2>
              <p>Routes above this limit trigger a warning and lower-stimulation alternatives.</p>
              <div className="range-wrap">
                <input
                  aria-label="Preferred crowd-density threshold"
                  className="threshold-range"
                  max="100"
                  min="0"
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  style={{ "--threshold": `${threshold}%` } as CSSProperties}
                  type="range"
                  value={threshold}
                />
                <output
                  className="range-value"
                  style={{ left: `calc(${threshold}% + ${19 - threshold * 0.38}px)` }}
                >
                  {threshold}
                </output>
              </div>
            </section>

            <section className="card preferences-card" aria-labelledby="preferences-title">
              <div className="preferences-heading">
                <h2 id="preferences-title">Avoidance preferences</h2>
                <button
                  aria-label="Avoid highly congested corridors"
                  aria-pressed={avoidCongestion}
                  className={avoidCongestion ? "toggle toggle-on" : "toggle"}
                  onClick={() => setAvoidCongestion((current) => !current)}
                  type="button"
                >
                  <span />
                </button>
              </div>
              <h3>Avoid highly congested corridors</h3>
              <p>
                Uses pedestrian-density information to reduce crowd-related stress before route
                generation. Factors: pedestrian volume, construction activity and events.
              </p>
            </section>

            <div className="action-area">
              <button className="primary-action" disabled={!canPlanJourney} type="submit">
                Find sensory-aware routes
              </button>
              {!isBackendConfigured && (
                <p className="backend-note">
                  Supabase keys are not configured yet. Route generation can be wired once the
                  browser-safe anon key is available.
                </p>
              )}
            </div>
          </form>
        </main>
      )}

      {page === "routes" && (
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
                <span>Sort: Low sensory first</span>
              </div>

              <article className="route-card route-card-selected">
                <div className="route-card-header">
                  <span className="sensory-dot sensory-low">Low</span>
                  <h3>Route A via Flagstaff Station</h3>
                  <span className="sensory-pill sensory-pill-low">Low sensory</span>
                </div>
                <div className="route-metrics">
                  <div><span>Congestion</span><strong>Low</strong></div>
                  <div><span>Time</span><strong>31m</strong></div>
                  <div><span>Walk</span><strong>480m</strong></div>
                  <div><span>PT access</span><strong>Train</strong></div>
                </div>
                <div className="route-card-footer">
                  <p>Factors: lower pedestrian volume, no nearby events, no construction</p>
                  <button onClick={() => setPage("confirm")} type="button">Select Route A</button>
                </div>
              </article>

              <article className="route-card">
                <div className="route-card-header">
                  <span className="sensory-dot sensory-high">High</span>
                  <h3>Route B via Swanston Street tram</h3>
                  <span className="sensory-pill sensory-pill-high">High sensory</span>
                </div>
                <div className="route-metrics">
                  <div><span>Congestion</span><strong>High</strong></div>
                  <div><span>Time</span><strong>24m</strong></div>
                  <div><span>Walk</span><strong>220m</strong></div>
                  <div><span>PT access</span><strong>Train</strong></div>
                </div>
                <div className="route-card-footer">
                  <p>Factors: event crowd near Town Hall, busy pedestrian corridor, tram crowding</p>
                  <button
                    className="secondary-button"
                    onClick={() => setPage("warning")}
                    type="button"
                  >
                    Select Route B
                  </button>
                </div>
              </article>

              <article className="route-card">
                <div className="route-card-header">
                  <span className="sensory-dot sensory-medium">Med</span>
                  <h3>Route C via Parliament Station</h3>
                  <span className="sensory-pill sensory-pill-medium">Medium sensory</span>
                </div>
                <div className="route-metrics">
                  <div><span>Congestion</span><strong>Medium</strong></div>
                  <div><span>Time</span><strong>35m</strong></div>
                  <div><span>Walk</span><strong>620m</strong></div>
                  <div><span>PT access</span><strong>Train</strong></div>
                </div>
                <div className="route-card-footer">
                  <p>Factors: slower but avoids high-density corridors and construction</p>
                  <button className="secondary-button" type="button">Select Route C</button>
                </div>
              </article>
            </aside>

            <section className="map-panel" aria-labelledby="map-title">
              <h2 id="map-title">Melbourne CBD route map</h2>
              <p>
                Congested pedestrian corridor is marked with text and icon. Selected route
                integrates walking with public transport access.
              </p>
              <div className="map-canvas" aria-label="Melbourne CBD sensor-density map">
                <div className="street street-one">Batman St</div>
                <div className="street street-two">Lonsdale St</div>
                <div className="street street-three">Little Collins St</div>
                <div className="street street-four">William St</div>
                <div className="route-line" />
                <span className="route-start" />
                <span className="route-end" />
                <span className="route-label">Route A<br />Low sensory</span>
                {sensorPoints.map((point) => {
                  const left =
                    ((point.longitude - melbourneBounds.west) /
                      (melbourneBounds.east - melbourneBounds.west)) *
                    100;
                  const top =
                    ((melbourneBounds.north - point.latitude) /
                      (melbourneBounds.north - melbourneBounds.south)) *
                    100;

                  return (
                    <span
                      aria-label={`${point.sensor_name ?? "Sensor"} ${point.density_level}`}
                      className={`map-density map-density-${point.density_level.toLowerCase()}`}
                      key={point.location_id}
                      style={{ left: `${left}%`, top: `${top}%` }}
                    />
                  );
                })}
              </div>
              <p className="map-legend">
                Legend: <span className="legend-low" /> Low congestion <span className="legend-medium" /> Medium congestion <span className="legend-high" /> High congestion
              </p>
            </section>
          </section>
        </main>
      )}

      {page === "warning" && (
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
                <h2 id="threshold-warning-title">Route B exceeds your crowd threshold</h2>
                <dl className="warning-details">
                  <div>
                    <dt>Location</dt>
                    <dd>Swanston Street</dd>
                  </div>
                  <div>
                    <dt>Expected</dt>
                    <dd>5:20-5:55 PM</dd>
                  </div>
                  <div>
                    <dt>Impact</dt>
                    <dd>High crowd density</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="alternative-panel" aria-labelledby="alternative-title">
              <h2 id="alternative-title">Lower-stimulation alternative</h2>
              <article className="route-card route-card-selected alternative-route-card">
                <div className="route-card-header">
                  <span className="sensory-dot sensory-low">Low</span>
                  <h3>Route A via Flagstaff Station</h3>
                  <span className="sensory-pill sensory-pill-low">Low sensory</span>
                </div>
                <div className="route-metrics">
                  <div><span>Congestion</span><strong>Low</strong></div>
                  <div><span>Time</span><strong>31m</strong></div>
                  <div><span>Walk</span><strong>480m</strong></div>
                  <div><span>PT access</span><strong>Train</strong></div>
                </div>
                <p className="alternative-factors">
                  Factors: lower pedestrian volume, no nearby events, no construction
                </p>
              </article>
              <p className="alternative-copy">
                Route A is 7 minutes longer and 260 m more walking, but avoids the affected
                corridor.
              </p>
              <div className="alternative-actions">
                <button className="secondary-button" onClick={() => setPage("routes")} type="button">
                  Keep current route
                </button>
                <button onClick={() => setPage("confirm")} type="button">Select alternative</button>
              </div>
            </section>
          </section>
        </main>
      )}

      {page === "confirm" && (
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
                <span className="sensory-dot confirm-low-dot">Low</span>
                <h2 id="confirm-route-title">Route A via Flagstaff Station</h2>
              </div>
              <p className="confirm-route-meta">
                Low sensory | Low congestion | 31 min | 480 m walk | Train access at Flagstaff
                Station
              </p>

              <section className="route-preview-panel" aria-labelledby="route-preview-title">
                <h3 id="route-preview-title">Route preview</h3>
                <p>Walking route connects to public transport access point.</p>
                <div className="map-canvas confirm-map" aria-label="Selected route preview">
                  <div className="street street-one">Batman St</div>
                  <div className="street street-two">Lonsdale St</div>
                  <div className="street street-three">Little Collins St</div>
                  <div className="street street-four">William St</div>
                  <div className="route-line" />
                  <span className="route-start" />
                  <span className="route-end" />
                  <span className="route-label">Route A<br />Low sensory</span>
                  <span className="map-density map-density-low preview-low-one" />
                  <span className="map-density map-density-medium preview-medium-one" />
                  <span className="map-density map-density-medium preview-medium-two" />
                  <span className="map-density map-density-high preview-high-one" />
                  <span className="map-density map-density-high preview-high-two" />
                </div>
                <p className="map-legend">
                  Legend: <span className="legend-low" /> Low congestion <span className="legend-medium" /> Medium congestion <span className="legend-high" /> High congestion
                </p>
              </section>
            </section>

            <div className="confirm-side">
              <section className="match-panel" aria-labelledby="match-title">
                <h2 id="match-title">Why this route matches</h2>
                <ol>
                  <li>Low sensory based on agreed factors</li>
                  <li>Avoids highly congested corridors</li>
                  <li>Below preferred threshold</li>
                  <li>Integrates walking with public transport</li>
                </ol>
              </section>
              <button
                className="start-journey-button"
                onClick={() => setPage("monitor")}
                type="button"
              >
                Start journey
              </button>
            </div>
          </section>
        </main>
      )}

      {page === "monitor" && (
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
              <p>Current progress: 42%. One current high-density alert appears calmly in the panel.</p>
              <div className="map-canvas active-map" aria-label="Active route map">
                <div className="street street-one">Batman St</div>
                <div className="street street-two">Lonsdale St</div>
                <div className="street street-three">Little Collins St</div>
                <div className="street street-four">William St</div>
                <div className="route-line active-route-line" />
                <span className="active-progress-point active-progress-one" />
                <span className="active-progress-point active-progress-two" />
                <span className="active-progress-point active-progress-current" />
                <span className="route-end active-route-end" />
                <span className="route-label active-route-label">Route A<br />Low sensory</span>
                <span className="map-density map-density-low active-low-one" />
                <span className="map-density map-density-medium active-medium-one" />
                <span className="map-density map-density-medium active-medium-two" />
                <span className="map-density map-density-high active-high-one" />
                <span className="map-density map-density-high active-high-two" />
              </div>
              <p className="map-legend">
                Legend: <span className="legend-low" /> Low congestion <span className="legend-medium" /> Medium congestion <span className="legend-high" /> High congestion
              </p>
            </section>

            <aside className="journey-panel" aria-label="Current route">
              <h2>Current route</h2>
              <p className="journey-route-name">Route A via Flagstaff Station</p>
              <div className="journey-metrics">
                <div>
                  <span>Progress</span>
                  <strong>42%</strong>
                </div>
                <div>
                  <span>Next step</span>
                  <strong>Train</strong>
                </div>
              </div>
              <h3>Active alert</h3>
              <p className="active-alert-copy">
                Current high-density area near Elizabeth Street. You are not on that corridor.
              </p>
              <button
                className="secondary-button"
                onClick={() => setPage("predictive")}
                type="button"
              >
                Next-hour forecast
              </button>
              <button onClick={() => setPage("quiet")} type="button">Find quiet space</button>
            </aside>
          </section>
        </main>
      )}

      {page === "predictive" && (
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
              <span className="prediction-pill">Predicted</span>
              <h2 id="prediction-card-title">Bourke Street Mall likely to become overwhelming</h2>
              <dl>
                <div>
                  <dt>Expected time:</dt>
                  <dd>5:40-6:20 PM.</dd>
                </div>
                <div>
                  <dt>Main stressor:</dt>
                  <dd>rising pedestrian density</dd>
                </div>
                <div>
                  <dt>Information type:</dt>
                  <dd>predicted, not current.</dd>
                </div>
              </dl>
              <p>Confidence: Medium | Updated 8 min ago | Uncertainty communicated responsibly.</p>
            </section>

            <section className="affected-map-panel" aria-labelledby="affected-map-title">
              <h2 id="affected-map-title">Affected area map</h2>
              <p>Prediction area is labelled with expected time and uncertainty.</p>
              <div className="map-canvas predictive-map" aria-label="Affected area map">
                <div className="street street-one">Batman St</div>
                <div className="street street-two">Lonsdale St</div>
                <div className="street street-three">Little Collins St</div>
                <div className="street street-four">William St</div>
                <div className="route-line" />
                <span className="route-start" />
                <span className="route-end" />
                <span className="route-label">Route A<br />Low sensory</span>
                <span className="map-density map-density-low predictive-low-one" />
                <span className="map-density map-density-medium predictive-medium-one" />
                <span className="map-density map-density-medium predictive-medium-two" />
                <span className="map-density map-density-high predictive-high-one" />
                <span className="map-density map-density-high predictive-high-two" />
                <div className="prediction-map-label">
                  <span>Bourke Street Mall</span>
                  <span>Predicted 5:40-6:20 PM</span>
                </div>
                <div className="prediction-callout-line" />
              </div>
              <div className="predictive-actions">
                <button className="secondary-button" onClick={() => setPage("monitor")} type="button">
                  Dismiss alert
                </button>
                <button onClick={() => setPage("confirm")} type="button">Review journey</button>
              </div>
            </section>
          </section>
        </main>
      )}

      {page === "quiet" && (
        <main className="quiet-page">
          <section className="intro quiet-intro" aria-labelledby="quiet-title">
            <h1 id="quiet-title">Nearby sensory refuge locations</h1>
            <p>
              Find parks, libraries and quiet public spaces on demand. Quietness is not guaranteed
              when data is unavailable.
            </p>
          </section>

          <section className="quiet-layout">
            <aside className="refuge-list" aria-label="Nearby sensory refuge options">
              <h2>Nearby options</h2>

              {refuges.map((refuge) => (
                <article
                  className={
                    refuge.id === selectedRefugeId
                      ? "refuge-card refuge-card-selected"
                      : "refuge-card"
                  }
                  key={refuge.id}
                  onClick={() => setSelectedRefugeId(refuge.id)}
                >
                  <div className="refuge-card-header">
                    <span className="refuge-marker">{refuge.marker}</span>
                    <h3>{refuge.name}</h3>
                    <span>{refuge.category}</span>
                  </div>
                  <div className="refuge-metrics">
                    <div><span>Distance</span><strong>{refuge.cardDistance}</strong></div>
                    <div><span>Open</span><strong>{refuge.cardAvailability}</strong></div>
                    <div><span>Data</span><strong>{refuge.cardQuietnessData}</strong></div>
                  </div>
                  <p>{refuge.note}</p>
                </article>
              ))}
            </aside>

            <section className="refuge-map-panel" aria-labelledby="refuge-map-title">
              <h2 id="refuge-map-title">Refuge map</h2>
              <div className="map-canvas refuge-map" aria-label="Refuge map">
                <div className="street street-one">Batman St</div>
                <div className="street street-two">Lonsdale St</div>
                <div className="street street-three">Little Collins St</div>
                <div className="street street-four">William St</div>
                <div className="route-line refuge-route-line" />
                <span className="active-progress-point refuge-progress-one" />
                <span className="active-progress-point refuge-progress-two" />
                <span className="route-end refuge-route-end" />
                <span className="map-density map-density-low refuge-low-one" />
                <span className="map-density map-density-medium refuge-medium-one" />
                <span className="map-density map-density-medium refuge-medium-two" />
                <span className="map-density map-density-high refuge-high-one" />
                <span className="refuge-map-callout refuge-park"><b>P</b><span>Park: Flagstaff Gardens</span></span>
                <span className="refuge-map-callout refuge-library"><b>L</b><span>Library: State Library</span></span>
                <span className="refuge-map-callout refuge-public"><b>S</b><span>Town Hall arcade seating</span></span>
              </div>
              <div className="refuge-actions">
                <button className="secondary-button" onClick={() => setPage("monitor")} type="button">
                  Back to Journey
                </button>
                <button onClick={() => setPage("refugeDetail")} type="button">View detail</button>
              </div>
              <p className="map-legend">
                Legend: <span className="legend-low" /> Low congestion <span className="legend-medium" /> Medium congestion <span className="legend-high" /> High congestion
              </p>
            </section>
          </section>
        </main>
      )}

      {page === "refugeDetail" && (
        <main className="refuge-detail-page">
          <section className="intro refuge-detail-intro" aria-labelledby="refuge-detail-title">
            <h1 id="refuge-detail-title">{selectedRefuge.name}</h1>
            <p>View basic refuge information and return to the active journey when ready.</p>
          </section>

          <section className="refuge-detail-layout">
            <img
              alt={selectedRefuge.name}
              className="refuge-detail-image"
              src={selectedRefuge.imageUrl}
            />

            <section className="refuge-detail-panel" aria-labelledby="refuge-panel-title">
              <div className="refuge-detail-heading">
                <span className="library-icon" aria-hidden="true" />
                <h2 id="refuge-panel-title">{selectedRefuge.name}</h2>
              </div>
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{selectedRefuge.type}</dd>
                </div>
                <div>
                  <dt>Distance</dt>
                  <dd>{selectedRefuge.distance}</dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>{selectedRefuge.availability}</dd>
                </div>
                <div>
                  <dt>Quietness data</dt>
                  <dd>{selectedRefuge.quietnessData}</dd>
                </div>
                <div>
                  <dt>Note</dt>
                  <dd>{selectedRefuge.note}</dd>
                </div>
              </dl>
              <div className="refuge-detail-actions">
                <button onClick={() => setPage("monitor")} type="button">Back to journey</button>
                <button className="secondary-button" onClick={() => setPage("quiet")} type="button">
                  Optional directions
                </button>
              </div>
            </section>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
