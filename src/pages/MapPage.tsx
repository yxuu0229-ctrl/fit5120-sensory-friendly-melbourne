import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentPosition } from "../api/geolocation";
import { reverseGeocode } from "../api/nominatim";
import { fetchOsrmTo } from "../api/osrm";
import DataUpdatedTag from "../components/DataUpdatedTag";
import EndpointMarkers from "../components/map/EndpointMarkers";
import MapCanvas from "../components/map/MapCanvas";
import MapFitBounds from "../components/map/MapFitBounds";
import RefugeMarkers from "../components/map/RefugeMarkers";
import RouteLayer from "../components/map/RouteLayer";
import SensorLayer from "../components/map/SensorLayer";
import TransitModeKey from "../components/map/TransitModeKey";
import UserLocationMarker from "../components/map/UserLocationMarker";
import OnboardingTips from "../components/onboarding/OnboardingTips";
import NavDock from "../components/nav/NavDock";
import ActiveRouteBar from "../components/nav/ActiveRouteBar";
import MapPanels from "../components/shell/MapPanels";
import { useLiveNavigation } from "../hooks/useLiveNavigation";
import { useMapData } from "../hooks/useMapData";
import { coverageMessage } from "../lib/coverage";
import { CBD_CENTER } from "../lib/densityBands";
import { bearingAlongPath } from "../lib/geo";
import { nearestRefuge, sortRefugesByDistance } from "../lib/nearestRefuge";
import { sensorsAlongPath } from "../lib/sensorsAlongRoute";
import { indicatorForLoad } from "../lib/sensoryIndicator";
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
  const [showLowSensors, setShowLowSensors] = useState(false);
  const [mode, setMode] = useState<TransportMode>("walk");
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRefugeId, setSelectedRefugeId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [sheet, setSheet] = useState<Sheet>("plan");
  const [planning, setPlanning] = useState(false);
  const [refugePickerOpen, setRefugePickerOpen] = useState(false);

  const selected = routes.find((r) => r.id === selectedId) ?? null;
  const alternative =
    routes.find((r) => r.recommended && r.id !== selectedId) ??
    routes.find((r) => r.indicator === "Low" && r.id !== selectedId) ??
    null;
  const live = useLiveNavigation(navigating, selected);
  const anchor = live.userPoint ?? origin?.point ?? dest?.point ?? CBD_CENTER;
  const sortedRefuges = useMemo(
    () => sortRefugesByDistance(anchor, data.refuges),
    [anchor, data.refuges]
  );
  const topRefuges = useMemo(() => sortedRefuges.slice(0, 3), [sortedRefuges]);
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

  // Keep High/Low badges in sync when the threshold slider moves.
  useEffect(() => {
    setRoutes((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.map((route) => {
        const indicator = indicatorForLoad(route.sensoryLoad, threshold);
        if (indicator === route.indicator) return route;
        changed = true;
        return { ...route, indicator };
      });
      return changed ? next : prev;
    });
  }, [threshold]);

  // Coverage / info toasts clear automatically after a few seconds.
  useEffect(() => {
    if (!data.notice) return;
    const timer = window.setTimeout(() => data.setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [data.notice, data.setNotice]);

  async function runPlan(nextMode: TransportMode = mode) {
    if (!origin?.point || !dest?.point) {
      data.setError(
        "Choose a start location and destination from search (or press Enter)."
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
    let from = live.userPoint ?? origin?.point;
    if (!from) {
      try {
        from = await getCurrentPosition();
        live.setUserPoint(from);
      } catch {
        data.setError("Set your location first (Use my location or Start Location).");
        return;
      }
    }
    setSelectedRefugeId(target.id);
    setRefugePickerOpen(false);
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
        mode: mode === "transit" ? "walk" : mode,
      };
      setRoutes([option]);
      setSelectedId(option.id);
      setDest({
        label: target.name,
        point: { lat: target.latitude, lng: target.longitude },
      });
      setDestText(target.name);
      setNavigating(true);
      void playGoChime();
    } catch (e) {
      data.setError(e instanceof Error ? e.message : "Refuge routing failed");
    }
  }

  async function goNearestRefuge() {
    const from = live.userPoint ?? origin?.point;
    if (!from) {
      try {
        const point = await getCurrentPosition();
        live.setUserPoint(point);
        const target = nearestRefuge(point, data.refuges);
        if (!target) {
          data.setError("No refuge places available.");
          return;
        }
        await navigateToRefuge(target);
      } catch {
        data.setError("Set your location first.");
      }
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
    if (!selected) {
      data.setError("Plan a route first, then press Go.");
      return;
    }
    void playGoChime();
    setRefugePickerOpen(false);
    await useMyLocation();
    setNavigating(true);
  }

  function stopNavigation() {
    setNavigating(false);
  }

  const routePathPts = useMemo(() => {
    if (navigating && live.remaining.length > 1) return live.remaining;
    return selected?.positions ?? [];
  }, [navigating, live.remaining, selected?.positions]);

  /** Every crowd zone that intersects the selected route corridor. */
  const routeSensors = useMemo(() => {
    if (!routePathPts.length) return [];
    return sensorsAlongPath(routePathPts, data.sensors, 160);
  }, [routePathPts, data.sensors]);

  const routeHighlightIds = useMemo(() => {
    if (!routeSensors.length && data.alert?.locationId == null) return undefined;
    const ids = new Set(routeSensors.map((s) => s.location_id));
    if (data.alert?.locationId != null) ids.add(data.alert.locationId);
    return ids;
  }, [routeSensors, data.alert?.locationId]);

  const mapSensors = useMemo(() => {
    const alongIds = new Set(routeSensors.map((s) => s.location_id));
    // Always include Low/Med/High zones along the selected route.
    const visible = showLowSensors
      ? data.sensors
      : data.sensors.filter(
          (s) => s.density_level !== "Low" || alongIds.has(s.location_id)
        );
    const byId = new Map(visible.map((s) => [s.location_id, s]));
    for (const s of routeSensors) byId.set(s.location_id, s);
    return [...byId.values()];
  }, [data.sensors, showLowSensors, routeSensors]);

  const path = routePathPts.length > 1 ? routePathPts : (selected?.positions ?? []);

  const fitPaths = routes.map((r) => r.positions);

  return (
    <div className={`map-app${navigating ? " is-navigating" : ""}`}>
      <MapCanvas follow={navigating} followPoint={navPoint}>
        <MapFitBounds
          enabled={!navigating}
          points={[origin?.point, dest?.point, live.userPoint]}
          paths={fitPaths}
        />
        <SensorLayer sensors={mapSensors} highlightIds={routeHighlightIds} />
        <RefugeMarkers
          places={sortedRefuges}
          selectedId={selectedRefugeId}
          navigating={navigating}
          onSelect={(id) => {
            setSelectedRefugeId(id);
            setRefugePickerOpen(true);
            setSheet("places");
          }}
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
          segments={selected?.segments}
          style={navigating ? "navigating" : "selected"}
          showLabels={Boolean(selected?.transitLegs?.length)}
        />
        <UserLocationMarker
          point={navPoint}
          navigating={navigating}
          bearing={navBearing}
        />
      </MapCanvas>

      <header className="map-topbar">
        <Link to="/" className="brand-link">
          Relax Maps
        </Link>
      </header>

      {navigating ? (
        <ActiveRouteBar
          route={selected}
          progress={live.progress}
          originLabel={originText || origin?.label || null}
          destinationLabel={
            selected?.label || destText || dest?.label || null
          }
        />
      ) : null}

      <DataUpdatedTag label={data.dataUpdatedLabel} />

      {selected?.segments && selected.segments.length > 1 ? (
        <TransitModeKey segments={selected.segments} />
      ) : null}

      {routeSensors.length > 0 ? (
        <div className="route-crowd-tag" role="status">
          {routeSensors.length} crowd zone
          {routeSensors.length === 1 ? "" : "s"} along route
          {" · "}
          {
            [
              routeSensors.filter((s) => s.density_level === "High").length
                ? `${routeSensors.filter((s) => s.density_level === "High").length} high`
                : null,
              routeSensors.filter((s) => s.density_level === "Medium").length
                ? `${routeSensors.filter((s) => s.density_level === "Medium").length} med`
                : null,
              routeSensors.filter((s) => s.density_level === "Low").length
                ? `${routeSensors.filter((s) => s.density_level === "Low").length} low`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
          }
        </div>
      ) : null}

      {!navigating ? <OnboardingTips /> : null}

      <MapPanels
        hidden={navigating}
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
          showLowSensors,
          setShowLowSensors,
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
        onSelectRefuge={(id) => {
          setSelectedRefugeId(id);
          setRefugePickerOpen(true);
        }}
        selectedRefuge={selectedRefuge}
        onNavigateRefuge={(place) => void navigateToRefuge(place)}
        sheet={sheet}
        setSheet={setSheet}
        onGo={() => void startGo()}
        sensorCount={data.sensors.length || null}
        toast={
          data.error || data.notice ? (
            <div className={`toast${data.error ? " toast-error" : " toast-info"}`}>
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

      <NavDock
        navigating={navigating}
        progress={live.progress}
        canGo={Boolean(selected)}
        canRefuge={topRefuges.length > 0}
        destinationLabel={selected?.label ?? (destText || null)}
        pickerOpen={refugePickerOpen && !navigating}
        topRefuges={topRefuges}
        selectedRefugeId={selectedRefugeId}
        selectedRefuge={
          topRefuges.find((r) => r.id === selectedRefugeId) ?? null
        }
        onTogglePicker={() => {
          setRefugePickerOpen((open) => {
            const next = !open;
            if (next) setSelectedRefugeId(null);
            return next;
          });
        }}
        onSelectRefuge={(id) => {
          if (!id) {
            setSelectedRefugeId(null);
            return;
          }
          setSelectedRefugeId(id);
        }}
        onNavigateRefuge={(place) => void navigateToRefuge(place)}
        onGoNearest={() => void goNearestRefuge()}
        onClosePicker={() => {
          setRefugePickerOpen(false);
          setSelectedRefugeId(null);
        }}
        onGo={() => void startGo()}
        onStop={stopNavigation}
      />
    </div>
  );
}
