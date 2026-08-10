import { type CSSProperties, type FormEvent, useEffect, useState } from "react";
import { cbdLocations, defaultDestination, defaultOrigin } from "../lib/cbdLocations";
import type { AddressField } from "../lib/useAddressField";
import LocationInput from "./LocationInput";

function PlanJourneyPage({
  originField,
  destinationField,
  threshold,
  onThresholdChange,
  avoidCongestion,
  onToggleAvoidCongestion,
  canPlanJourney,
  needsCurrentLocation,
  locationStatus,
  routeError,
  isBackendConfigured,
  onSubmit,
  onUseCurrentLocation,
}: {
  originField: AddressField;
  destinationField: AddressField;
  threshold: number;
  onThresholdChange: (value: number) => void;
  avoidCongestion: boolean;
  onToggleAvoidCongestion: () => void;
  canPlanJourney: boolean;
  needsCurrentLocation: boolean;
  locationStatus: "idle" | "loading" | "ready" | "error";
  routeError: string;
  isBackendConfigured: boolean;
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
          Enter a Melbourne CBD destination, set a crowd-density threshold, and choose whether
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

        <section className="card threshold-card" aria-labelledby="threshold-title">
          <h2 id="threshold-title">Preferred crowd-density threshold</h2>
          <p>Routes above this limit trigger a warning and lower-stimulation alternatives.</p>
          <div className="range-wrap">
            <input
              aria-label="Preferred crowd-density threshold"
              className="threshold-range"
              max="100"
              min="0"
              onChange={(event) => onThresholdChange(Number(event.target.value))}
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
              onClick={onToggleAvoidCongestion}
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
              Supabase keys are not configured yet. Route generation can be wired once the
              browser-safe anon key is available.
            </p>
          )}
        </div>
      </form>
    </main>
  );
}

export default PlanJourneyPage;
