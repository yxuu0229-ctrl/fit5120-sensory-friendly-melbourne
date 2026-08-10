import { NextResponse } from "next/server";
import {
  planOsrmModeRoute,
  planQuietWalkingRoute,
} from "@/lib/quietRoute";
import { planPtvTransitTrip } from "@/lib/ptvTransitPlan";
import { hasPtvCredentials } from "@/lib/ptvServer";
import { checkCoverage } from "@/lib/coverage";
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

    // AC 1.1.6 — points outside the sensor footprint are a coverage limit, not
    // an error. Only walking depends on that data, so only walking is blocked;
    // every other mode still routes and carries the notice as context.
    const coverage = checkCoverage(from, to, mode === "walk");
    if (coverage?.blocking) {
      return NextResponse.json({ coverage });
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
      return NextResponse.json({ trip, coverage });
    }

    if (mode === "cycle" || mode === "drive") {
      const trip = await planOsrmModeRoute(mode, from, to);
      return NextResponse.json({ trip, coverage });
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
    const trip = await planQuietWalkingRoute(from, to, sensors);
    return NextResponse.json({ trip, coverage });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
