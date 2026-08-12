import type { ReactNode, TouchEvent } from "react";
import NextHourAlert from "../alerts/NextHourAlert";
import PlanBlock from "../plan/PlanBlock";
import RefugeList from "../refuges/RefugeList";
import AlternativeBanner from "../routes/AlternativeBanner";
import TopRoutesList from "../routes/TopRoutesList";
import type { PlaceResult, QuietAlert, RefugePlace, RouteOption } from "../../lib/types";
import type { TransportMode } from "../../lib/transportModes";

type Sheet = "plan" | "routes" | "places";

type PlanProps = {
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
  sensorCount?: number | null;
  planning: boolean;
  onPlan: () => void;
  onLocate: () => void;
  muted?: boolean;
  onToggleMute?: () => void;
};

function keepSheetScroll(e: TouchEvent) {
  e.stopPropagation();
}

export default function MapPanels({
  planProps,
  routes,
  selectedId,
  onSelectRoute,
  selected,
  alternative,
  onTakeAlternative,
  alert,
  refuges,
  selectedRefugeId,
  onSelectRefuge,
  selectedRefuge,
  onNavigateRefuge,
  sheet,
  setSheet,
  toast,
  hidden = false,
  onGo,
  sensorCount,
  onFocusLocation,
}: {
  planProps: PlanProps;
  routes: RouteOption[];
  selectedId: string | null;
  onSelectRoute: (id: string) => void;
  selected: RouteOption | null;
  alternative: RouteOption | null;
  onTakeAlternative: () => void;
  alert: QuietAlert | null;
  refuges: RefugePlace[];
  selectedRefugeId: string | null;
  onSelectRefuge: (id: string) => void;
  selectedRefuge: RefugePlace | null;
  onNavigateRefuge: (place: RefugePlace) => void;
  sheet: Sheet;
  setSheet: (s: Sheet) => void;
  toast: ReactNode;
  hidden?: boolean;
  onGo?: () => void;
  sensorCount?: number | null;
  onFocusLocation?: (point: { lat: number; lng: number }, locationId?: number) => void;
}) {
  if (hidden) {
    return <>{toast}</>;
  }

  const routesBlock = (
    <>
      <TopRoutesList
        routes={routes}
        selectedId={selectedId}
        onSelect={onSelectRoute}
        onGo={onGo}
        canGo={Boolean(selected)}
      />
      <AlternativeBanner
        selected={selected}
        alternative={alternative}
        onTake={onTakeAlternative}
      />
    </>
  );
  const placesBlock = (
    <>
      <NextHourAlert alert={alert} onFocusLocation={onFocusLocation} />
      <h2>Nearby refuges</h2>
      <RefugeList
        places={refuges}
        selectedId={selectedRefugeId}
        onSelect={onSelectRefuge}
      />
      <div className="legend-group">
        <p className="legend">
          <span className="legend-item"><span className="dot sensor-low" /> Low</span>
          <span className="legend-item"><span className="dot sensor-med" /> Medium</span>
          <span className="legend-item"><span className="dot sensor-high" /> High crowd</span>
        </p>
        <p className="legend">
          <span className="legend-item"><span className="legend-pin" aria-hidden="true">😇</span> Refuge</span>
          <span className="legend-item"><span className="dot you" /> You</span>
        </p>
      </div>
    </>
  );

  return (
    <>
      <aside className="rail rail-left desktop-only">
        <PlanBlock {...planProps} />
        {routesBlock}
      </aside>
      <aside className="rail rail-right desktop-only">{placesBlock}</aside>
      <div
        className="mobile-sheet mobile-only"
        onTouchStart={keepSheetScroll}
        onTouchMove={keepSheetScroll}
      >
        <div className="sheet-tabs">
          {(["plan", "routes", "places"] as Sheet[]).map((id) => (
            <button
              key={id}
              type="button"
              className={sheet === id ? "is-active" : undefined}
              onClick={() => setSheet(id)}
            >
              {id}
            </button>
          ))}
        </div>
        <div className="mobile-sheet-body">
          {sheet === "plan" && <PlanBlock {...planProps} />}
          {sheet === "routes" && routesBlock}
          {sheet === "places" && placesBlock}
        </div>
      </div>
      {toast}
    </>
  );
}
