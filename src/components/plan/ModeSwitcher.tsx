import {
  TRANSPORT_MODES,
  type TransportMode,
} from "../../lib/transportModes";

export default function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: TransportMode;
  onChange: (mode: TransportMode) => void;
}) {
  return (
    <div className="mode-switch" role="tablist" aria-label="Transport mode">
      {TRANSPORT_MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          className={mode === item.id ? "is-active" : undefined}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
