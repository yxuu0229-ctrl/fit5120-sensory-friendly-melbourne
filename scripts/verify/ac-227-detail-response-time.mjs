/**
 * AC 2.2.7 — Detail view query response-time verification
 *
 * Given: a sensor detail view is requested
 * When:  the detail query runs (sensor snapshot + pedestrian_live series)
 * Then:  every run completes within DETAIL_VIEW_SLA_MS (default 2000 ms)
 *
 * Usage (from repo root):
 *   node scripts/verify/ac-227-detail-response-time.mjs
 *   node scripts/verify/ac-227-detail-response-time.mjs --runs 10 --location-id 20
 *
 * Writes a JSON result under pgp/evidence/AC-2.2.7/results/
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const SLA_MS = Number(process.env.DETAIL_VIEW_SLA_MS || 2000);
const DEFAULT_RUNS = 5;

function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const out = { runs: DEFAULT_RUNS, locationId: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--runs") out.runs = Number(argv[++i]);
    else if (a === "--location-id") out.locationId = Number(argv[++i]);
    else if (a === "--sla-ms") out.slaMs = Number(argv[++i]);
  }
  return out;
}

async function pickLocationId(supabase, preferred) {
  if (preferred && Number.isFinite(preferred)) return preferred;
  const { data, error } = await supabase
    .from("pedestrian_live")
    .select("location_id")
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error(
      "No pedestrian_live rows — run npm run sync (or sync:full) first"
    );
  }
  return data[0].location_id;
}

async function runDetailQuery(supabase, locationId) {
  const started = performance.now();
  const [sensorRes, seriesRes] = await Promise.all([
    supabase
      .from("sensor_density_current")
      .select("*")
      .eq("location_id", locationId)
      .maybeSingle(),
    supabase
      .from("pedestrian_live")
      .select(
        "sensing_datetime, total_count, density_level, direction_1, direction_2"
      )
      .eq("location_id", locationId)
      .order("sensing_datetime", { ascending: false })
      .limit(120),
  ]);
  const queryMs = Math.round(performance.now() - started);
  if (sensorRes.error) throw new Error(sensorRes.error.message);
  if (seriesRes.error) throw new Error(seriesRes.error.message);
  return {
    queryMs,
    seriesCount: seriesRes.data?.length ?? 0,
    hasSensor: Boolean(sensorRes.data),
  };
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "../..");
  loadEnvFile(resolve(root, ".env"));
  loadEnvFile(resolve(root, ".env.local"));

  const args = parseArgs(process.argv.slice(2));
  const slaMs = args.slaMs || SLA_MS;
  const runs = Number.isFinite(args.runs) && args.runs > 0 ? args.runs : DEFAULT_RUNS;

  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "Missing Supabase URL/key. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or the NEXT_PUBLIC_ equivalents)."
    );
    process.exit(2);
  }

  const supabase = createClient(url, key);
  const locationId = await pickLocationId(supabase, args.locationId);

  const samples = [];
  for (let i = 1; i <= runs; i++) {
    const sample = await runDetailQuery(supabase, locationId);
    samples.push({ run: i, ...sample, withinSla: sample.queryMs <= slaMs });
    console.log(
      `run ${i}/${runs}: ${sample.queryMs} ms · series=${sample.seriesCount} · withinSla=${sample.queryMs <= slaMs}`
    );
  }

  const durations = samples.map((s) => s.queryMs);
  const maxMs = Math.max(...durations);
  const avgMs = Math.round(
    durations.reduce((a, b) => a + b, 0) / durations.length
  );
  const pass = samples.every((s) => s.withinSla);

  const result = {
    acceptanceCriterion: "2.2.7",
    description:
      "Detail view query returns within the agreed response time",
    agreedSlaMs: slaMs,
    locationId,
    runs,
    samples,
    summary: { avgMs, maxMs, pass },
    verifiedAt: new Date().toISOString(),
    reproducibleCommand:
      "node scripts/verify/ac-227-detail-response-time.mjs --runs 5",
    evidencePath: "pgp/evidence/AC-2.2.7/",
  };

  const outDir = resolve(root, "pgp/evidence/AC-2.2.7/results");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = resolve(outDir, `ac-227-${stamp}.json`);
  writeFileSync(outFile, JSON.stringify(result, null, 2));
  writeFileSync(
    resolve(outDir, "latest.json"),
    JSON.stringify(result, null, 2)
  );

  console.log("");
  console.log(`AC 2.2.7 ${pass ? "PASS" : "FAIL"}`);
  console.log(`location_id=${locationId} avg=${avgMs}ms max=${maxMs}ms sla=${slaMs}ms`);
  console.log(`evidence: ${outFile}`);

  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
