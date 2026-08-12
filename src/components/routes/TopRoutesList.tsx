import type { RouteOption } from "../../lib/types";
import RouteCard from "./RouteCard";

export default function TopRoutesList({
  routes,
  selectedId,
  onSelect,
}: {
  routes: RouteOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!routes.length) {
    return (
      <p className="muted">
        Plan a journey to see up to three walking options, sorted calmest first.
      </p>
    );
  }

  return (
    <div className="route-list">
      <p className="eyebrow">Top 3 · low to high sensory load</p>
      {routes.map((route) => (
        <RouteCard
          key={route.id}
          route={route}
          selected={route.id === selectedId}
          onSelect={() => onSelect(route.id)}
        />
      ))}
    </div>
  );
}
