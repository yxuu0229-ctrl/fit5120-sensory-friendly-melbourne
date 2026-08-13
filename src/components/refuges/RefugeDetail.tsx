import {
  classifyRefuge,
  REFUGE_KIND_META,
  walkMinutesFromMeters,
} from "../../lib/refugeCategories";
import type { RefugePlace } from "../../lib/types";

export default function RefugeDetail({
  place,
  onNavigate,
}: {
  place: RefugePlace | null;
  onNavigate?: (place: RefugePlace) => void;
}) {
  if (!place) {
    return <p className="muted">Select a calm place to see details.</p>;
  }
  const kind = classifyRefuge(place);
  const meta = REFUGE_KIND_META[kind];
  return (
    <article className="refuge-detail">
      <h3>{place.name}</h3>
      <dl>
        <div>
          <dt>Type</dt>
          <dd>{meta.label}</dd>
        </div>
        {place.theme ? (
          <div>
            <dt>Note</dt>
            <dd>{place.theme}</dd>
          </div>
        ) : place.category ? (
          <div>
            <dt>Category</dt>
            <dd>{place.category}</dd>
          </div>
        ) : null}
        {place.distanceMeters != null ? (
          <div>
            <dt>Reset time</dt>
            <dd>
              ~{walkMinutesFromMeters(place.distanceMeters)} min walk
              {" · "}
              {place.distanceMeters < 1000
                ? `${Math.round(place.distanceMeters)} m`
                : `${(place.distanceMeters / 1000).toFixed(1)} km`}
            </dd>
          </div>
        ) : null}
      </dl>
      {onNavigate ? (
        <button
          type="button"
          className="btn btn-primary refuge-nav-btn"
          onClick={() => onNavigate(place)}
        >
          Navigate to it
        </button>
      ) : null}
    </article>
  );
}
