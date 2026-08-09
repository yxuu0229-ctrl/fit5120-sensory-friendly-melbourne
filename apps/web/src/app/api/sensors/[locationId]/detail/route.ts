import { NextResponse } from "next/server";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase";
import { fetchSensorDetail } from "@/lib/sensorDetail";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ locationId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Supabase env is not configured" },
      { status: 503 }
    );
  }

  const { locationId: raw } = await params;
  const locationId = Number.parseInt(raw, 10);
  if (!Number.isFinite(locationId) || locationId <= 0) {
    return NextResponse.json(
      { error: "locationId must be a positive integer" },
      { status: 400 }
    );
  }

  try {
    const detail = await fetchSensorDetail(getSupabase(), locationId);
    return NextResponse.json(detail, {
      headers: {
        "Server-Timing": `detail;dur=${detail.queryMs}`,
        "X-Detail-Query-Ms": String(detail.queryMs),
        "X-Detail-SLA-Ms": String(detail.slaMs),
        "X-Detail-Within-SLA": detail.withinSla ? "true" : "false",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Detail query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
