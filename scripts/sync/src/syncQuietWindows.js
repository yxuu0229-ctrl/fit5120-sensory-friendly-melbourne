import { DATASETS } from "./config.js";
import { fetchCsv, toNumber, upsertInChunks } from "./fetchCsv.js";

function dayNameFromDate(d) {
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][d.getUTCDay()];
}

function median(sorted) {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function stddev(values, mean) {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Recompute quiet_windows from recent hourly historical counts.
 * Uses sensing_date >= 2024-01-01 to keep the download manageable.
 */
export async function syncQuietWindows(supabase, dataBaseUrl) {
  const query =
    "delimiter=%2C&where=sensing_date%20%3E%3D%20%272024-01-01%27";
  const rows = await fetchCsv(dataBaseUrl, DATASETS.hourly, query);

  /** @type {Map<string, number[]>} */
  const buckets = new Map();

  for (const row of rows) {
    const dateRaw = row.sensing_date || row.sensingdate || row.date;
    const hour = toNumber(row.hourday ?? row.hour ?? row.time, NaN);
    if (!dateRaw || !Number.isFinite(hour)) continue;

    const d = new Date(dateRaw);
    if (Number.isNaN(d.getTime())) continue;

    let count = toNumber(
      row.pedestriancount ??
        row.total_of_directions ??
        row.total_count ??
        row.count,
      NaN
    );
    if (!Number.isFinite(count)) continue;

    const day = dayNameFromDate(d);
    const key = `${day}|${hour}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(count);
  }

  const quietRows = [];
  for (const [key, values] of buckets) {
    const [day_name, hourStr] = key.split("|");
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    quietRows.push({
      day_name,
      hourday: Number(hourStr),
      mean,
      median: median(sorted),
      std: stddev(values, mean),
      count: values.length,
      updated_at: new Date().toISOString(),
    });
  }

  const count = await upsertInChunks(
    supabase,
    "quiet_windows",
    quietRows,
    "day_name,hourday"
  );
  console.log(`Upserted ${count} quiet_windows rows`);
  return { quiet_windows: count };
}
