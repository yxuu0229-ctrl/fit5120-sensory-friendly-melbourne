"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { filterPlacesAlongRoute, type LatLng } from "@/lib/geo";
import type { PlannedTrip } from "@/lib/planTypes";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import {
  isTransitMode,
  MODE_OPTIONS,
  type TransportMode,
} from "@/lib/transportModes";
import type { Place, SensorDensityCurrent } from "@/lib/types";

const CBD_CENTER: LatLng = { lat: -37.8136, lng: 144.9631 };
/** How close a refuge must be to the route to count as "along the journey" */
const REFUGE_ALONG_ROUTE_METERS = 200;

function makePin(label: string, className: string, size = 28) {
  return L.divIcon({
    className: "",
    html: `<div class="pin ${className}">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function densityColor(level: string) {
  if (level === "Low") return "#1f7a4c";
  if (level === "Medium") return "#b36b00";
  return "#b42318";
}

function ClickPicker({
  mode,
  onPick,
}: {
  mode: "A" | "B" | null;
  onPick: (p: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (!mode) return;
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function formatDuration(s: number) {
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${h} h ${rem} min`;
}

function formatDeparture(utc: string) {
  try {
    return new Date(utc).toLocaleString("en-AU", {
      timeZone: "Australia/Melbourne",
      hour: "numeric",
      minute: "2-digit",
      weekday: "short",
    });
  } catch {
    return utc;
  }
}

export default function RouteMap() {
  const [sensors, setSensors] = useState<SensorDensityCurrent[]>([]);
  const [from, setFrom] = useState<LatLng | null>(null);
  const [to, setTo] = useState<LatLng | null>(null);
  const [pickMode, setPickMode] = useState<"A" | "B" | null>("A");
  const [transportMode, setTransportMode] = useState<TransportMode>("walk");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlannedTrip | null>(null);
  const [trips, setTrips] = useState<PlannedTrip[]>([]);
  const [selectedTripIndex, setSelectedTripIndex] = useState(0);
  const [showDensity, setShowDensity] = useState(true);
  const [showRefuges, setShowRefuges] = useState(true);
  const [refuges, setRefuges] = useState<Place[]>([]);

  const startIcon = useMemo(() => makePin("A", "pin-a"), []);
  const endIcon = useMemo(() => makePin("B", "pin-b"), []);
  const viaIcon = useMemo(() => makePin("Q", "pin-via-dot", 24), []);
  const refugeIcon = useMemo(() => makePin("R", "pin-refuge", 26), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = getBrowserSupabase();
        const [densityRes, placesRes] = await Promise.all([
          sb.from("sensor_density_current").select("*"),
          sb.from("places").select("*").eq("is_sensory_refuge", true),
        ]);
        if (densityRes.error) throw densityRes.error;
        if (placesRes.error) throw placesRes.error;
        if (!cancelled) {
          setSensors((densityRes.data || []) as SensorDensityCurrent[]);
          setRefuges((placesRes.data || []) as Place[]);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load map data"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refugesAlongJourney = useMemo(() => {
    if (!result?.allPositions?.length) return [];
    return filterPlacesAlongRoute(
      refuges,
      result.allPositions,
      REFUGE_ALONG_ROUTE_METERS
    );
  }, [result, refuges]);

  const onPick = useCallback(
    (p: LatLng) => {
      if (pickMode === "A") {
        setFrom(p);
        setPickMode("B");
        setResult(null);
        setTrips([]);
        setSelectedTripIndex(0);
      } else if (pickMode === "B") {
        setTo(p);
        setPickMode(null);
        setResult(null);
        setTrips([]);
        setSelectedTripIndex(0);
      }
    },
    [pickMode]
  );

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFrom({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPickMode("B");
        setResult(null);
        setTrips([]);
        setSelectedTripIndex(0);
        setError(null);
      },
      () =>
        setError("Could not read your location — click the map for A instead")
    );
  };

  const planRoute = async () => {
    if (!from || !to) {
      setError("Set both A and B first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/route/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, mode: transportMode }),
      });
      const data = (await res.json()) as {
        trip?: PlannedTrip;
        trips?: PlannedTrip[];
        error?: string;
      };
      if (!res.ok || !data.trip) {
        throw new Error(data.error || "Routing failed");
      }
      const listed =
        data.trips && data.trips.length > 0 ? data.trips : [data.trip];
      setTrips(listed);
      setSelectedTripIndex(0);
      setResult(listed[0]);
    } catch (e) {
      setResult(null);
      setTrips([]);
      setSelectedTripIndex(0);
      setError(e instanceof Error ? e.message : "Routing failed");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setFrom(null);
    setTo(null);
    setResult(null);
    setTrips([]);
    setSelectedTripIndex(0);
    setPickMode("A");
    setError(null);
  };

  const selectTrip = (index: number) => {
    const next = trips[index];
    if (!next) return;
    setSelectedTripIndex(index);
    setResult(next);
  };

  return (
    <div className="map-app">
      <aside className="map-panel">
        <h1>Melbourne travel map</h1>
        <p className="lead">
          Choose a transport mode, set A and B, then plan a route. Walk uses
          quieter-path bias from pedestrian sensors; public transport uses{" "}
          <strong>PTV Timetable API</strong> open data.
        </p>

        <fieldset className="mode-field">
          <legend>Transport mode</legend>
          <div className="mode-grid">
            {MODE_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`mode-option${
                  transportMode === opt.id ? " active" : ""
                }`}
              >
                <input
                  type="radio"
                  name="transportMode"
                  value={opt.id}
                  checked={transportMode === opt.id}
                  onChange={() => {
                    setTransportMode(opt.id);
                    setResult(null);
                    setTrips([]);
                    setSelectedTripIndex(0);
                  }}
                />
                <span className="mode-label">{opt.label}</span>
                <span className="mode-hint">{opt.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {isTransitMode(transportMode) && (
          <p className="meta">
            Needs <code>PTV_DEVID</code> + <code>PTV_API_KEY</code> in{" "}
            <code>apps/web/.env.local</code>.
          </p>
        )}

        <div className="actions">
          <button type="button" onClick={() => setPickMode("A")}>
            Set A on map
          </button>
          <button type="button" onClick={() => setPickMode("B")}>
            Set B on map
          </button>
          <button type="button" onClick={useMyLocation}>
            Use my location as A
          </button>
          <button
            type="button"
            className="primary"
            onClick={planRoute}
            disabled={!from || !to || loading}
          >
            {loading ? "Planning…" : "Plan route"}
          </button>
          <button type="button" onClick={clearAll}>
            Clear
          </button>
        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={showDensity}
            onChange={(e) => setShowDensity(e.target.checked)}
          />
          Show crowd density sensors
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={showRefuges}
            onChange={(e) => setShowRefuges(e.target.checked)}
          />
          Show sensory refuges along journey
        </label>

        <p className="meta">
          Click mode:{" "}
          <strong>
            {pickMode === "A"
              ? "place start (A)"
              : pickMode === "B"
                ? "place end (B)"
                : "none — use buttons above"}
          </strong>
        </p>

        <ul className="coords">
          <li>
            <strong>A</strong>{" "}
            {from
              ? `${from.lat.toFixed(5)}, ${from.lng.toFixed(5)}`
              : "not set"}
          </li>
          <li>
            <strong>B</strong>{" "}
            {to ? `${to.lat.toFixed(5)}, ${to.lng.toFixed(5)}` : "not set"}
          </li>
        </ul>

        {error && <div className="banner">{error}</div>}

        {trips.length > 1 && (
          <div className="route-list" aria-label="Routes by sensory load">
            <h2>Route options</h2>
            <p className="meta">
              Ordered calmest → busiest (lowest sensory indicator first).
            </p>
            <ol className="route-options">
              {trips.map((t, i) => {
                const indicator = t.sensoryIndicator ?? t.crowdScore;
                return (
                  <li key={`${t.label}-${i}`}>
                    <button
                      type="button"
                      className={
                        i === selectedTripIndex
                          ? "route-option active"
                          : "route-option"
                      }
                      onClick={() => selectTrip(i)}
                    >
                      <span className="route-option-rank">#{i + 1}</span>
                      <span className="route-option-body">
                        <strong>{t.label}</strong>
                        <span className="meta">
                          {formatDistance(t.distanceMeters)} ·{" "}
                          {formatDuration(t.durationSeconds)}
                          {indicator != null
                            ? ` · sensory ${indicator}`
                            : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {result && (
          <div className="route-card">
            <h2>{trips.length > 1 ? "Selected route" : "Route"}</h2>
            <p>
              <strong>{result.label}</strong>
            </p>
            <p>
              {formatDistance(result.distanceMeters)} ·{" "}
              {formatDuration(result.durationSeconds)}
            </p>
            {(result.sensoryIndicator != null || result.crowdScore != null) && (
              <p className="meta">
                Sensory indicator{" "}
                {result.sensoryIndicator ?? result.crowdScore} (lower is
                calmer)
                {result.alternativesConsidered != null
                  ? ` · ${result.alternativesConsidered} candidates`
                  : ""}
              </p>
            )}

            <ol className="legs">
              {result.legs.map((leg, i) => (
                <li key={`${leg.label}-${i}`}>
                  <span
                    className="leg-swatch"
                    style={{ background: leg.color }}
                  />
                  <div>
                    <strong>{leg.label}</strong>
                    <div className="meta">
                      {formatDistance(leg.distanceMeters)} ·{" "}
                      {formatDuration(leg.durationSeconds)}
                      {leg.departureUtc
                        ? ` · departs ${formatDeparture(leg.departureUtc)}`
                        : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {result.notes?.length ? (
              <ul className="notes">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}

            <div className="refuge-block">
              <h3>Sensory refuges along journey</h3>
              {refugesAlongJourney.length === 0 ? (
                <p className="meta">
                  No tagged refuge places within {REFUGE_ALONG_ROUTE_METERS} m of
                  this route.
                </p>
              ) : (
                <ul className="refuge-list">
                  {refugesAlongJourney.slice(0, 12).map((p) => (
                    <li key={p.id}>
                      <strong>{p.name}</strong>
                      <div className="meta">
                        {p.category || "Refuge"} · ~
                        {Math.round(p.distanceToRouteMeters)} m from route
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <p className="meta">
          Routers:{" "}
          <a
            href="https://project-osrm.org/"
            target="_blank"
            rel="noreferrer"
          >
            OSRM
          </a>{" "}
          ·{" "}
          <a
            href="https://www.ptv.vic.gov.au/footer/data-and-reporting/datasets/ptv-timetable-api/"
            target="_blank"
            rel="noreferrer"
          >
            PTV Timetable API
          </a>{" "}
          · Density: City of Melbourne Open Data
        </p>
        <p className="meta">
          <a href="/">← Data status</a>
        </p>
      </aside>

      <div className="map-stage">
        <MapContainer
          center={[CBD_CENTER.lat, CBD_CENTER.lng]}
          zoom={14}
          style={{ width: "100%", height: "100%", minHeight: "100vh" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickPicker mode={pickMode} onPick={onPick} />

          {showDensity &&
            sensors.map((s) => (
              <CircleMarker
                key={s.location_id}
                center={[s.latitude, s.longitude]}
                radius={7}
                pathOptions={{
                  color: densityColor(s.density_level),
                  fillColor: densityColor(s.density_level),
                  fillOpacity: 0.55,
                  weight: 1,
                }}
              >
                <Popup>
                  <strong>{s.sensor_name || `Sensor ${s.location_id}`}</strong>
                  <br />
                  {s.density_level} · {s.total_count} peds
                </Popup>
              </CircleMarker>
            ))}

          {from && <Marker position={[from.lat, from.lng]} icon={startIcon} />}
          {to && <Marker position={[to.lat, to.lng]} icon={endIcon} />}
          {result?.via && (
            <Marker position={[result.via.lat, result.via.lng]} icon={viaIcon}>
              <Popup>Quieter waypoint (low-density sensor area)</Popup>
            </Marker>
          )}

          {result?.legs.map((leg, i) =>
            leg.positions.length > 1 ? (
              <Polyline
                key={`leg-${i}-${leg.mode}`}
                positions={leg.positions}
                pathOptions={{
                  color: leg.color,
                  weight: leg.mode === "walk" ? 4 : 6,
                  opacity: 0.9,
                  dashArray:
                    leg.mode === "walk" || leg.mode === "cycle"
                      ? undefined
                      : undefined,
                }}
              />
            ) : null
          )}

          {showRefuges &&
            refugesAlongJourney.map((p) => (
              <Marker
                key={p.id}
                position={[p.latitude, p.longitude]}
                icon={refugeIcon}
              >
                <Popup>
                  <strong>{p.name}</strong>
                  <br />
                  Sensory refuge
                  {p.category ? ` · ${p.category}` : ""}
                  <br />~{Math.round(p.distanceToRouteMeters)} m from route
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
