import type { RouteOption } from "../../lib/types";
import RouteCard from "./RouteCard";

export default function TopRoutesList({
  routes,
  selectedId,
  onSelect,
  onGo,
  canGo,
}: {
  routes: RouteOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onGo?: () => void;
  canGo?: boolean;
}) {
  if (!routes.length) {
    return (
      <p className="muted">
        Plan a journey to see up to three route options. Transit shows tram,
        train, and bus lines to take.
      </p>
    );
  }

  const showTransitLegend = routes.some((r) => (r.segments?.length ?? 0) > 1);

  return (
    <div className="route-list">
      <div className="route-list-head">
        <p className="eyebrow">Top 3 · coloured by transport mode</p>
        {onGo ? (
          <button
            type="button"
            className="btn btn-go-inline"
            disabled={!canGo}
            onClick={onGo}
          >
            Go
          </button>
        ) : null}
      </div>
      {showTransitLegend ? (
        <p className="mode-legend" aria-label="Route colour key">
          <span className="mode-key walk">Walk</span>
          <span className="mode-key tram">Tram</span>
          <span className="mode-key train">Train</span>
          <span className="mode-key bus">Bus</span>
        </p>
      ) : null}
      {routes.map((route) => (
        <RouteCard
          key={route.id}
          route={route}
          selected={route.id === selectedId}
          onSelect={() => onSelect(route.id)}
          onGo={onGo}
        />
      ))}
    </div>
  );
}
