import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentPosition } from "../api/geolocation";
import { reverseGeocode } from "../api/nominatim";
import { fetchOsrmTo } from "../api/osrm";
import { overloadSensors } from "../api/sensors";
import DataUpdatedTag from "../components/DataUpdatedTag";
import EndpointMarkers from "../components/map/EndpointMarkers";
import MapCanvas from "../components/map/MapCanvas";
import MapFitBounds from "../components/map/MapFitBounds";
import OverloadLayer from "../components/map/OverloadLayer";
import RefugeMarkers from "../components/map/RefugeMarkers";
import RouteLayer from "../components/map/RouteLayer";
import UserLocationMarker from "../components/map/UserLocationMarker";
import GoButton from "../components/nav/GoButton";
import NearestRefugeButton from "../components/nav/NearestRefugeButton";
import MapPanels from "../components/shell/MapPanels";
import { useLiveNavigation } from "../hooks/useLiveNavigation";
import { useMapData } from "../hooks/useMapData";
import { coverageMessage } from "../lib/coverage";
import { CBD_CENTER } from "../lib/densityBands";
import { bearingAlongPath } from "../lib/geo";
import { nearestRefuge, sortRefugesByDistance } from "../lib/nearestRefuge";
import {
  playGoChime,
  playMapWelcome,
  playModeSound,
} from "../lib/soothingSound";
import { planTopRoutes } from "../lib/topRoutes";
import type { TransportMode } from "../lib/transportModes";
import type { PlaceResult, RefugePlace, RouteOption } from "../lib/types";

type Sheet = "plan" | "routes" | "places";

