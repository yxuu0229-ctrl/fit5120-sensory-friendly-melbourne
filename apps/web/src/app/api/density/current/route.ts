import { NextResponse } from "next/server";
import {
  AGREED_DENSITY_LEVELS,
  bandMatchesCount,
  densityColor,
  DENSITY_BANDS,
  inCbd,
  isAgreedDensityLevel,
} from "@/lib/densityBands";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase";
import type { SensorDensityCurrent } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * AC 2.1.1 — current pedestrian density for the map layer.
 * Returns sensors with agreed Low / Medium / High bands and CBD coverage stats.
 */
export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Supabase env is not configured" },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await getSupabase()
      .from("sensor_density_current")
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sensors = (data || []) as SensorDensityCurrent[];
    const cbdSensors = sensors.filter(
      (s) => s.in_cbd === true || inCbd(s.latitude, s.longitude)
    );

    const bandCounts: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
    let invalidLevel = 0;
    let bandMismatch = 0;

    for (const s of cbdSensors) {
      if (!isAgreedDensityLevel(s.density_level)) {
        invalidLevel += 1;
        continue;
      }
      bandCounts[s.density_level] += 1;
      if (!bandMatchesCount(s.total_count, s.density_level)) {
        bandMismatch += 1;
      }
    }

    return NextResponse.json({
      acceptanceCriterion: "2.1.1",
      bands: DENSITY_BANDS.map((b) => ({
        level: b.level,
        label: b.label,
        description: b.description,
        color: b.color,
      })),
      agreedLevels: AGREED_DENSITY_LEVELS,
      sensors: cbdSensors.map((s) => ({
        location_id: s.location_id,
        sensor_name: s.sensor_name,
        latitude: s.latitude,
        longitude: s.longitude,
        total_count: s.total_count,
        density_level: s.density_level,
        color: densityColor(s.density_level),
        sensing_datetime: s.sensing_datetime,
        in_cbd: s.in_cbd === true || inCbd(s.latitude, s.longitude),
      })),
      summary: {
        totalSensors: sensors.length,
        cbdSensors: cbdSensors.length,
        bandCounts,
        invalidLevel,
        bandMismatch,
        coversCbd: cbdSensors.length > 0,
        bandsValid:
          invalidLevel === 0 &&
          bandMismatch === 0 &&
          cbdSensors.length > 0,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Density query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
