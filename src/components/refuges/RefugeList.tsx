import {
  classifyRefuge,
  REFUGE_KIND_META,
} from "../../lib/refugeCategories";
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
    return (
      <p className="muted">
        No places for the active layers. Turn on Calm refuges or a support
        filter.
      </p>
    );
  }
  return (
    <ul className="refuge-list">
      {places.slice(0, 10).map((p) => {
        const kind = classifyRefuge(p);
        const meta = REFUGE_KIND_META[kind];
        return (
          <li key={p.id}>
            <button
              type="button"
              className={selectedId === p.id ? "is-selected" : undefined}
              onClick={() => onSelect(p.id)}
            >
              <span
                className="refuge-list-dot"
                style={{ background: meta.color }}
                aria-hidden="true"
              />
              <span className="refuge-list-copy">
                <strong>{p.name}</strong>
                <span>
                  {meta.label}
                  {p.distanceMeters != null
                    ? ` · ${
                        p.distanceMeters < 1000
                          ? `${Math.round(p.distanceMeters)} m`
                          : `${(p.distanceMeters / 1000).toFixed(1)} km`
                      }`
                    : ""}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
