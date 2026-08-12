import { useId } from "react";

export default function SensoryPreferences({
  threshold,
  onThreshold,
  preferCalmer,
  onPreferCalmer,
  showLowSensors,
  onShowLowSensors,
  sensorCount,
  muted,
  onToggleMute,
}: {
  threshold: number;
  onThreshold: (n: number) => void;
  preferCalmer: boolean;
  onPreferCalmer: (v: boolean) => void;
  showLowSensors: boolean;
  onShowLowSensors: (v: boolean) => void;
  sensorCount?: number | null;
  muted?: boolean;
  onToggleMute?: () => void;
}) {
  const sliderId = useId();
  const soundId = useId();
  const calmId = useId();
  const sensorId = useId();

  return (
    <section className="panel-block">
      <h2>Sensory preferences</h2>
      <div className="field">
        <label htmlFor={sliderId}>Crowd density threshold ({threshold})</label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          value={threshold}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={threshold}
          onChange={(e) => onThreshold(Number(e.target.value))}
        />
        <span className="field-hint">
          Routes with load above {threshold} show as High, above{" "}
          {Math.round(threshold / 2)} as Medium. Routes that run through busy
          sensor areas are flagged even when their average load is lower. Move
          the slider to update badges instantly.
        </span>
      </div>
      {onToggleMute != null ? (
        <label className="check-row" htmlFor={soundId}>
          <input
            id={soundId}
            type="checkbox"
            checked={Boolean(muted)}
            onChange={onToggleMute}
          />
          Mute map audio chimes & sound effects
        </label>
      ) : null}
      <label className="check-row" htmlFor={calmId}>
        <input
          id={calmId}
          type="checkbox"
          checked={preferCalmer}
          onChange={(e) => onPreferCalmer(e.target.checked)}
        />
        Prefer calmer pedestrian corridors
      </label>
      <label className="check-row" htmlFor={sensorId}>
        <input
          id={sensorId}
          type="checkbox"
          checked={showLowSensors}
          onChange={(e) => onShowLowSensors(e.target.checked)}
        />
        Show low-crowd sensors on map
      </label>
      {sensorCount != null ? (
        <p className="sensor-count-note">
          {showLowSensors
            ? `Showing all ${sensorCount} sensors on the map.`
            : `Hiding low sensors — map shows Medium/High only (scoring still uses all ${sensorCount}).`}
        </p>
      ) : null}
    </section>
  );
}

