import { NextResponse } from "next/server";
import {
  planOsrmModeRoute,
  planQuietWalkingRoute,
} from "@/lib/quietRoute";
import { planPtvTransitTrip } from "@/lib/ptvTransitPlan";
import { hasPtvCredentials } from "@/lib/ptvServer";
import { getSupabase } from "@/lib/supabase";
import {
  isTransitMode,
  type TransportMode,
} from "@/lib/transportModes";
import type { SensorDensityCurrent } from "@/lib/types";

type Body = {
  from?: { lat: number; lng: number };
  to?: { lat: number; lng: number };
  mode?: TransportMode;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const from = body.from;
    const to = body.to;
    const mode = body.mode || "walk";

    if (
      !from ||
      !to ||
      !Number.isFinite(from.lat) ||
      !Number.isFinite(from.lng) ||
      !Number.isFinite(to.lat) ||
      !Number.isFinite(to.lng)
    ) {
      return NextResponse.json(
        { error: "from and to lat/lng are required" },
        { status: 400 }
      );
    }

    if (isTransitMode(mode)) {
      if (!hasPtvCredentials()) {
        return NextResponse.json(
          {
            error:
              "PTV credentials not configured. Add PTV_DEVID and PTV_API_KEY to apps/web/.env.local (request a key from PTV Timetable API).",
          },
          { status: 503 }
        );
      }
      const trip = await planPtvTransitTrip(from, to, mode);
      return NextResponse.json({ trip });
    }

    if (mode === "cycle" || mode === "drive") {
      const trip = await planOsrmModeRoute(mode, from, to);
      return NextResponse.json({ trip });
    }

    // walk (default) — density-aware
    let sensors: SensorDensityCurrent[] = [];
    try {
      const sb = getSupabase();
      const { data } = await sb.from("sensor_density_current").select("*");
      sensors = (data || []) as SensorDensityCurrent[];
    } catch {
      sensors = [];
    }
    const { trip, trips } = await planQuietWalkingRoute(from, to, sensors);
    // AC 1.1.4: `trips` is ordered lowest → highest sensory indicator.
    return NextResponse.json({ trip, trips });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
