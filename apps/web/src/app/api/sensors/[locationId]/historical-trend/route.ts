import { NextResponse } from "next/server";
import { calculateLocationHistoricalTrendFromCom } from "@/lib/historicalTrend";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ locationId: string }> };

/**
 * AC 2.2.5 — calculate historical trend for a location from City of Melbourne
 * open hourly pedestrian counts (sensing_date >= 2024-01-01 by default).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { locationId: raw } = await params;
  const locationId = Number.parseInt(raw, 10);
  if (!Number.isFinite(locationId) || locationId <= 0) {
    return NextResponse.json(
      { error: "locationId must be a positive integer" },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const since = url.searchParams.get("since") || "2024-01-01";

  try {
    const started = performance.now();
    const result = await calculateLocationHistoricalTrendFromCom(locationId, {
      since,
    });
    const queryMs = Math.round(performance.now() - started);

    return NextResponse.json({
      ...result,
      // Compact payload for UI: first/last few + summary; full trend included
      queryMs,
      acceptanceCriterion: "2.2.5",
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Historical trend calculation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
