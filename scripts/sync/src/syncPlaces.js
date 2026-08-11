import { createHash } from "node:crypto";
import { DATASETS, inCbd } from "./config.js";
import { fetchCsv, parseCoords, toNumber, upsertInChunks } from "./fetchCsv.js";

const QUIET_KEYWORDS = [
  "park",
  "garden",
  "reserve",
  "library",
  "museum",
  "gallery",
  "church",
  "cathedral",
  "temple",
  "mosque",
  "synagogue",
  "hospital",
  "health",
  "quiet",
  "outdoor facility",
];

function isSensoryRefuge(theme, subTheme) {
  const hay = `${theme || ""} ${subTheme || ""}`.toLowerCase();
  return QUIET_KEYWORDS.some((k) => hay.includes(k));
}

function mapCategory(theme, subTheme) {
  const t = `${theme || ""} ${subTheme || ""}`.toLowerCase();
  if (/park|garden|reserve|open space|outdoor/.test(t)) return "Parks & Open Space";
  if (/church|worship|cathedral|temple|mosque|synagogue/.test(t)) {
    return "Places of Worship";
  }
  if (/hospital|health|clinic/.test(t)) return "Health Services";
  if (/gallery|museum|theatre|art/.test(t)) return "Arts & Culture";
  if (/school|university|education|tertiary/.test(t)) return "Education";
  if (/sport|stadium|recreation/.test(t)) return "Sports Facilities";
  if (/station|transport|toilet/.test(t)) return "Transport";
  if (/toilet/.test(t)) return "Public Toilets";
  return "Other";
}

function stableId(source, name, lat, lng) {
  return createHash("sha1")
    .update(`${source}|${name}|${lat}|${lng}`)
    .digest("hex")
    .slice(0, 24);
}

export async function syncPlaces(supabase, dataBaseUrl) {
  const landmarkRows = await fetchCsv(dataBaseUrl, DATASETS.landmarks);
  const toiletRows = await fetchCsv(dataBaseUrl, DATASETS.toilets);
  const places = [];

  for (const row of landmarkRows) {
    const name = row.feature_name || row.name || row.place || "";
    if (!name) continue;

    let lat = toNumber(row.latitude, NaN);
    let lng = toNumber(row.longitude, NaN);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const coords = parseCoords(row.co_ordinates || row.coordinates || row.geo_point_2d);
      lat = coords.lat;
      lng = coords.lng;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const theme = row.theme || null;
    const subTheme = row.sub_theme || row.subtheme || null;

    places.push({
      id: stableId("landmarks", name, lat, lng),
      name,
      category: mapCategory(theme, subTheme),
      theme,
      sub_theme: subTheme,
      source: "landmarks",
      is_sensory_refuge: isSensoryRefuge(theme, subTheme),
      in_cbd: inCbd(lat, lng),
      latitude: lat,
      longitude: lng,
      updated_at: new Date().toISOString(),
    });
  }

  for (const row of toiletRows) {
    const name =
      row.name ||
      row.feature_name ||
      row.description ||
      row.toilet_type ||
      "Public toilet";

    let lat = toNumber(row.latitude ?? row.lat, NaN);
    let lng = toNumber(row.longitude ?? row.lon ?? row.lng, NaN);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const coords = parseCoords(
        row.geo_point_2d || row.co_ordinates || row.coordinates || row.location
      );
      lat = coords.lat;
      lng = coords.lng;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    places.push({
      id: stableId("toilets", name, lat, lng),
      name,
      category: "Public Toilets",
      theme: "Public Facilities",
      sub_theme: row.toilet_type || row.type || "Toilet",
      source: "toilets",
      is_sensory_refuge: false,
      in_cbd: inCbd(lat, lng),
      latitude: lat,
      longitude: lng,
      updated_at: new Date().toISOString(),
    });
  }

  const count = await upsertInChunks(supabase, "places", places, "id");
  console.log(`Upserted ${count} places`);
  return { places: count };
}
