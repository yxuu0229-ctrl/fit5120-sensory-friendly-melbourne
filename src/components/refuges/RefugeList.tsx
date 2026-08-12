import { useState } from "react";
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
  const [visibleCount, setVisibleCount] = useState(5);

  const top10 = places.slice(0, 10);

  if (!top10.length) {
    return <p className="muted">No sensory refuges loaded nearby.</p>;
  }

  const visiblePlaces = top10.slice(0, visibleCount);
  const hasMore = visibleCount < top10.length;
  const isExpanded = visibleCount > 5;

  return (
    <div className="refuge-list-wrap">
      <ul className="refuge-list">
        {visiblePlaces.map((p) => (
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
      <div className="refuge-actions-row">
        {hasMore && (
          <button
            type="button"
            className="btn btn-ghost btn-more-refuges"
            onClick={() => setVisibleCount(10)}
          >
            Show 5 more
          </button>
        )}
        {isExpanded && (
          <button
            type="button"
            className="btn btn-ghost btn-less-refuges"
            onClick={() => setVisibleCount(5)}
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}
