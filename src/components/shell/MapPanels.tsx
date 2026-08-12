import type { ReactNode } from "react";
import NextHourAlert from "../alerts/NextHourAlert";
import PlanBlock from "../plan/PlanBlock";
import RefugeDetail from "../refuges/RefugeDetail";
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
  planning: boolean;
  onPlan: () => void;
  onLocate: () => void;
};

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
}) {
  const routesBlock = (
    <>
      <TopRoutesList
        routes={routes}
        selectedId={selectedId}
        onSelect={onSelectRoute}
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
      <NextHourAlert alert={alert} />
      <h2>Nearby refuges</h2>
      <RefugeList
        places={refuges}
        selectedId={selectedRefugeId}
        onSelect={onSelectRefuge}
      />
      <RefugeDetail place={selectedRefuge} onNavigate={onNavigateRefuge} />
      <p className="legend">
        <span className="dot overload" /> Overload{" "}
        <span className="dot refuge" /> Refuge <span className="dot you" /> You
      </p>
    </>
  );

  return (
    <>
      <aside className="rail rail-left desktop-only">
        <PlanBlock {...planProps} />
        {routesBlock}
      </aside>
      <aside className="rail rail-right desktop-only">{placesBlock}</aside>
      <div className="mobile-sheet mobile-only">
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
        {sheet === "plan" && <PlanBlock {...planProps} />}
        {sheet === "routes" && routesBlock}
        {sheet === "places" && placesBlock}
      </div>
      {toast}
    </>
  );
}
