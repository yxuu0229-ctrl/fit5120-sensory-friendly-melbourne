import { DATASETS } from "./comDatasets";

export type HistoricalTrendPoint = {
  day_name: string;
  hourday: number;
  mean: number;
  median: number;
  std: number;
  count: number;
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function toNumber(value: unknown, fallback = NaN): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function dayNameFromDate(d: Date): string {
  return DAY_NAMES[d.getUTCDay()];
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function stddev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? "";
    });
    return row;
  });
}

/** Minimal CSV splitter that respects quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export async function calculateLocationHistoricalTrendFromCom(
  locationId: number,
  options?: { since?: string; dataBaseUrl?: string }
): Promise<{
  locationId: number;
  since: string;
  sourceDataset: string;
  sourceUrl: string;
  rawRowCount: number;
  usedRowCount: number;
  bucketCount: number;
  trend: HistoricalTrendPoint[];
}> {
  const since = options?.since ?? "2024-01-01";
  const dataBaseUrl = (
    options?.dataBaseUrl ||
    process.env.MELBOURNE_DATA_BASE_URL ||
    "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets"
  ).replace(/\/$/, "");

  const where = encodeURIComponent(
    `location_id=${locationId} AND sensing_date>='${since}'`
  );
  const query = `delimiter=%2C&where=${where}`;
  const sourceUrl = `${dataBaseUrl}/${DATASETS.hourly}/exports/csv?${query}`;

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(
      `City of Melbourne fetch failed: ${res.status} ${res.statusText}`
    );
  }

  const rows = parseCsv(await res.text());
  const buckets = new Map<string, number[]>();
  let used = 0;

  for (const row of rows) {
    const loc = toNumber(row.location_id ?? row.locationid, NaN);
    if (loc !== locationId) continue;

    const dateRaw = row.sensing_date || row.sensingdate || row.date;
    const hour = toNumber(row.hourday ?? row.hour ?? row.time, NaN);
    if (!dateRaw || !Number.isFinite(hour)) continue;

    const d = new Date(dateRaw);
    if (Number.isNaN(d.getTime())) continue;

    const count = toNumber(
      row.pedestriancount ??
        row.total_of_directions ??
        row.total_count ??
        row.count,
      NaN
    );
    if (!Number.isFinite(count)) continue;

    const key = `${dayNameFromDate(d)}|${hour}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(count);
    used += 1;
  }

  const trend: HistoricalTrendPoint[] = [];
  for (const [key, values] of buckets) {
    const [day_name, hourStr] = key.split("|");
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    trend.push({
      day_name,
      hourday: Number(hourStr),
      mean,
      median: median(sorted),
      std: stddev(values, mean),
      count: values.length,
    });
  }

  trend.sort((a, b) => {
    const di =
      DAY_NAMES.indexOf(a.day_name as (typeof DAY_NAMES)[number]) -
      DAY_NAMES.indexOf(b.day_name as (typeof DAY_NAMES)[number]);
    return di !== 0 ? di : a.hourday - b.hourday;
  });

  return {
    locationId,
    since,
    sourceDataset: DATASETS.hourly,
    sourceUrl,
    rawRowCount: rows.length,
    usedRowCount: used,
    bucketCount: trend.length,
    trend,
  };
}
