import type { SupportLayerId } from "../../lib/refugeCategories";

const CORE: Array<{ id: SupportLayerId; label: string }> = [
  { id: "refuges", label: "Calm refuges" },
  { id: "resetRings", label: "Reset rings" },
  { id: "riskZones", label: "Sensory risks" },
  { id: "forecast", label: "Next-hour heat" },
];

const SUPPORT: Array<{ id: SupportLayerId; label: string }> = [
  { id: "bathroom", label: "Bathrooms" },
  { id: "water", label: "Water" },
  { id: "seating", label: "Seating" },
  { id: "pharmacy", label: "Pharmacies" },
  { id: "medical", label: "Medical" },
  { id: "landmark", label: "Landmarks" },
];

export default function LayerControls({
  layers,
  onToggle,
}: {
  layers: Record<SupportLayerId, boolean>;
  onToggle: (id: SupportLayerId) => void;
}) {
  return (
    <section className="layer-controls" aria-label="Map layers">
      <p className="eyebrow">Map layers</p>
      <div className="layer-chip-row">
        {CORE.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`layer-chip${layers[item.id] ? " is-on" : ""}`}
            aria-pressed={layers[item.id]}
            onClick={() => onToggle(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="layer-subhint">Support (off by default)</p>
      <div className="layer-chip-row">
        {SUPPORT.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`layer-chip layer-chip-soft${layers[item.id] ? " is-on" : ""}`}
            aria-pressed={layers[item.id]}
            onClick={() => onToggle(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
