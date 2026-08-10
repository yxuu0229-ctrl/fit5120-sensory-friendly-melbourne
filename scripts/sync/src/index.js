import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "./loadEnv.js";
import { getConfig } from "./config.js";
import { syncSensors } from "./syncSensors.js";
import { syncLive } from "./syncLive.js";
import { syncQuietWindows } from "./syncQuietWindows.js";
import { syncPlaces } from "./syncPlaces.js";

loadEnvFile();

function parseArgs(argv) {
  const full = argv.includes("--full");
  const withQuiet =
    full || argv.includes("--quiet-windows") || shouldRunQuietWindows();
  const withPlaces = full || argv.includes("--places") || shouldRunPlaces();
  return { full, withQuiet, withPlaces };
}

/** Run quiet_windows refresh once per UTC day (or when --full). */
function shouldRunQuietWindows() {
  if (process.env.SYNC_QUIET_WINDOWS === "1") return true;
  // Heuristic: first cron window of the UTC day (00:00–00:14)
  const now = new Date();
  return now.getUTCHours() === 0 && now.getUTCMinutes() < 15;
}

/** Run places refresh weekly on Sunday UTC or when --full. */
function shouldRunPlaces() {
  if (process.env.SYNC_PLACES === "1") return true;
  const now = new Date();
  return (
    now.getUTCDay() === 0 &&
    now.getUTCHours() === 0 &&
    now.getUTCMinutes() < 15
  );
}

async function main() {
  const { supabaseUrl, serviceRoleKey, dataBaseUrl } = getConfig();
  const { full, withQuiet, withPlaces } = parseArgs(process.argv.slice(2));
  const mode = full
    ? "full"
    : `live${withQuiet ? "+quiet" : ""}${withPlaces ? "+places" : ""}`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: run, error: runErr } = await supabase
    .from("sync_runs")
    .insert({ status: "running", mode })
    .select("id")
    .single();

  if (runErr) {
    throw new Error(`Could not create sync_runs row: ${runErr.message}`);
  }

  const rowsUpserted = {};
  try {
    Object.assign(rowsUpserted, await syncSensors(supabase, dataBaseUrl));
    Object.assign(rowsUpserted, await syncLive(supabase, dataBaseUrl));

    if (withQuiet) {
      Object.assign(
        rowsUpserted,
        await syncQuietWindows(supabase, dataBaseUrl)
      );
    } else {
      console.log("Skipping quiet_windows (use --full or --quiet-windows)");
    }

    if (withPlaces) {
      Object.assign(rowsUpserted, await syncPlaces(supabase, dataBaseUrl));
    } else {
      console.log("Skipping places (use --full or --places)");
    }

    const { error: finishErr } = await supabase
      .from("sync_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        rows_upserted: rowsUpserted,
      })
      .eq("id", run.id);

    if (finishErr) {
      throw new Error(`Failed to finalize sync_runs: ${finishErr.message}`);
    }

    console.log("Sync complete:", rowsUpserted);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("sync_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        rows_upserted: rowsUpserted,
        error: message,
      })
      .eq("id", run.id);
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
