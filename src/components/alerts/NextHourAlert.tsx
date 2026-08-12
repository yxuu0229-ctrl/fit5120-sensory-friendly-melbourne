import type { QuietAlert } from "../../lib/types";

export default function NextHourAlert({ alert }: { alert: QuietAlert | null }) {
  if (!alert) {
    return (
      <p className="muted">
        No high next-hour forecast along this area from quiet-window history.
      </p>
    );
  }
  return (
    <div className="alert-card">
      <p className="eyebrow">Next-hour alert</p>
      <h3>{alert.areaName}</h3>
      <p>
        Typically busy around <strong>{alert.periodLabel}</strong>
        {alert.expectedMean != null
          ? ` · about ${Math.round(alert.expectedMean)} people`
          : ""}
        {alert.reliable ? "" : " · limited history"}
      </p>
    </div>
  );
}
