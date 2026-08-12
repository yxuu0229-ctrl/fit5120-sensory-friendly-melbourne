import LocationSearch from "../search/LocationSearch";
import SensoryPreferences from "../preferences/SensoryPreferences";
import ModeSwitcher from "./ModeSwitcher";
import type { PlaceResult } from "../../lib/types";
import type { TransportMode } from "../../lib/transportModes";

export default function PlanBlock(props: {
  originText: string;
  destText: string;
  setOriginText: (v: string) => void;
  setDestText: (v: string) => void;
  setOrigin: (p: PlaceResult) => void;
  setDest: (p: PlaceResult) => void;
  mode: TransportMode;
  onModeChange: (m: TransportMode) => void;
  threshold: number;
  setThreshold: (n: number) => void;
  preferCalmer: boolean;
  setPreferCalmer: (v: boolean) => void;
  showLowSensors: boolean;
  setShowLowSensors: (v: boolean) => void;
  planning: boolean;
  onPlan: () => void;
  onLocate: () => void;
}) {
  return (
    <div className="plan-block">
      <ModeSwitcher mode={props.mode} onChange={props.onModeChange} />
      <LocationSearch
        label="Origin"
        value={props.originText}
        onChange={props.setOriginText}
        onResolved={props.setOrigin}
      />
      <LocationSearch
        label="Destination"
        value={props.destText}
        onChange={props.setDestText}
        onResolved={props.setDest}
      />
      <div className="row-actions">
        <button type="button" className="btn btn-ghost" onClick={props.onLocate}>
          Use my location
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={props.planning}
          onClick={props.onPlan}
        >
          {props.planning ? "Planning…" : "Plan"}
        </button>
      </div>
      <p className="coverage-hint">
        Pedestrian sensors are from the City of Melbourne open network (~134
        sites around the city centre / inner CBD). There is no public sensor
        API covering all of Greater Melbourne suburbs.
      </p>
      <SensoryPreferences
        threshold={props.threshold}
        onThreshold={props.setThreshold}
        preferCalmer={props.preferCalmer}
        onPreferCalmer={props.setPreferCalmer}
        showLowSensors={props.showLowSensors}
        onShowLowSensors={props.setShowLowSensors}
      />
    </div>
  );
}
