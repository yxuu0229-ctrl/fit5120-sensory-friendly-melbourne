import type { RefugePlace } from "../../lib/types";
import GoButton from "./GoButton";
import NearestRefugeButton from "./NearestRefugeButton";

export default function NavDock({
  navigating,
  progress,
  canGo,
  canRefuge,
  destinationLabel,
  onGoNearest,
  onGo,
  onStop,
}: {
  navigating: boolean;
  progress: number;
  canGo: boolean;
  canRefuge: boolean;
  destinationLabel: string | null;
  pickerOpen?: boolean;
  topRefuges?: RefugePlace[];
  selectedRefugeId?: string | null;
  selectedRefuge?: RefugePlace | null;
  onTogglePicker?: () => void;
  onSelectRefuge?: (id: string) => void;
  onNavigateRefuge?: (place: RefugePlace) => void;
  onGoNearest: () => void;
  onClosePicker?: () => void;
  onGo: () => void;
  onStop: () => void;
}) {
  return (
    <div className={`nav-dock${navigating ? " is-navigating" : ""}`}>
      {navigating ? (
        <div className="nav-dock-active">
          <div className="nav-dock-status">
            <p className="eyebrow">Active navigation</p>
            <strong>{destinationLabel || "Following your route"}</strong>
            <span>Progress {progress}%</span>
          </div>
          <div className="nav-dock-active-actions">
            <NearestRefugeButton
              disabled={!canRefuge}
              active={false}
              compact
              onClick={onGoNearest}
            />
            <button type="button" className="btn btn-stop" onClick={onStop}>
              Stop navigation
            </button>
          </div>
        </div>
      ) : (
        <div className="nav-dock-actions">
          <NearestRefugeButton
            disabled={!canRefuge}
            onClick={onGoNearest}
          />
          <GoButton
            disabled={!canGo}
            navigating={false}
            progress={0}
            onGo={onGo}
            onStop={onStop}
          />
        </div>
      )}
    </div>
  );
}
