import { useCallback, useEffect, useState } from "react";
import { fetchSensoryRefuges } from "../api/places";
import { fetchQuietWindowsForHour } from "../api/quietWindows";
import { fetchDensitySensors } from "../api/sensors";
import { hasSupabaseEnv } from "../api/supabaseClient";
import {
  buildForecastHotspots,
  type ForecastHotspot,
} from "../lib/forecastHotspots";
import { nextHourLabel } from "../lib/quietForecast";
import type { QuietAlert, RefugePlace, SensorReading } from "../lib/types";

const HOUR_MS = 60 * 60 * 1000;

function formatUpdated(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Melbourne",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function useMapData() {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [refuges, setRefuges] = useState<RefugePlace[]>([]);
  const [alert, setAlert] = useState<QuietAlert | null>(null);
  const [hotspots, setHotspots] = useState<ForecastHotspot[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [dataUpdatedLabel, setDataUpdatedLabel] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!hasSupabaseEnv()) {
      if (!silent) {
        setNotice(
          "Live density and refuges need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Add them in Vercel → Settings → Environment Variables, then Redeploy."
        );
      }
      return;
    }
    try {
      const [s, p] = await Promise.all([
        fetchDensitySensors(),
        fetchSensoryRefuges(),
      ]);
      setSensors(s);
      setRefuges(p);
      const latest = s
        .map((row) => row.sensing_datetime)
        .filter((v): v is string => Boolean(v))
        .sort()
        .at(-1);
      setDataUpdatedLabel(
        formatUpdated(latest) ?? formatUpdated(new Date().toISOString())
      );
      if (!silent) setError("");
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Could not load map data");
      }
    }
  }, []);

  useEffect(() => {
    void refresh(false);
    const id = window.setInterval(() => void refresh(true), HOUR_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!sensors.length) return;
    const { dayName, hourday, label } = nextHourLabel();
    void fetchQuietWindowsForHour(
      dayName,
      hourday,
      sensors.map((s) => s.location_id)
    )
      .then((windows) => {
        const next = buildForecastHotspots(sensors, windows, label, 6);
        setHotspots(next);
        setAlert(next[0] ?? null);
      })
      .catch(() => {
        setHotspots([]);
        setAlert(null);
      });
  }, [sensors]);

  return {
    sensors,
    refuges,
    alert,
    hotspots,
    error,
    setError,
    notice,
    setNotice,
    dataUpdatedLabel,
    refresh,
  };
}
