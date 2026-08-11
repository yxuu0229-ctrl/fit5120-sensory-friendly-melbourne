import { useEffect, useState } from "react";
import { getSupabase, hasSupabaseEnv } from "../../lib/supabase";
import type { Place, SensorDensityCurrent } from "../../lib/types";
import {
  getCarltonMockSensors,
  getCarltonRefuges,
  getStandardRefuges,
} from "./fallbackData";

// Fetch quiet spaces and pedestrian sensors from Supabase (or fallback to static data)
export function useHomeMapData() {
  const [quietSpaces, setQuietSpaces] = useState<Place[]>([]);
  const [sensors, setSensors] = useState<SensorDensityCurrent[]>([]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      const dbConfigured = hasSupabaseEnv();
      let placesData: Place[] = [];
      let sensorsData: SensorDensityCurrent[] = [];

      if (dbConfigured) {
        try {
          const sb = getSupabase();
          const [placesRes, sensorsRes] = await Promise.all([
            sb.from("places").select("*").eq("is_sensory_refuge", true),
            sb.from("sensor_density_current").select("*"),
          ]);
          if (placesRes.data) placesData = placesRes.data as Place[];
          if (sensorsRes.data) sensorsData = sensorsRes.data as SensorDensityCurrent[];
        } catch (e) {
          console.error("Failed to load map data from Supabase", e);
        }
      }

      if (!active) return;

      // Combine places, prioritizing fetched DB places but making sure Carlton mock places are present
      const combinedPlaces = [...placesData];
      getCarltonRefuges().forEach(c => {
        if (!combinedPlaces.some(p => p.id === c.id)) {
          combinedPlaces.push(c);
        }
      });
      getStandardRefuges().forEach(s => {
        if (!combinedPlaces.some(p => p.id === s.id)) {
          combinedPlaces.push(s);
        }
      });

      setQuietSpaces(combinedPlaces);

      // If no sensor data, inject mock Carlton sensors for visual effect in Carlton mockup
      if (sensorsData.length === 0) {
        sensorsData = getCarltonMockSensors();
      }
      setSensors(sensorsData);
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  return { quietSpaces, sensors };
}
