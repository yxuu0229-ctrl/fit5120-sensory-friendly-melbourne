export default function SensoryPreferences({
  threshold,
  onThreshold,
  preferCalmer,
  onPreferCalmer,
  showLowSensors,
  onShowLowSensors,
}: {
  threshold: number;
  onThreshold: (n: number) => void;
  preferCalmer: boolean;
  onPreferCalmer: (v: boolean) => void;
  showLowSensors: boolean;
  onShowLowSensors: (v: boolean) => void;
}) {
  return (
    <section className="panel-block">
      <h2>Sensory preferences</h2>
      <label className="field">
        <span>Crowd density threshold ({threshold})</span>
        <input
          type="range"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => onThreshold(Number(e.target.value))}
        />
        <span className="field-hint">
          Zones along your route turn High/Medium/Low against this limit
          ({threshold}). Move the slider to recolour them instantly.
        </span>
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={preferCalmer}
          onChange={(e) => onPreferCalmer(e.target.checked)}
        />
        Prefer calmer pedestrian corridors
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={showLowSensors}
          onChange={(e) => onShowLowSensors(e.target.checked)}
        />
        Show low-crowd areas on map
      </label>
    </section>
  );
}
