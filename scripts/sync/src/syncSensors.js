import { DATASETS, inCbd } from "./config.js";
import { fetchCsv, toNumber, upsertInChunks } from "./fetchCsv.js";

function pickLatLng(row) {
  const lat = toNumber(row.latitude ?? row.lat, NaN);
  const lng = toNumber(row.longitude ?? row.long ?? row.lng, NaN);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return { lat: null, lng: null };
}

export async function syncSensors(supabase, dataBaseUrl) {
  const rows = await fetchCsv(dataBaseUrl, DATASETS.sensors);
  const sensors = [];

  for (const row of rows) {
    const locationId = toNumber(row.location_id ?? row.sensor_id, NaN);
    const { lat, lng } = pickLatLng(row);
    if (!Number.isFinite(locationId) || lat === null || lng === null) continue;

    sensors.push({
      location_id: locationId,
      sensor_name: row.sensor_name || row.sensorname || null,
      sensor_description: row.sensor_description || row.sensordescription || null,
      status: row.status || null,
      status_label: row.status_label || row.statuslabel || null,
      is_active:
        String(row.status || "").toUpperCase() === "A" ||
        String(row.status_label || "").toLowerCase() === "active",
      location_type: row.location_type || row.locationtype || null,
      direction_1: row.direction_1 || row.direction1 || null,
      direction_2: row.direction_2 || row.direction2 || null,
      directions: row.directions || null,
      latitude: lat,
      longitude: lng,
      in_cbd: inCbd(lat, lng),
      updated_at: new Date().toISOString(),
    });
  }

  const count = await upsertInChunks(
    supabase,
    "sensors",
    sensors,
    "location_id"
  );
  console.log(`Upserted ${count} sensors`);
  return { sensors: count };
}
