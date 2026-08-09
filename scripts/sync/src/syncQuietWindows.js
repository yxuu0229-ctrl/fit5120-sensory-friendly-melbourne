import { DATASETS } from "./config.js";
import { fetchCsv, upsertInChunks } from "./fetchCsv.js";
import { bucketHourlyRows, trendFromBuckets } from "./historicalTrend.js";

/**
 * Recompute quiet_windows from recent hourly historical counts.
 * Uses sensing_date >= 2024-01-01 to keep the download manageable.
 */
export async function syncQuietWindows(supabase, dataBaseUrl) {
  const query =
    "delimiter=%2C&where=sensing_date%20%3E%3D%20%272024-01-01%27";
  const rows = await fetchCsv(dataBaseUrl, DATASETS.hourly, query);
  const { buckets } = bucketHourlyRows(rows);
  const quietRows = trendFromBuckets(buckets).map((row) => ({
    ...row,
    updated_at: new Date().toISOString(),
  }));

  const count = await upsertInChunks(
    supabase,
    "quiet_windows",
    quietRows,
    "day_name,hourday"
  );
  console.log(`Upserted ${count} quiet_windows rows`);
  return { quiet_windows: count };
}
