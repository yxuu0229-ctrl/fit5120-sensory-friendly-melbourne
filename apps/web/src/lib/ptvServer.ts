import { createHmac } from "node:crypto";

const PTV_BASE = "https://timetableapi.ptv.vic.gov.au";

export function hasPtvCredentials(): boolean {
  return Boolean(process.env.PTV_DEVID && process.env.PTV_API_KEY);
}

/**
 * Sign and call PTV Timetable API v3.
 * Signature = HMAC-SHA1(apiKey, requestPathWithQueryIncludingDevid)
 */
export async function ptvFetch<T>(
  pathWithQuery: string
): Promise<T> {
  const devid = process.env.PTV_DEVID;
  const apiKey = process.env.PTV_API_KEY;
  if (!devid || !apiKey) {
    throw new Error(
      "PTV credentials missing. Set PTV_DEVID and PTV_API_KEY in apps/web/.env.local (register at ptv.vic.gov.au Timetable API)."
    );
  }

  const path = pathWithQuery.startsWith("/")
    ? pathWithQuery
    : `/${pathWithQuery}`;
  const joiner = path.includes("?") ? "&" : "?";
  const withDevid = `${path}${joiner}devid=${encodeURIComponent(devid)}`;
  const signature = createHmac("sha1", apiKey)
    .update(withDevid)
    .digest("hex")
    .toUpperCase();
  const url = `${PTV_BASE}${withDevid}&signature=${signature}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PTV API ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export type PtvStop = {
  stop_id: number;
  stop_name: string;
  stop_latitude: number;
  stop_longitude: number;
  route_type: number;
  stop_distance?: number;
};

export type PtvRoute = {
  route_id: number;
  route_type: number;
  route_name: string;
  route_number?: string;
};

export async function stopsNear(
  lat: number,
  lng: number,
  maxDistance = 900,
  routeTypes?: number[]
): Promise<PtvStop[]> {
  const params = new URLSearchParams({
    max_distance: String(maxDistance),
    max_results: "30",
  });
  if (routeTypes?.length) {
    for (const t of routeTypes) params.append("route_types", String(t));
  }
  const data = await ptvFetch<{ stops?: PtvStop[] }>(
    `/v3/stops/location/${lat},${lng}?${params.toString()}`
  );
  return data.stops || [];
}

export async function stopDetails(
  stopId: number,
  routeType: number
): Promise<{ stop?: PtvStop; routes?: PtvRoute[] }> {
  const data = await ptvFetch<{
    stop?: PtvStop;
    routes?: PtvRoute[];
  }>(`/v3/stops/${stopId}/route_type/${routeType}`);
  return data;
}

export async function stopsOnRoute(
  routeId: number,
  routeType: number
): Promise<PtvStop[]> {
  const data = await ptvFetch<{ stops?: PtvStop[] }>(
    `/v3/stops/route/${routeId}/route_type/${routeType}`
  );
  return data.stops || [];
}

export async function nextDeparture(
  routeType: number,
  stopId: number,
  routeId: number
): Promise<{
  scheduled?: string;
  estimated?: string;
  directionName?: string;
} | null> {
  const data = await ptvFetch<{
    departures?: Array<{
      scheduled_departure_utc?: string;
      estimated_departure_utc?: string;
      route_id?: number;
      direction_id?: number;
    }>;
    directions?: Record<string, { direction_name?: string }>;
  }>(
    `/v3/departures/route_type/${routeType}/stop/${stopId}/route/${routeId}?max_results=1`
  );

  const dep = data.departures?.[0];
  if (!dep) return null;
  const directionName =
    dep.direction_id != null
      ? data.directions?.[String(dep.direction_id)]?.direction_name
      : undefined;

  return {
    scheduled: dep.scheduled_departure_utc,
    estimated: dep.estimated_departure_utc,
    directionName,
  };
}
