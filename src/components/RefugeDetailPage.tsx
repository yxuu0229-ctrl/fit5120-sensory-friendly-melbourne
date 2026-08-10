import type { RefugeView } from "../lib/refuge";

function RefugeDetailPage({
  refuge,
  onBackToJourney,
  onOptionalDirections,
}: {
  refuge: RefugeView;
  onBackToJourney: () => void;
  onOptionalDirections: () => void;
}) {
  return (
    <main className="refuge-detail-page">
      <section className="intro refuge-detail-intro" aria-labelledby="refuge-detail-title">
        <h1 id="refuge-detail-title">{refuge.name}</h1>
        <p>View basic refuge information and return to the active journey when ready.</p>
      </section>

      <section className="refuge-detail-layout">
        <img
          alt={refuge.name}
          className="refuge-detail-image"
          src={refuge.imageUrl}
        />

        <section className="refuge-detail-panel" aria-labelledby="refuge-panel-title">
          <div className="refuge-detail-heading">
            <span className="library-icon" aria-hidden="true" />
            <h2 id="refuge-panel-title">{refuge.name}</h2>
          </div>
          <dl>
            <div>
              <dt>Type</dt>
              <dd>{refuge.kind}</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>{refuge.distanceText}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{refuge.source}</dd>
            </div>
            <div>
              <dt>Quietness data</dt>
              <dd>{refuge.quietness}</dd>
            </div>
            <div>
              <dt>Note</dt>
              <dd>{refuge.note}</dd>
            </div>
          </dl>
          <div className="refuge-detail-actions">
            <button onClick={onBackToJourney} type="button">Back to journey</button>
            <button className="secondary-button" onClick={onOptionalDirections} type="button">
              Optional directions
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default RefugeDetailPage;
