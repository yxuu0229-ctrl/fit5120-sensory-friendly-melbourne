import { getSupabase, hasSupabaseEnv } from "./supabase";
import type { LatLng } from "./geo";
import type { RouteCandidate } from "./journeyPlanning";
import {
  BACKEND_UNAVAILABLE_MESSAGE,
  type GeocodeResult,
  type JourneyData,
  type PlannedTrip,
  type RefugePlace,
  type SensorReading,
  type WalkingRoutesResult,
} from "./journeyData";

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry?: { coordinates?: [number, number][] };
};

export function osrmRouteToCandidate(route: OsrmRoute, label: string): RouteCandidate {
  return {
    label,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    positions: route.geometry?.coordinates?.map(([lng, lat]) => [lat, lng] as [number, number]) ?? [],
  };
}

async function fetchOsrmRouteOptions(from: LatLng, to: LatLng) {
  const points = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/foot/${points}?overview=full&geometries=geojson&alternatives=true&steps=false`
  );
  if (!response.ok) return [];
  const body = (await response.json()) as { routes?: OsrmRoute[] };
  return body.routes ?? [];
}

export function createLiveJourneyData(): JourneyData {
  return {
    async sensorReadings(limit: number): Promise<SensorReading[]> {
      if (!hasSupabaseEnv()) return [];

      const { data } = await getSupabase()
        .from("sensor_density_current")
        .select("location_id,sensor_name,latitude,longitude,density_level,total_count,sensing_datetime")
        .limit(limit);
      return (data ?? []) as SensorReading[];
    },

    async sensoryRefuges(): Promise<RefugePlace[]> {
      if (!hasSupabaseEnv()) return [];

      const { data } = await getSupabase()
        .from("places")
        .select("id,name,category,theme,sub_theme,source,latitude,longitude")
        .eq("is_sensory_refuge", true);
      return (data ?? []) as RefugePlace[];
    },

    async walkingRoutes(from: LatLng, to: LatLng): Promise<WalkingRoutesResult> {
      let candidates: RouteCandidate[] = [];
      let error: string | null = null;
      let trip: PlannedTrip | null = null;

      try {
        const [backendResponse, osrmRoutes] = await Promise.all([
          fetch("/api/route/plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ from, to, mode: "walk" }),
          }),
          fetchOsrmRouteOptions(from, to),
        ]);

        if (backendResponse.ok) {
          const body = (await backendResponse.json()) as { trip: PlannedTrip };
          trip = body.trip;
          candidates = [
            ...(body.trip.allPositions
              ? [
                  {
                    label: body.trip.label,
                    distanceMeters: body.trip.distanceMeters,
                    durationSeconds: body.trip.durationSeconds,
                    positions: body.trip.allPositions,
                  },
                ]
              : []),
            ...osrmRoutes.map((route, index) =>
              osrmRouteToCandidate(route, index === 0 ? "Direct walking route" : `Walking alternative ${index + 1}`)
            ),
          ];
        } else {
          error = BACKEND_UNAVAILABLE_MESSAGE;
        }
      } catch {
        error = BACKEND_UNAVAILABLE_MESSAGE;
      }

      return { candidates, error, trip };
    },

    async geocode(query: string): Promise<GeocodeResult | null> {
      const encoded = encodeURIComponent(`${query}, Melbourne, Victoria, Australia`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=au&q=${encoded}`
      );
      if (!response.ok) return null;

      const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      const first = results[0];
      if (!first) return null;

      return {
        label: first.display_name,
        point: {
          lat: Number(first.lat),
          lng: Number(first.lon),
        },
      };
    },
  };
}
