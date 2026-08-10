import { ChillIcon, HeatIcon, NavigateIcon } from "../Icons";
import type { HomeMapMode } from "./shared";

interface ModeSwitcherProps {
  activeMode: HomeMapMode;
  onSelectMode: (mode: HomeMapMode) => void;
}

// Liquid Glass Bottom Switcher
export default function ModeSwitcher({ activeMode, onSelectMode }: ModeSwitcherProps) {
  return (
    <div className="glass-pill-container">
      <button
        className={`mode-btn ${activeMode === "chill" ? "active chill-active" : ""}`}
        onClick={() => onSelectMode("chill")}
        type="button"
      >
        <ChillIcon fill={activeMode === "chill" ? "#3EBFFF" : "#111111"} size={22} />
        {activeMode === "chill" && <span className="mode-text">Chill Mode</span>}
      </button>

      <button
        className={`mode-btn ${activeMode === "heat" ? "active heat-active" : ""}`}
        onClick={() => onSelectMode("heat")}
        type="button"
      >
        <HeatIcon fill={activeMode === "heat" ? "#FF7B00" : "#111111"} size={22} />
        {activeMode === "heat" && <span className="mode-text">Heat Zones</span>}
      </button>

      <button
        className={`mode-btn ${activeMode === "navigate" ? "active navigate-active" : ""}`}
        onClick={() => onSelectMode("navigate")}
        type="button"
      >
        <NavigateIcon fill={activeMode === "navigate" ? "#155724" : "#111111"} size={22} />
        {activeMode === "navigate" && <span className="mode-text">Navigate</span>}
      </button>
    </div>
  );
}
