import type { RefugePlace } from "../../lib/types";

export default function RefugeList({
  places,
  selectedId,
  onSelect,
}: {
  places: RefugePlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!places.length) {
    return <p className="muted">No sensory refuges loaded nearby.</p>;
  }
  return (
    <ul className="refuge-list">
      {places.slice(0, 8).map((p) => (
        <li key={p.id}>
          <button
            type="button"
            className={selectedId === p.id ? "is-selected" : undefined}
            onClick={() => onSelect(p.id)}
          >
            <strong>{p.name}</strong>
            <span>
              {p.category || "Quiet space"}
              {p.distanceMeters != null
                ? ` · ${Math.round(p.distanceMeters)} m`
                : ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
