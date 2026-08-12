import type { PlaceResult, LatLng } from "../lib/types";

const VIEWBOX = "144.70,-38.05,145.25,-37.55"; // Greater Melbourne

async function nominatimGet(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  return res.json();
}

/** Search any Melbourne-area place via OpenStreetMap Nominatim. */
export async function searchMelbournePlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    format: "json",
    q: `${q}, Melbourne, Victoria, Australia`,
    countrycodes: "au",
    viewbox: VIEWBOX,
    bounded: "1",
    limit: "6",
    addressdetails: "0",
  });

  const rows = (await nominatimGet(
    `https://nominatim.openstreetmap.org/search?${params}`
  )) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    place_id: number;
  }>;

  return rows.map((row) => ({
    label: row.display_name.replace(/, Victoria, Australia$/, "").replace(/, Australia$/, ""),
    placeId: `osm-${row.place_id}`,
    point: { lat: Number(row.lat), lng: Number(row.lon) },
  }));
}

export async function reverseGeocode(point: LatLng): Promise<string> {
  const params = new URLSearchParams({
    format: "json",
    lat: String(point.lat),
    lon: String(point.lng),
    zoom: "18",
    addressdetails: "0",
  });
  try {
    const row = (await nominatimGet(
      `https://nominatim.openstreetmap.org/reverse?${params}`
    )) as { display_name?: string };
    if (!row.display_name) return "Current location";
    return row.display_name
      .replace(/, Victoria, Australia$/, "")
      .replace(/, Australia$/, "");
  } catch {
    return "Current location";
  }
}

export async function geocodeMelbourne(query: string): Promise<PlaceResult | null> {
  const hits = await searchMelbournePlaces(query);
  return hits[0] ?? null;
}
