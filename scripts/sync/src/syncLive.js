import { DATASETS, densityLevel } from "./config.js";
import { fetchCsv, toNumber, upsertInChunks } from "./fetchCsv.js";

/**
 * Sync past-hour pedestrian counts into pedestrian_live and
 * refresh sensor_density_current from the latest reading per sensor.
 */
export async function syncLive(supabase, dataBaseUrl) {
  const rows = await fetchCsv(dataBaseUrl, DATASETS.pastHour);

  /** @type {Map<string, object>} */
  const byKey = new Map();
  /** @type {Map<number, object>} */
  const latestBySensor = new Map();

  for (const row of rows) {
    const locationId = toNumber(row.location_id ?? row.sensor_id, NaN);
    if (!Number.isFinite(locationId)) continue;

    const rawDt =
      row.sensing_datetime ||
      row.sensingdatetime ||
      row.date_time ||
      row.datetime;
    if (!rawDt) continue;

    const dt = new Date(rawDt);
    if (Number.isNaN(dt.getTime())) continue;

    const d1 = toNumber(row.direction_1 ?? row.direction1, 0);
    const d2 = toNumber(row.direction_2 ?? row.direction2, 0);
    const total =
      toNumber(row.total_of_directions ?? row.total_count, NaN) || d1 + d2;

    const sensingIso = dt.toISOString();
    const record = {
      location_id: locationId,
      sensing_datetime: sensingIso,
      direction_1: d1,
      direction_2: d2,
      total_count: total,
      density_level: densityLevel(total),
    };

    byKey.set(`${locationId}|${sensingIso}`, record);

    const prev = latestBySensor.get(locationId);
    if (!prev || new Date(prev.sensing_datetime) < dt) {
      latestBySensor.set(locationId, record);
    }
  }

  const liveRows = [...byKey.values()];

  // Only upsert rows whose location_id exists in sensors (FK)
  const { data: sensorIds, error: sensorErr } = await supabase
    .from("sensors")
    .select("location_id, sensor_name, latitude, longitude, in_cbd");
  if (sensorErr) {
    throw new Error(`Failed to load sensors for FK filter: ${sensorErr.message}`);
  }

  const sensorMap = new Map(
    (sensorIds || []).map((s) => [s.location_id, s])
  );

  const liveFiltered = liveRows.filter((r) => sensorMap.has(r.location_id));
  const liveCount = await upsertInChunks(
    supabase,
    "pedestrian_live",
    liveFiltered,
    "location_id,sensing_datetime"
  );
  console.log(`Upserted ${liveCount} pedestrian_live rows`);

  const currentRows = [];
  for (const [locationId, live] of latestBySensor) {
    const sensor = sensorMap.get(locationId);
    if (!sensor) continue;
    currentRows.push({
      location_id: locationId,
      sensor_name: sensor.sensor_name,
      latitude: sensor.latitude,
      longitude: sensor.longitude,
      in_cbd: sensor.in_cbd,
      total_count: live.total_count,
      density_level: live.density_level,
      sensing_datetime: live.sensing_datetime,
      updated_at: new Date().toISOString(),
    });
  }

  const currentCount = await upsertInChunks(
    supabase,
    "sensor_density_current",
    currentRows,
    "location_id"
  );
  console.log(`Upserted ${currentCount} sensor_density_current rows`);

  return {
    pedestrian_live: liveCount,
    sensor_density_current: currentCount,
  };
}