export default function MapPage() {
  const data = useMapData();
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [dest, setDest] = useState<PlaceResult | null>(null);
  const [threshold, setThreshold] = useState(50);
  const [preferCalmer, setPreferCalmer] = useState(true);
  const [mode, setMode] = useState<TransportMode>("walk");
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRefugeId, setSelectedRefugeId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [sheet, setSheet] = useState<Sheet>("plan");
  const [planning, setPlanning] = useState(false);

  const selected = routes.find((r) => r.id === selectedId) ?? null;
  const alternative =
    routes.find((r) => r.recommended && r.id !== selectedId) ??
    routes.find((r) => r.indicator === "Low" && r.id !== selectedId) ??
    null;
  const live = useLiveNavigation(navigating, selected);
  const overloads = useMemo(
    () => overloadSensors(data.sensors),
    [data.sensors]
  );
  const anchor = live.userPoint ?? origin?.point ?? dest?.point ?? CBD_CENTER;
  const sortedRefuges = useMemo(
    () => sortRefugesByDistance(anchor, data.refuges),
    [anchor, data.refuges]
  );
  const selectedRefuge =
    sortedRefuges.find((r) => r.id === selectedRefugeId) ?? null;

  const navPoint = navigating
    ? live.userPoint ?? origin?.point ?? null
    : live.userPoint;
  const navBearing = useMemo(() => {
    if (!navigating || !navPoint || !selected?.positions.length) return 0;
    return bearingAlongPath(navPoint, selected.positions) ?? 0;
  }, [navigating, navPoint, selected]);

  useEffect(() => {
    let cancelled = false;
    let played = false;
    let inflight = false;

    async function welcome() {
      if (played || cancelled || inflight) return;
      inflight = true;
      const ok = await playMapWelcome();
      if (ok) played = true;
      inflight = false;
    }

    void welcome();

    const unlock = () => {
      void welcome();
    };
    window.addEventListener("pointerdown", unlock, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  async function runPlan(nextMode: TransportMode = mode) {
    if (!origin?.point || !dest?.point) {
      data.setError(
        "Choose an origin and destination from search (or press Enter)."
      );
      return;
    }
    setPlanning(true);
    data.setError("");
    data.setNotice(coverageMessage(origin.point, dest.point));
    try {
      let top = await planTopRoutes(
        origin.point,
        dest.point,
        data.sensors,
        threshold,
        nextMode
      );
      if (!preferCalmer) {
        top = [...top]
          .sort(
            (a, b) =>
              a.durationSeconds - b.durationSeconds ||
              a.sensoryLoad - b.sensoryLoad
          )
          .map((r, i) => ({ ...r, rank: i + 1, recommended: i === 0 }));
      }
      setRoutes(top);
      setSelectedId(top[0]?.id ?? null);
      setSheet("routes");
      if (!top.length) {
        data.setError(`No ${nextMode} routes returned. Try another mode.`);
      }
    } catch (e) {
      data.setError(e instanceof Error ? e.message : "Planning failed");
    } finally {
      setPlanning(false);
    }
  }

  function changeMode(next: TransportMode) {
    if (next === mode && !planning) {
      void playModeSound(next);
      if (origin?.point && dest?.point) void runPlan(next);
      return;
    }
    setMode(next);
    void playModeSound(next);
    if (origin?.point && dest?.point) {
      void runPlan(next);
    }
  }

  async function useMyLocation() {
    try {
      const point = await getCurrentPosition();
      live.setUserPoint(point);
      const label = await reverseGeocode(point);
      setOrigin({ label, point });
      setOriginText(label);
    } catch {
      data.setError("Location permission is required for live navigation.");
    }
  }

  async function navigateToRefuge(target: RefugePlace) {
    const from = live.userPoint ?? origin?.point;
    if (!from) {
      data.setError("Set your location first (Use my location or Origin).");
      return;
    }
    setSelectedRefugeId(target.id);
    try {
      const trip = await fetchOsrmTo(
        from,
        {
          lat: target.latitude,
          lng: target.longitude,
        },
        mode === "transit" ? "walk" : mode
      );
      if (!trip) throw new Error("Could not route to refuge");
      const option: RouteOption = {
        id: "refuge-nav",
        rank: 1,
        label: `To ${target.name}`,
        recommended: true,
        sensoryLoad: 0,
        indicator: "Low",
        distanceMeters: trip.distanceMeters,
        durationSeconds: trip.durationSeconds,
        positions: trip.coordinates.map(([lng, lat]) => [lat, lng]),
      };
      setRoutes([option]);
      setSelectedId(option.id);
      setNavigating(true);
      setSheet("routes");
      void playGoChime();
    } catch (e) {
      data.setError(e instanceof Error ? e.message : "Refuge routing failed");
    }
  }

  async function goNearestRefuge() {
    const from = live.userPoint ?? origin?.point;
    if (!from) {
      data.setError("Set your location first.");
      return;
    }
    const target = nearestRefuge(from, data.refuges);
    if (!target) {
      data.setError("No refuge places available.");
      return;
    }
    await navigateToRefuge(target);
  }

  async function startGo() {
    void playGoChime();
    await useMyLocation();
    setNavigating(true);
  }

  const path =
    navigating && live.remaining.length > 1
      ? live.remaining
      : (selected?.positions ?? []);

  const fitPaths = routes.map((r) => r.positions);

  return (
    <div className="map-app">
      <MapCanvas follow={navigating} followPoint={navPoint}>
        <MapFitBounds
          enabled={!navigating}
          points={[origin?.point, dest?.point, live.userPoint]}
          paths={fitPaths}
        />
        <OverloadLayer sensors={overloads} />
        <RefugeMarkers
          places={sortedRefuges}
          selectedId={selectedRefugeId}
          onSelect={setSelectedRefugeId}
          onNavigate={(place) => void navigateToRefuge(place)}
        />
        <EndpointMarkers
          origin={origin?.point ?? null}
          destination={dest?.point ?? null}
          hideOrigin={navigating}
        />
        {routes.map((r) =>
          r.id === selectedId ? null : (
            <RouteLayer
              key={r.id}
              path={r.positions}
              segments={r.segments}
              style="muted"
            />
          )
        )}
        <RouteLayer
          path={path}
          segments={
            navigating
              ? undefined
              : selected?.segments
          }
          style={navigating ? "navigating" : "selected"}
        />
        {navigating && selected?.segments?.length ? (
          <RouteLayer
            path={selected.positions}
            segments={selected.segments}
            style="selected"
          />
        ) : null}        <UserLocationMarker
          point={navPoint}
          navigating={navigating}
          bearing={navBearing}
        />
      </MapCanvas>

      <header className="map-topbar">
        <Link to="/" className="brand-link">
          Relax Maps
        </Link>
        <div className="top-actions">
          <NearestRefugeButton
            disabled={!data.refuges.length}
            onClick={() => void goNearestRefuge()}
          />
          <GoButton
            disabled={!selected}
            navigating={navigating}
            progress={live.progress}
            onGo={() => void startGo()}
            onStop={() => setNavigating(false)}
          />
        </div>
      </header>

      <DataUpdatedTag label={data.dataUpdatedLabel} />

      <MapPanels
        planProps={{
          originText,
          destText,
          setOriginText,
          setDestText,
          setOrigin,
          setDest,
          mode,
          onModeChange: changeMode,
          threshold,
          setThreshold,
          preferCalmer,
          setPreferCalmer,
          planning,
          onPlan: () => void runPlan(mode),
          onLocate: () => void useMyLocation(),
        }}
        routes={routes}
        selectedId={selectedId}
        onSelectRoute={setSelectedId}
        selected={selected}
        alternative={alternative}
        onTakeAlternative={() => alternative && setSelectedId(alternative.id)}
        alert={data.alert}
        refuges={sortedRefuges}
        selectedRefugeId={selectedRefugeId}
        onSelectRefuge={setSelectedRefugeId}
        selectedRefuge={selectedRefuge}
        onNavigateRefuge={(place) => void navigateToRefuge(place)}
        sheet={sheet}
        setSheet={setSheet}
        toast={
          data.error || data.notice ? (
            <div className="toast">
              {data.error || data.notice}
              {data.error ? (
                <button type="button" onClick={() => data.setError("")}>
                  Dismiss
                </button>
              ) : null}
            </div>
          ) : null
        }
      />
    </div>
  );
}
