import { getSupabase, hasSupabaseEnv } from "./supabase";
import type { LatLng } from "./geo";
import type { RouteCandidate } from "./journeyPlanning";
import { planRoute } from "./planRoute";
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

function tripToCandidate(trip: {
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  allPositions?: [number, number][];
}): RouteCandidate | null {
  const positions = trip.allPositions ?? [];
  if (positions.length < 2) return null;
  return {
    label: trip.label,
    distanceMeters: trip.distanceMeters,
    durationSeconds: trip.durationSeconds,
    positions,
  };
}

export function createLiveJourneyData(): JourneyData {
  return {
    async sensorReadings(limit?: number): Promise<SensorReading[]> {
      if (!hasSupabaseEnv()) return [];

      let query = getSupabase()
        .from("sensor_density_current")
        .select(
          "location_id,sensor_name,latitude,longitude,density_level,total_count,sensing_datetime"
        );
      if (limit != null && limit > 0) {
        query = query.limit(limit);
      }
      const { data } = await query;
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
        // Same planner as Live map (browser Supabase + OSRM) — replaces retired
        // Next.js POST /api/route/plan.
        const result = await planRoute(from, to, "walk");

        if (result.coverage?.blocking) {
          return {
            candidates: [],
            error: result.coverage.message,
            trip: null,
          };
        }

        const trips = result.trips?.length
          ? result.trips
          : result.trip
            ? [result.trip]
            : [];

        if (trips.length) {
          const primary = trips[0];
          trip = {
            label: primary.label,
            distanceMeters: primary.distanceMeters,
            durationSeconds: primary.durationSeconds,
            crowdScore: primary.crowdScore,
            alternativesConsidered: primary.alternativesConsidered,
            allPositions: primary.allPositions,
          };
          candidates = trips
            .map(tripToCandidate)
            .filter((c): c is RouteCandidate => c != null);
        }
      } catch {
        // Fall through to plain OSRM alternatives below.
      }

      if (!candidates.length) {
        try {
          const osrmRoutes = await fetchOsrmRouteOptions(from, to);
          candidates = osrmRoutes.map((route, index) =>
            osrmRouteToCandidate(
              route,
              index === 0 ? "Direct walking route" : `Walking alternative ${index + 1}`
            )
          );
          if (candidates.length) {
            error =
              "Density-aware planner unavailable. Showing OSRM walking alternatives.";
          } else {
            error = BACKEND_UNAVAILABLE_MESSAGE;
          }
        } catch {
          error = BACKEND_UNAVAILABLE_MESSAGE;
        }
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
