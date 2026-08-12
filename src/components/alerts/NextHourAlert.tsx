import type { QuietAlert } from "../../lib/types";

export default function NextHourAlert({
  alert,
  onFocusLocation,
}: {
  alert: QuietAlert | null;
  onFocusLocation?: (point: { lat: number; lng: number }, locationId?: number) => void;
}) {
  if (!alert) {
    return (
      <div className="alert-card alert-card-calm">
        <div className="alert-card-header">
          <span className="alert-badge calm-badge">🟢 Quiet Outlook</span>
          <span className="alert-time">Next 60 mins</span>
        </div>
        <p className="alert-card-title">Sensory Conditions Favorable</p>
        <p className="alert-card-body">
          No high crowd surges predicted based on historic quiet-window data.
        </p>
      </div>
    );
  }

  const expected = alert.expectedMean ? Math.round(alert.expectedMean) : null;
  const current = alert.currentCount ? Math.round(alert.currentCount) : null;

  // Calculate percentage surge if both values exist
  let surgePercent: number | null = null;
  if (expected !== null && current !== null && current > 0) {
    surgePercent = Math.round(((expected - current) / current) * 100);
  }

  return (
    <div className={`alert-card alert-card-${alert.densityLevel.toLowerCase()}`}>
      <div className="alert-card-header">
        <div className="alert-badge-group">
          <span className={`alert-badge badge-${alert.densityLevel.toLowerCase()}`}>
            {alert.densityLevel === "High" ? "🔴 High Crowd Risk" : "🟡 Moderate Activity"}
          </span>
          {!alert.reliable && <span className="alert-badge-sub font-mono">Limited Data</span>}
        </div>
        <span className="alert-time">{alert.periodLabel}</span>
      </div>

      <h3 className="alert-card-location">{alert.areaName}</h3>

      <div className="alert-metrics">
        {expected !== null && (
          <div className="metric-box">
            <span className="metric-label">Predicted Crowd</span>
            <span className="metric-value">~{expected} people</span>
          </div>
        )}

        {surgePercent !== null && surgePercent !== 0 && (
          <div className="metric-box">
            <span className="metric-label">Trend</span>
            <span className={`metric-trend ${surgePercent > 0 ? "trend-up" : "trend-down"}`}>
              {surgePercent > 0 ? `▲ +${surgePercent}%` : `▼ ${surgePercent}%`} vs now
            </span>
          </div>
        )}
      </div>

      {onFocusLocation && (
        <button
          type="button"
          className="alert-focus-btn"
          onClick={() => onFocusLocation(alert.point, alert.locationId)}
        >
          📍 View area on map
        </button>
      )}
    </div>
  );
}
