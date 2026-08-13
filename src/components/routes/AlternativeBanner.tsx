import type { RouteOption } from "../../lib/types";

export default function AlternativeBanner({
  selected,
  alternative,
  onTake,
}: {
  selected: RouteOption | null;
  alternative: RouteOption | null;
  onTake: () => void;
}) {
  if (!selected || !alternative || selected.id === alternative.id) return null;
  if (selected.indicator !== "High") return null;

  return (
    <div className="alt-banner">
      <p>
        <strong>{selected.label}</strong> is above your threshold. A calmer option
        is available: <strong>{alternative.label}</strong> (load{" "}
        {alternative.sensoryLoad}).
      </p>
      <button type="button" className="btn btn-secondary" onClick={onTake}>
        Use calmer route
      </button>
    </div>
  );
}
