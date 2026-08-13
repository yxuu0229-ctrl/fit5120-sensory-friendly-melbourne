import type { RefugePlace } from "../../lib/types";
import RefugeDetail from "../refuges/RefugeDetail";

export default function NearestRefugePicker({
  places,
  selectedId,
  onSelect,
  selected,
  onNavigate,
  onClose,
  onBack,
}: {
  places: RefugePlace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selected: RefugePlace | null;
  onNavigate: (place: RefugePlace) => void;
  onClose: () => void;
  onBack: () => void;
}) {
  return (
    <div className="refuge-picker">
      <div className="refuge-picker-head">
        <div>
          <p className="eyebrow">Calm options nearby</p>
          <h2>Nearest refuges</h2>
        </div>
        <button type="button" className="btn btn-ghost picker-close" onClick={onClose}>
          Close
        </button>
      </div>

      {!selected ? (
        <ul className="refuge-picker-list">
          {places.map((p, index) => (
            <li key={p.id}>
              <button
                type="button"
                className={selectedId === p.id ? "is-selected" : undefined}
                onClick={() => onSelect(p.id)}
              >
                <span className="refuge-rank">{index + 1}</span>
                <span className="refuge-picker-copy">
                  <strong>{p.name}</strong>
                  <span>
                    {p.category || "Quiet space"}
                    {p.distanceMeters != null
                      ? ` · ${Math.round(p.distanceMeters)} m`
                      : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="refuge-picker-detail">
          <button
            type="button"
            className="btn btn-ghost picker-back"
            onClick={onBack}
          >
            ← Back to options
          </button>
          <RefugeDetail place={selected} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}
