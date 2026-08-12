import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentPosition } from "../api/geolocation";
import { reverseGeocode } from "../api/nominatim";
import { fetchOsrmTo } from "../api/osrm";
import DataUpdatedTag from "../components/DataUpdatedTag";
import CbdChoroplethLayer from "../components/map/CbdChoroplethLayer";
import EndpointMarkers from "../components/map/EndpointMarkers";
import MapCanvas from "../components/map/MapCanvas";
import MapFitBounds from "../components/map/MapFitBounds";
import RefugeMarkers from "../components/map/RefugeMarkers";
import RouteLayer from "../components/map/RouteLayer";
import SensorLayer from "../components/map/SensorLayer";
import UserLocationMarker from "../components/map/UserLocationMarker";
import NavDock from "../components/nav/NavDock";
import ActiveRouteBar from "../components/nav/ActiveRouteBar";
import MapPanels from "../components/shell/MapPanels";
import { useLiveNavigation } from "../hooks/useLiveNavigation";
import { useMapData } from "../hooks/useMapData";
import { coverageMessage } from "../lib/coverage";
import { CBD_CENTER } from "../lib/densityBands";
import { bearingAlongPath } from "../lib/geo";
import { nearestRefuge, sortRefugesByDistance } from "../lib/nearestRefuge";
import { indicatorForLoad } from "../lib/sensoryIndicator";
import {
  playGoChime,
  playMapWelcome,
  playModeSound,
} from "../lib/soothingSound";
import { planTopRoutes } from "../lib/topRoutes";
import type { TransportMode } from "../lib/transportModes";
import type { PlaceResult, RefugePlace, RouteOption } from "../lib/types";

import { useSoundSettings } from "../hooks/useSoundSettings";

type Sheet = "plan" | "routes" | "places";

export default function MapPage() {
  const data = useMapData();
  const sound = useSoundSettings();
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [origin, setOrigin] = useState<PlaceResult | null>(null);
  const [dest, setDest] = useState<PlaceResult | null>(null);
  const [threshold, setThreshold] = useState(50);
  const [preferCalmer, setPreferCalmer] = useState(true);
  const [showLowSensors, setShowLowSensors] = useState(true);
  const [mode, setMode] = useState<TransportMode>("walk");
  const [rawRoutes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRefugeId, setSelectedRefugeId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [sheet, setSheet] = useState<Sheet>("plan");
  const [planning, setPlanning] = useState(false);
  const [refugePickerOpen, setRefugePickerOpen] = useState(false);

  // Dynamic route indicator derivation (eliminates double-render cascade on threshold change)
  const routes = useMemo(() => {
    return rawRoutes.map((route) => ({
      ...route,
      indicator: indicatorForLoad(route.sensoryLoad, threshold, route.exposure),
    }));
  }, [rawRoutes, threshold]);

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


  // Coverage / info toasts clear automatically after a few seconds.
  useEffect(() => {
    if (!data.notice) return;
    const timer = window.setTimeout(() => data.setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [data.notice, data.setNotice]);

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
    let from = live.userPoint ?? origin?.point;
    if (!from) {
      try {
        from = await getCurrentPosition();
        live.setUserPoint(from);
      } catch {
        data.setError("Set your location first (Use my location or Start).");
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

  const [mapCenterTarget, setMapCenterTarget] = useState<{ lat: number; lng: number } | null>(null);

  async function startGo() {
    setRefugePickerOpen(false);
    setMapCenterTarget(CBD_CENTER);
    setTimeout(() => setMapCenterTarget(null), 1000);
  }

  function stopNavigation() {
    setNavigating(false);
  }

  const mapSensors = useMemo(
    () =>
      showLowSensors
        ? data.sensors
        : data.sensors.filter((s) => s.density_level !== "Low"),
    [data.sensors, showLowSensors]
  );

  const path =
    navigating && live.remaining.length > 1
      ? live.remaining
      : (selected?.positions ?? []);

  const fitPaths = routes.map((r) => r.positions);

  return (
    <div className={`map-app${navigating ? " is-navigating" : ""}`}>
      <MapCanvas follow={navigating} followPoint={navPoint} centerTarget={mapCenterTarget}>
        <MapFitBounds
          enabled={!navigating && !mapCenterTarget}
          points={[origin?.point, dest?.point, live.userPoint]}
          paths={fitPaths}
        />
        <CbdChoroplethLayer sensors={mapSensors} threshold={threshold} />
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
          segments={navigating ? undefined : selected?.segments}
          style={navigating ? "navigating" : "selected"}
        />
        {navigating && selected?.segments?.length ? (
          <RouteLayer
            path={selected.positions}
            segments={selected.segments}
            style="selected"
          />
        ) : null}
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
        <div className="top-actions">
          <DataUpdatedTag label={data.dataUpdatedLabel} />
          <button
            type="button"
            className="btn btn-ghost sound-toggle-btn"
            aria-label={sound.muted ? "Unmute audio chimes" : "Mute audio chimes"}
            onClick={sound.toggleMute}
          >
            {sound.muted ? "🔇 Sound Off" : "🔊 Sound On"}
          </button>
        </div>
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
          sensorCount: data.sensors.length,
          planning,
          onPlan: () => void runPlan(mode),
          onLocate: () => void useMyLocation(),
          muted: sound.muted,
          onToggleMute: sound.toggleMute,
        }}
        routes={routes}
        selectedId={selectedId}
        onSelectRoute={setSelectedId}
        selected={selected}
        alternative={alternative}
        onTakeAlternative={() => alternative && setSelectedId(alternative.id)}
        alert={data.alert}
        onFocusLocation={(pt, locationId) => {
          setMapCenterTarget(pt);
          window.dispatchEvent(
            new CustomEvent("map:focus", { detail: { point: pt, locationId } })
          );
          setTimeout(() => setMapCenterTarget(null), 1000);
        }}
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
