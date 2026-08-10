import { NextResponse } from "next/server";
import {
  planOsrmModeRoute,
  planQuietWalkingRoute,
} from "@/lib/quietRoute";
import { checkCoverage } from "@/lib/coverage";
import { buildProvenance } from "@/lib/dataProvenance";
import { getSupabase } from "@/lib/supabase";
import type { TransportMode } from "@/lib/transportModes";
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

    if (mode !== "walk" && mode !== "cycle" && mode !== "drive") {
      return NextResponse.json(
        {
          error:
            "Unsupported transport mode. Available modes: walk, cycle, drive.",
        },
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

    if (mode === "cycle" || mode === "drive") {
      const trip = await planOsrmModeRoute(mode, from, to);
      return NextResponse.json({ trip, coverage });
    }

    // walk (default) — density-aware
    let sensors: SensorDensityCurrent[] = [];
    let densityAvailable = true;
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("sensor_density_current")
        .select("*");
      // Supabase reports failures in `error` rather than throwing, so an
      // unchecked destructure would degrade silently.
      if (error) throw error;
      sensors = (data || []) as SensorDensityCurrent[];
    } catch {
      sensors = [];
      densityAvailable = false;
    }

    // AC 1.1.7 / 1.3.6 / 2.1.3 — the route always runs on cached readings, so
    // say which ones and how old they are rather than implying they are live.
    const dataProvenance = buildProvenance(sensors, densityAvailable);
    const trip = await planQuietWalkingRoute(from, to, sensors);
    return NextResponse.json({ trip, coverage, dataProvenance });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
