import type { QuietAlert } from "../../lib/types";

export default function NextHourAlert({ alert }: { alert: QuietAlert | null }) {
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
        This coverage area (streets &amp; buildings the sensor watches) is
        typically busy around <strong>{alert.periodLabel}</strong>
        {alert.expectedMean != null
          ? ` · about ${Math.round(alert.expectedMean)} people`
          : ""}
        {alert.reliable ? "" : " · limited history"}
      </p>
    </div>
  );
}
