import { DATASETS, MIN_RELIABLE_SAMPLES } from "./config.js";
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

/** mean/median/std/count for one bucket of observations. */
function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    mean,
    median: median(sorted),
    std: stddev(values, mean),
    sample_count: values.length,
  };
}

/**
 * Recompute quiet_windows (city-wide) and location_quiet_windows (per sensor)
 * from recent hourly historical counts.
 * Uses sensing_date >= 2024-01-01 to keep the download manageable.
 */
export async function syncQuietWindows(supabase, dataBaseUrl) {
  const query =
    "delimiter=%2C&where=sensing_date%20%3E%3D%20%272024-01-01%27";
  const rows = await fetchCsv(dataBaseUrl, DATASETS.hourly, query);

  /** @type {Map<string, number[]>} keyed `${day}|${hour}` */
  const cityBuckets = new Map();
  /** @type {Map<string, number[]>} keyed `${locationId}|${day}|${hour}` */
  const locationBuckets = new Map();

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

    const cityKey = `${day}|${hour}`;
    if (!cityBuckets.has(cityKey)) cityBuckets.set(cityKey, []);
    cityBuckets.get(cityKey).push(count);

    // Per-location buckets — rows without a usable sensor id only feed the
    // city-wide aggregate.
    const locationId = toNumber(
      row.location_id ?? row.locationid ?? row.sensor_id ?? row.sensorid,
      NaN
    );
    if (!Number.isFinite(locationId)) continue;

    const locationKey = `${locationId}|${day}|${hour}`;
    if (!locationBuckets.has(locationKey)) locationBuckets.set(locationKey, []);
    locationBuckets.get(locationKey).push(count);
  }

  const updatedAt = new Date().toISOString();

  const quietRows = [];
  for (const [key, values] of cityBuckets) {
    const [day_name, hourStr] = key.split("|");
    const { mean, median: med, std, sample_count } = summarize(values);
    quietRows.push({
      day_name,
      hourday: Number(hourStr),
      mean,
      median: med,
      std,
      count: sample_count,
      updated_at: updatedAt,
    });
  }

  const locationRows = [];
  for (const [key, values] of locationBuckets) {
    const [locationStr, day_name, hourStr] = key.split("|");
    const { mean, median: med, std, sample_count } = summarize(values);
    locationRows.push({
      location_id: Number(locationStr),
      day_name,
      hourday: Number(hourStr),
      mean,
      median: med,
      std,
      sample_count,
      is_reliable: sample_count >= MIN_RELIABLE_SAMPLES,
      updated_at: updatedAt,
    });
  }

  const cityCount = await upsertInChunks(
    supabase,
    "quiet_windows",
    quietRows,
    "day_name,hourday"
  );
  console.log(`Upserted ${cityCount} quiet_windows rows`);

  const locationCount = await upsertInChunks(
    supabase,
    "location_quiet_windows",
    locationRows,
    "location_id,day_name,hourday"
  );
  const unreliable = locationRows.filter((r) => !r.is_reliable).length;
  console.log(
    `Upserted ${locationCount} location_quiet_windows rows ` +
      `(${unreliable} below the ${MIN_RELIABLE_SAMPLES}-sample reliability threshold)`
  );

  return {
    quiet_windows: cityCount,
    location_quiet_windows: locationCount,
  };
}
