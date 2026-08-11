/**
 * Per-location historical pedestrian trend from City of Melbourne hourly data.
 * Used by sync validation (AC 2.2.5) and the detail historical-trend API.
 */

import { DATASETS } from "./config.js";
import { fetchCsv, toNumber } from "./fetchCsv.js";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function dayNameFromDate(d) {
  return DAY_NAMES[d.getUTCDay()];
}

export function median(sorted) {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function stddev(values, mean) {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function countField(row) {
  return toNumber(
    row.pedestriancount ??
      row.total_of_directions ??
      row.total_count ??
      row.count,
    NaN
  );
}

/**
 * Bucket raw CoM hourly rows into day_name|hourday → count samples.
 * @param {Record<string, string>[]} rows
 * @param {number} [locationId] when set, only that sensor is kept
 */
export function bucketHourlyRows(rows, locationId) {
  /** @type {Map<string, number[]>} */
  const buckets = new Map();
  let used = 0;
  let skipped = 0;

  for (const row of rows) {
    const loc = toNumber(row.location_id ?? row.locationid, NaN);
    if (locationId != null && loc !== locationId) {
      skipped += 1;
      continue;
    }

    const dateRaw = row.sensing_date || row.sensingdate || row.date;
    const hour = toNumber(row.hourday ?? row.hour ?? row.time, NaN);
    if (!dateRaw || !Number.isFinite(hour)) {
      skipped += 1;
      continue;
    }

    const d = new Date(dateRaw);
    if (Number.isNaN(d.getTime())) {
      skipped += 1;
      continue;
    }

    const count = countField(row);
    if (!Number.isFinite(count)) {
      skipped += 1;
      continue;
    }

    const day = dayNameFromDate(d);
    const key = `${day}|${hour}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(count);
    used += 1;
  }

  return { buckets, used, skipped };
}

/**
 * Turn buckets into sorted trend rows (mean / median / std / count).
 * @param {Map<string, number[]>} buckets
 */
export function trendFromBuckets(buckets) {
  const trends = [];
  for (const [key, values] of buckets) {
    const [day_name, hourStr] = key.split("|");
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    trends.push({
      day_name,
      hourday: Number(hourStr),
      mean,
      median: median(sorted),
      std: stddev(values, mean),
      count: values.length,
    });
  }

  trends.sort((a, b) => {
    const di = DAY_NAMES.indexOf(a.day_name) - DAY_NAMES.indexOf(b.day_name);
    return di !== 0 ? di : a.hourday - b.hourday;
  });
  return trends;
}

/**
 * Independent aggregator used only for AC 2.2.5 validation
 * (different code path than trendFromBuckets).
 * @param {Map<string, number[]>} buckets
 */
export function independentTrendFromBuckets(buckets) {
  const out = [];
  for (const [key, values] of buckets.entries()) {
    const pipe = key.indexOf("|");
    const day_name = key.slice(0, pipe);
    const hourday = Number(key.slice(pipe + 1));
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const n = values.length;
    const mean = sum / n;
    const copy = values.slice().sort((a, b) => a - b);
    const medianVal =
      n % 2 === 1 ? copy[(n - 1) >> 1] : (copy[n / 2 - 1] + copy[n / 2]) / 2;
    let sq = 0;
    for (let i = 0; i < n; i++) sq += (values[i] - mean) ** 2;
    const std = n < 2 ? 0 : Math.sqrt(sq / (n - 1));
    out.push({
      day_name,
      hourday,
      mean,
      median: medianVal,
      std,
      count: n,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 0,
    });
  }
  return out;
}

export function compareTrends(primary, independent, absTol = 1e-6) {
  /** @type {Map<string, typeof primary[number]>} */
  const aMap = new Map(
    primary.map((r) => [`${r.day_name}|${r.hourday}`, r])
  );
  /** @type {Map<string, typeof independent[number]>} */
  const bMap = new Map(
    independent.map((r) => [`${r.day_name}|${r.hourday}`, r])
  );

  const keys = new Set([...aMap.keys(), ...bMap.keys()]);
  const rows = [];
  let maxAbsMeanDiff = 0;
  let mismatches = 0;

  for (const key of [...keys].sort()) {
    const a = aMap.get(key);
    const b = bMap.get(key);
    if (!a || !b) {
      mismatches += 1;
      rows.push({
        key,
        status: "missing_side",
        meanDiff: null,
        medianDiff: null,
        countMatch: false,
      });
      continue;
    }
    const meanDiff = Math.abs(a.mean - b.mean);
    const medianDiff = Math.abs(a.median - b.median);
    const countMatch = a.count === b.count;
    const ok =
      meanDiff <= absTol && medianDiff <= absTol && countMatch;
    if (!ok) mismatches += 1;
    if (meanDiff > maxAbsMeanDiff) maxAbsMeanDiff = meanDiff;
    rows.push({
      key,
      status: ok ? "match" : "mismatch",
      meanPrimary: a.mean,
      meanIndependent: b.mean,
      meanDiff,
      medianDiff,
      countPrimary: a.count,
      countIndependent: b.count,
      countMatch,
    });
  }

  return {
    bucketCount: keys.size,
    mismatches,
    maxAbsMeanDiff,
    pass: mismatches === 0,
    rows,
  };
}

/**
 * Fetch CoM hourly history for one sensor and compute its historical trend.
 */
export async function calculateLocationHistoricalTrend(
  dataBaseUrl,
  locationId,
  { since = "2024-01-01" } = {}
) {
  const where = encodeURIComponent(
    `location_id=${locationId} AND sensing_date>='${since}'`
  );
  const query = `delimiter=%2C&where=${where}`;
  const sourceUrl = `${dataBaseUrl}/${DATASETS.hourly}/exports/csv?${query}`;
  const rows = await fetchCsv(dataBaseUrl, DATASETS.hourly, query);
  const { buckets, used, skipped } = bucketHourlyRows(rows, locationId);
  const trend = trendFromBuckets(buckets);

  return {
    locationId,
    since,
    sourceDataset: DATASETS.hourly,
    sourceUrl,
    rawRowCount: rows.length,
    usedRowCount: used,
    skippedRowCount: skipped,
    bucketCount: trend.length,
    trend,
    buckets,
  };
}
