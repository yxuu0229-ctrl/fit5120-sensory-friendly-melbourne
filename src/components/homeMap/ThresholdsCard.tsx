import { CrowdIcon, SoundIcon } from "../Icons";

export type ThresholdField = "none" | "sound" | "crowd";

interface ThresholdRowProps {
  icon: React.ReactNode;
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  editing: boolean;
  onChange: (value: number) => void;
  onStartEdit: () => void;
}

function ThresholdRow({ icon, label, unit, min, max, value, editing, onChange, onStartEdit }: ThresholdRowProps) {
  if (editing) {
    return (
      <div className="heat-threshold-row edit-mode">
        {icon}
        <div className="custom-slider-container">
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="custom-range-input"
            autoFocus
          />
          <div className="custom-slider-track"></div>
          <div
            className="custom-slider-thumb"
            style={{ left: `calc(${((value - min) / (max - min)) * 100}% - 12px)` }}
          >
            {value}
          </div>
        </div>
        <span className="unit-label">{unit}</span>
      </div>
    );
  }

  return (
    <div className="heat-threshold-row view-mode" onClick={onStartEdit}>
      {icon}
      <span className="heat-threshold-text">{label}: {value}{unit}</span>
    </div>
  );
}

interface ThresholdsCardProps {
  soundThreshold: number;
  crowdThreshold: number;
  editingField: ThresholdField;
  onEditField: (field: ThresholdField) => void;
  onSoundThresholdChange: (value: number) => void;
  onCrowdThresholdChange: (value: number) => void;
}

export default function ThresholdsCard({
  soundThreshold,
  crowdThreshold,
  editingField,
  onEditField,
  onSoundThresholdChange,
  onCrowdThresholdChange,
}: ThresholdsCardProps) {
  return (
    <div className="thresholds-card-overlay">
      <ThresholdRow
        icon={<SoundIcon size={20} fill="#111111" />}
        label="Sound Levels"
        unit="db"
        min={30}
        max={90}
        value={soundThreshold}
        editing={editingField === "sound"}
        onChange={onSoundThresholdChange}
        onStartEdit={() => onEditField("sound")}
      />
      <ThresholdRow
        icon={<CrowdIcon size={20} fill="#111111" />}
        label="Crowd Strength"
        unit="p"
        min={10}
        max={150}
        value={crowdThreshold}
        editing={editingField === "crowd"}
        onChange={onCrowdThresholdChange}
        onStartEdit={() => onEditField("crowd")}
      />
    </div>
  );
}
