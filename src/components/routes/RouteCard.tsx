import { formatMins, formatWalk } from "../../lib/sensoryIndicator";
import type { RouteOption } from "../../lib/types";

export default function RouteCard({
  route,
  selected,
  onSelect,
}: {
  route: RouteOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`route-card${selected ? " is-selected" : ""}`}
      onClick={onSelect}
    >
      <div className="route-card-top">
        <span className={`badge badge-${route.indicator.toLowerCase()}`}>
          {route.indicator}
        </span>
        {route.recommended && <span className="badge badge-rec">Recommended</span>}
      </div>
      <strong>
        Route {route.rank} · {route.label}
      </strong>
      <div className="route-meta">
        <span>{formatWalk(route.distanceMeters)}</span>
        <span>{formatMins(route.durationSeconds)}</span>
        <span>Load {route.sensoryLoad}</span>
      </div>
    </button>
  );
}
