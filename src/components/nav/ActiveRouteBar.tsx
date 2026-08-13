import { formatMins, formatWalk } from "../../lib/sensoryIndicator";
import type { RouteOption } from "../../lib/types";

export default function ActiveRouteBar({
  route,
  progress,
  originLabel,
  destinationLabel,
}: {
  route: RouteOption | null;
  progress: number;
  originLabel?: string | null;
  destinationLabel?: string | null;
}) {
  if (!route) return null;

  const transitSummary =
    route.transitLegs?.map((leg) => `${leg.kind} ${leg.line}`).join(" → ") ||
    null;

  return (
    <div className="active-route-bar" role="status" aria-live="polite">
      <div className="active-route-bar-main">
        <span className="active-route-pill">Navigating</span>
        <div className="active-route-copy">
          <strong>
            {route.label || destinationLabel || "Active route"}
          </strong>
          <span>
            {originLabel ? `${originLabel} → ` : ""}
            {destinationLabel || "Destination"}
            {transitSummary ? ` · ${transitSummary}` : ""}
          </span>
        </div>
      </div>
      <div className="active-route-meta">
        <span className={`badge badge-${route.indicator.toLowerCase()}`}>
          {route.indicator}
        </span>
        <span>{formatWalk(route.distanceMeters)}</span>
        <span>{formatMins(route.durationSeconds)}</span>
        <span>{progress}%</span>
      </div>
      <div className="active-route-progress" aria-hidden="true">
        <div style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    </div>
  );
}
