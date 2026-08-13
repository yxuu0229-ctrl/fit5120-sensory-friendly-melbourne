import type { ForecastHotspot } from "../../lib/forecastHotspots";

export default function NextHourAlert({
  alert,
  hotspotCount = 0,
}: {
  alert: ForecastHotspot | null;
  hotspotCount?: number;
}) {
  if (!alert) {
    return (
      <p className="muted">
        No high next-hour forecast for coverage areas in this zone.
      </p>
    );
  }
  return (
    <div className="alert-card">
      <p className="eyebrow">Next-hour forecast</p>
      <h3>{alert.areaName}</h3>
      <p>
        Typically busy around <strong>{alert.periodLabel}</strong>
        {alert.expectedMean != null
          ? ` · about ${Math.round(alert.expectedMean)} people`
          : ""}
        {hotspotCount > 1 ? ` · ${hotspotCount} heat zones on map` : ""}
      </p>
    </div>
  );
}
