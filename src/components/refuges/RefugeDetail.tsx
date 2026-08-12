import type { RefugePlace } from "../../lib/types";

export default function RefugeDetail({
  place,
  onNavigate,
}: {
  place: RefugePlace | null;
  onNavigate?: (place: RefugePlace) => void;
}) {
  if (!place) {
    return <p className="muted">Select a refuge to see details.</p>;
  }
  return (
    <article className="refuge-detail">
      <h3>{place.name}</h3>
      <dl>
        <div>
          <dt>Type</dt>
          <dd>{place.category || place.theme || "Quiet public space"}</dd>
        </div>
        {place.distanceMeters != null ? (
          <div>
            <dt>Distance</dt>
            <dd>
              {place.distanceMeters < 1000
                ? `${Math.round(place.distanceMeters)} m`
                : `${(place.distanceMeters / 1000).toFixed(1)} km`}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Location</dt>
          <dd>
            {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
          </dd>
        </div>
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
