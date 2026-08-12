export default function MapLegend() {
  return (
    <section className="map-legend" aria-label="Map legend">
      <p className="eyebrow">Map legend</p>
      <div className="map-legend-items">
        <span className="map-legend-item">
          <span className="area-swatch sensor-low" aria-hidden="true" />
          Low crowd zone
        </span>
        <span className="map-legend-item">
          <span className="area-swatch sensor-med" aria-hidden="true" />
          Medium crowd zone
        </span>
        <span className="map-legend-item">
          <span className="area-swatch sensor-high" aria-hidden="true" />
          High crowd zone
        </span>
        <span className="map-legend-item">
          <span className="legend-pin" aria-hidden="true" />
          Refuge
        </span>
        <span className="map-legend-item">
          <span className="dot you" aria-hidden="true" />
          You
        </span>
      </div>
    </section>
  );
}
