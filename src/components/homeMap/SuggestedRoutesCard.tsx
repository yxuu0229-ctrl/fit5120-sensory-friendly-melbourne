import type { RankedTrip } from "./shared";

interface SuggestedRoutesCardProps {
  trips: RankedTrip[];
  selectedIdx: number;
  onSelectRoute: (idx: number) => void;
  onStartJourney: () => void;
}

// Navigate mode overlay listing the planned routes ranked by sensory warnings
export default function SuggestedRoutesCard({
  trips,
  selectedIdx,
  onSelectRoute,
  onStartJourney,
}: SuggestedRoutesCardProps) {
  return (
    <div className="routes-list-card-overlay">
      <div className="routes-list-header">Suggested Routes</div>
      <div className="routes-list-container">
        {trips.map((trip, idx) => {
          const isCalmest = idx === 0;
          const isSelected = selectedIdx === idx;
          const distanceKm = (trip.distanceMeters / 1000).toFixed(2);
          const durationMins = Math.round(trip.durationSeconds / 60);

          return (
            <div
              key={idx}
              className={`route-option-row ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectRoute(idx)}
            >
              <div className="route-option-left">
                <div
                  className="route-color-indicator"
                  style={{ backgroundColor: isCalmest ? "#2563eb" : "#222222" }}
                ></div>
                <div className="route-name-container">
                  <div className="route-name">{isCalmest ? "Route A (Calmest)" : `Route B (Alternative)`}</div>
                  <div className="route-details-text">
                    {durationMins} min &bull; {trip.distanceMeters < 1000 ? `${Math.round(trip.distanceMeters)}m` : `${distanceKm} km`}
                  </div>
                </div>
              </div>
              <div className={`route-warning-badge ${trip.warnings > 0 ? "has-warnings" : "no-warnings"}`}>
                {trip.warnings === 0 ? "No warnings" : `${trip.warnings} warning${trip.warnings > 1 ? "s" : ""}`}
              </div>
            </div>
          );
        })}
      </div>
      <button className="start-journey-btn large-start-btn" onClick={onStartJourney}>
        Start Journey
      </button>
    </div>
  );
}
