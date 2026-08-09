const DEFAULT_BASE =
  "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets";

export function getConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dataBaseUrl =
    process.env.MELBOURNE_DATA_BASE_URL?.replace(/\/$/, "") || DEFAULT_BASE;

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  }
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return { supabaseUrl, serviceRoleKey, dataBaseUrl };
}

export const DATASETS = {
  pastHour: "pedestrian-counting-system-past-hour-counts-per-minute",
  sensors: "pedestrian-counting-system-sensor-locations",
  hourly: "pedestrian-counting-system-monthly-counts-per-hour",
  landmarks:
    "landmarks-and-places-of-interest-including-schools-theatres-health-services-spor",
  toilets: "public-toilets",
};

/** Density bins from sensory_dashboard.py */
export function densityLevel(totalCount) {
  const n = Number(totalCount) || 0;
  if (n <= 50) return "Low";
  if (n <= 150) return "Medium";
  return "High";
}

/**
 * Minimum observations behind a per-location hourly estimate before it is
 * treated as reliable (AC 2.2.6).
 *
 * The hourly dataset carries one reading per (sensor, date, hour), so a bucket
 * gains roughly one sample per week. 12 is about three months of coverage for
 * that weekday-hour — enough to be more than noise, low enough that recently
 * installed sensors become usable within a season.
 */
export const MIN_RELIABLE_SAMPLES = 12;

export const CBD = {
  latMin: -37.825,
  latMax: -37.805,
  lngMin: 144.95,
  lngMax: 144.98,
};

export function inCbd(lat, lng) {
  return (
    lat >= CBD.latMin &&
    lat <= CBD.latMax &&
    lng >= CBD.lngMin &&
    lng <= CBD.lngMax
  );
}
