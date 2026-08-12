import { formatMins, formatWalk } from "../../lib/sensoryIndicator";
import { colorForMode, labelForSegmentMode } from "../../lib/modeColors";
import type { RouteOption, TransitLeg } from "../../lib/types";

function kindLabel(kind: TransitLeg["kind"]) {
  if (kind === "walk") return "Walk";
  return labelForSegmentMode(kind);
}

export default function RouteCard({
  route,
  selected,
  onSelect,
}: {
  route: RouteOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const legs = route.transitLegs ?? [];
  const modeSwatch =
    !legs.length && route.segments?.[0]
      ? route.segments[0]
      : null;

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
        {modeSwatch ? (
          <span
            className="badge mode-swatch"
            style={{ background: modeSwatch.color, color: "#fff" }}
          >
            {labelForSegmentMode(modeSwatch.mode)}
          </span>
        ) : null}
      </div>
      <strong>
        Route {route.rank} · {route.label}
      </strong>
      <div className="route-meta">
        <span>{formatWalk(route.distanceMeters)}</span>
        <span>{formatMins(route.durationSeconds)}</span>
        <span>Load {route.sensoryLoad}</span>
      </div>
      {legs.length > 0 ? (
        <ul className="transit-legs">
          {legs.map((leg, i) => (
            <li key={`${leg.kind}-${leg.line}-${i}`}>
              <span
                className={`transit-chip transit-${leg.kind}`}
                style={{
                  background: leg.color || colorForMode(leg.kind),
                }}
              >
                {kindLabel(leg.kind)} {leg.line}
              </span>
              <span className="transit-leg-detail">
                {leg.fromStop && leg.toStop
                  ? `${leg.fromStop} → ${leg.toStop}`
                  : leg.headsign
                    ? `Toward ${leg.headsign}`
                    : leg.vehicleName}
                {leg.departsAt ? ` · ${leg.departsAt}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </button>
  );
}
