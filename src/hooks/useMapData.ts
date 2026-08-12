import { useEffect, useState } from "react";
import { fetchSensoryRefuges } from "../api/places";
import { fetchQuietWindowsForHour } from "../api/quietWindows";
import { fetchDensitySensors } from "../api/sensors";
import { hasSupabaseEnv } from "../api/supabaseClient";
import { buildQuietAlert, nextHourLabel } from "../lib/quietForecast";
import type { QuietAlert, RefugePlace, SensorReading } from "../lib/types";

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
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [dataUpdatedLabel, setDataUpdatedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setNotice(
        "Live density and refuges need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Add them in Vercel → Settings → Environment Variables, then Redeploy."
      );
      return;
    }
    void Promise.all([fetchDensitySensors(), fetchSensoryRefuges()])
      .then(([s, p]) => {
        setSensors(s);
        setRefuges(p);
        const latest = s
          .map((row) => row.sensing_datetime)
          .filter((v): v is string => Boolean(v))
          .sort()
          .at(-1);
        setDataUpdatedLabel(formatUpdated(latest));
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load map data")
      );
  }, []);

  useEffect(() => {
    if (!sensors.length) return;
    const { dayName, hourday, label } = nextHourLabel();
    void fetchQuietWindowsForHour(
      dayName,
      hourday,
      sensors.map((s) => s.location_id)
    )
      .then((windows) => setAlert(buildQuietAlert(sensors, windows, label)))
      .catch(() => setAlert(null));
  }, [sensors]);

  return {
    sensors,
    refuges,
    alert,
    error,
    setError,
    notice,
    setNotice,
    dataUpdatedLabel,
  };
}
