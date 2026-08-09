import { parse } from "csv-parse/sync";

/**
 * Download a City of Melbourne dataset export as parsed CSV records.
 * @param {string} dataBaseUrl
 * @param {string} datasetId
 * @param {string} [query] extra query string (without leading ?)
 */
export async function fetchCsv(dataBaseUrl, datasetId, query = "delimiter=%2C") {
  const url = `${dataBaseUrl}/${datasetId}/exports/csv?${query}`;
  console.log(`Fetching ${datasetId}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${datasetId}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
  // Normalize keys to lowercase
  return records.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      out[k.trim().toLowerCase()] = v;
    }
    return out;
  });
}

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseCoords(value) {
  if (value === null || value === undefined || value === "") {
    return { lat: null, lng: null };
  }
  // GeoJSON POINT or "lat, lng"
  const s = String(value).trim();
  const pointMatch = s.match(/POINT\s*\(\s*([-0-9.]+)\s+([-0-9.]+)\s*\)/i);
  if (pointMatch) {
    return { lng: Number(pointMatch[1]), lat: Number(pointMatch[2]) };
  }
  const parts = s.replace(/[\[\]]/g, "").split(",");
  if (parts.length >= 2) {
    const a = Number(parts[0].trim());
    const b = Number(parts[1].trim());
    if (Number.isFinite(a) && Number.isFinite(b)) {
      // Melbourne: lat ~ -37, lng ~ 144
      if (Math.abs(a) > 90 && Math.abs(b) <= 90) {
        return { lng: a, lat: b };
      }
      return { lat: a, lng: b };
    }
  }
  return { lat: null, lng: null };
}

export async function upsertInChunks(supabase, table, rows, onConflict, chunkSize = 500) {
  let total = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      throw new Error(`Upsert ${table} failed: ${error.message}`);
    }
    total += chunk.length;
  }
  return total;
}
