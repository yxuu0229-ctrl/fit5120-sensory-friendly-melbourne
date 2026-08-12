export default function SensoryPreferences({
  threshold,
  onThreshold,
  preferCalmer,
  onPreferCalmer,
}: {
  threshold: number;
  onThreshold: (n: number) => void;
  preferCalmer: boolean;
  onPreferCalmer: (v: boolean) => void;
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
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={preferCalmer}
          onChange={(e) => onPreferCalmer(e.target.checked)}
        />
        Prefer calmer pedestrian corridors
      </label>
    </section>
  );
}
