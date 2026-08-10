function WarningPage({
  onKeepRoute,
  onSelectAlternative,
}: {
  onKeepRoute: () => void;
  onSelectAlternative: () => void;
}) {
  return (
    <main className="warning-page">
      <section className="intro warning-intro" aria-labelledby="warning-title">
        <h1 id="warning-title">Route exceeds your threshold</h1>
        <p>
          Explain the affected section and present a lower-stimulation alternative without
          changing the route automatically.
        </p>
      </section>

      <section className="warning-layout">
        <section className="threshold-warning-card" aria-labelledby="threshold-warning-title">
          <div className="warning-icon" aria-hidden="true">!</div>
          <div>
            <h2 id="threshold-warning-title">Route B exceeds your crowd threshold</h2>
            <dl className="warning-details">
              <div>
                <dt>Location</dt>
                <dd>Swanston Street</dd>
              </div>
              <div>
                <dt>Expected</dt>
                <dd>5:20-5:55 PM</dd>
              </div>
              <div>
                <dt>Impact</dt>
                <dd>High crowd density</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="alternative-panel" aria-labelledby="alternative-title">
          <h2 id="alternative-title">Lower-stimulation alternative</h2>
          <article className="route-card route-card-selected alternative-route-card">
            <div className="route-card-header">
              <span className="sensory-dot sensory-low">Low</span>
              <h3>Route A via Flagstaff Station</h3>
              <span className="sensory-pill sensory-pill-low">Low sensory</span>
            </div>
            <div className="route-metrics">
              <div><span>Congestion</span><strong>Low</strong></div>
              <div><span>Time</span><strong>31m</strong></div>
              <div><span>Walk</span><strong>480m</strong></div>
              <div><span>PT access</span><strong>Train</strong></div>
            </div>
            <p className="alternative-factors">
              Factors: lower pedestrian volume, no nearby events, no construction
            </p>
          </article>
          <p className="alternative-copy">
            Route A is 7 minutes longer and 260 m more walking, but avoids the affected
            corridor.
          </p>
          <div className="alternative-actions">
            <button className="secondary-button" onClick={onKeepRoute} type="button">
              Keep current route
            </button>
            <button onClick={onSelectAlternative} type="button">Select alternative</button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default WarningPage;
