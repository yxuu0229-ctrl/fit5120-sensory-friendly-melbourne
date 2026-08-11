import { type FormEvent, useEffect, useState } from "react";
import { cbdLocations, defaultDestination, defaultOrigin } from "../lib/cbdLocations";
import { DEFAULT_TOLERANCE, type CrowdTolerance } from "../lib/tolerance";
import type { AddressField } from "../lib/useAddressField";
import LocationInput from "./LocationInput";

const toleranceOptions: Array<{ value: CrowdTolerance; hint: string }> = [
  {
    value: "Low",
    hint: "Only routes whose busiest segment has Low pedestrian volume.",
  },
  {
    value: "Medium",
    hint: "Accept Low or Medium segments; High-volume segments trigger a warning.",
  },
];

function PlanJourneyPage({
  originField,
  destinationField,
  tolerance,
  onToleranceChange,
  avoidCongestion,
  onToggleAvoidCongestion,
  canPlanJourney,
  needsCurrentLocation,
  locationStatus,
  routeError,
  isBackendConfigured,
  isPlanning,
  onSubmit,
  onUseCurrentLocation,
}: {
  originField: AddressField;
  destinationField: AddressField;
  /** null = no explicit choice yet; the documented default applies. */
  tolerance: CrowdTolerance | null;
  onToleranceChange: (value: CrowdTolerance) => void;
  avoidCongestion: boolean;
  onToggleAvoidCongestion: () => void;
  canPlanJourney: boolean;
  needsCurrentLocation: boolean;
  locationStatus: "idle" | "loading" | "ready" | "error";
  routeError: string;
  isBackendConfigured: boolean;
  isPlanning: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseCurrentLocation: () => void;
}) {
  const [openLocationMenu, setOpenLocationMenu] = useState<"origin" | "destination" | null>(null);

  useEffect(() => {
    function closeLocationMenu(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest(".location-field")) return;
      setOpenLocationMenu(null);
    }

    document.addEventListener("mousedown", closeLocationMenu);
    return () => document.removeEventListener("mousedown", closeLocationMenu);
  }, []);

  return (
    <main className="journey-page">
      <section className="intro" aria-labelledby="page-title">
        <h1 id="page-title">Plan a sensory-aware journey</h1>
        <p>
          Enter a Melbourne CBD destination, choose your crowd tolerance, and choose whether
          to avoid highly congested pedestrian corridors.
        </p>
      </section>

      <form className="journey-form" onSubmit={onSubmit}>
        <LocationInput
          id="origin"
          label="Origin"
          placeholder={defaultOrigin}
          field={originField}
          isMenuOpen={openLocationMenu === "origin"}
          onOpenMenu={() => setOpenLocationMenu("origin")}
          onCloseMenu={() => setOpenLocationMenu(null)}
          onFocus={() => {
            setOpenLocationMenu("origin");
            if (!originField.value) onUseCurrentLocation();
          }}
        />

        <LocationInput
          id="destination"
          label="Destination"
          placeholder={defaultDestination}
          field={destinationField}
          isMenuOpen={openLocationMenu === "destination"}
          onOpenMenu={() => setOpenLocationMenu("destination")}
          onCloseMenu={() => setOpenLocationMenu(null)}
          onFocus={() => {
            setOpenLocationMenu("destination");
            if (!destinationField.value) {
              destinationField.setValue(defaultDestination);
              const location = cbdLocations.find((item) => item.name === "State Library Victoria");
              if (location) {
                destinationField.setResult({ lat: location.lat, lng: location.lng }, `Using: ${defaultDestination}`);
              }
            }
          }}
        />

        <section className="card threshold-card" aria-labelledby="tolerance-title">
          <h2 id="tolerance-title">Crowd tolerance</h2>
          <p>
            Routes whose busiest segment exceeds your tolerance are ranked below calmer
            options and trigger a warning with a lower-stimulation alternative.
          </p>
          <div className="tolerance-options">
            {toleranceOptions.map((option) => (
              <label
                className={
                  tolerance === option.value
                    ? "tolerance-option tolerance-option-active"
                    : "tolerance-option"
                }
                key={option.value}
              >
                <input
                  checked={tolerance === option.value}
                  name="crowdTolerance"
                  onChange={() => onToleranceChange(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span className="tolerance-label">{option.value}</span>
                <span className="tolerance-hint">{option.hint}</span>
              </label>
            ))}
          </div>
          {tolerance === null && (
            <p className="tolerance-default-note" role="status">
              No tolerance set — using the documented default ({DEFAULT_TOLERANCE}) until
              you choose. Your choice is kept for this session.
            </p>
          )}
        </section>

        <section className="card preferences-card" aria-labelledby="preferences-title">
          <div className="preferences-heading">
            <h2 id="preferences-title">Avoidance preferences</h2>
            <button
              aria-label="Avoid highly congested corridors"
              aria-pressed={avoidCongestion}
              className={avoidCongestion ? "toggle toggle-on" : "toggle"}
              onClick={onToggleAvoidCongestion}
              type="button"
            >
              <span />
            </button>
          </div>
          <h3>Avoid highly congested corridors</h3>
          <p>
            Uses cached pedestrian-density readings from City of Melbourne sensors (via
            Supabase, refreshed about every 15 minutes) to prefer calmer walking corridors
            when generating and sorting routes.
          </p>
        </section>

        <div className="action-area">
          <button className="primary-action" disabled={!canPlanJourney || isPlanning} type="submit">
            {isPlanning ? "Planning routes…" : "Find sensory-aware routes"}
          </button>
          {needsCurrentLocation && locationStatus === "loading" && (
            <p className="backend-note">Waiting for browser location permission.</p>
          )}
          {needsCurrentLocation && locationStatus === "error" && (
            <p className="backend-note">Location was not allowed. Enter an origin manually.</p>
          )}
          {needsCurrentLocation && locationStatus === "ready" && (
            <p className="backend-note">Current location is ready.</p>
          )}
          {routeError && <p className="backend-note">{routeError}</p>}
          {!isBackendConfigured && (
            <p className="backend-note">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or
              NEXT_PUBLIC_ equivalents) to enable density-aware planning.
            </p>
          )}
          {isBackendConfigured && (
            <p className="backend-note">
              Connected to Supabase. Routes use OSRM walking geometry plus live sensor density.
            </p>
          )}
        </div>
      </form>
    </main>
  );
}

export default PlanJourneyPage;
