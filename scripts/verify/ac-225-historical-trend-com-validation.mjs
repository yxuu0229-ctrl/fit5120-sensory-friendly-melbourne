/**
 * AC 2.2.5 — Historical trend vs City of Melbourne data validation
 *
 * Given:  historical trend for a location is calculated
 * When:   the team validates it against available City of Melbourne data
 * Then:   the comparison and its result are recorded as evidence in the PGP
 *
 * Usage (repo root):
 *   node scripts/verify/ac-225-historical-trend-com-validation.mjs
 *   node scripts/verify/ac-225-historical-trend-com-validation.mjs --location-id 3
 *
 * Writes machine + human evidence under pgp/evidence/AC-2.2.5/
 * Upload that folder into the team Google Drive PGP.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  const out = { locationId: 3, since: "2024-01-01" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--location-id") out.locationId = Number(argv[++i]);
    else if (a === "--since") out.since = argv[++i];
  }
  return out;
}

function round(n, digits = 4) {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

async function spotCheckComRecords(dataBaseUrl, dataset, locationId, since, limit = 25) {
  const where = encodeURIComponent(
    `location_id=${locationId} AND sensing_date>='${since}'`
  );
  const url = `${dataBaseUrl}/${dataset}/records?limit=${limit}&where=${where}`;
  const res = await fetch(url);
  if (!res.ok) {
    return {
      ok: false,
      error: `records API ${res.status}`,
      url,
      checked: 0,
      matched: 0,
    };
  }
  const body = await res.json();
  const records = body.records || body.results || [];
  return { ok: true, url, records, checked: records.length };
}

function validateSpotSamples(records, buckets) {
  let matched = 0;
  const samples = [];
  for (const rec of records) {
    const fields = rec.record?.fields || rec.fields || rec;
    const dateRaw = fields.sensing_date || fields.sensingdate;
    const hour = Number(fields.hourday ?? fields.hour);
    const count = Number(
      fields.pedestriancount ??
        fields.total_of_directions ??
        fields.total_count ??
        fields.count
    );
    if (!dateRaw || !Number.isFinite(hour) || !Number.isFinite(count)) continue;
    const d = new Date(dateRaw);
    const day = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][d.getUTCDay()];
    const key = `${day}|${hour}`;
    const values = buckets.get(key) || [];
    const inBucket = values.some((v) => Math.abs(v - count) < 1e-9);
    if (inBucket) matched += 1;
    samples.push({
      sensing_date: dateRaw,
      hourday: hour,
      count,
      bucket: key,
      foundInCalculatedTrendBucket: inBucket,
    });
  }
  return { matched, samples };
}

function toMarkdown(result) {
  const { comparison, locationId, summary } = result;
  const sampleRows = comparison.rows
    .filter((r) => r.status === "match")
    .slice(0, 12)
    .map(
      (r) =>
        `| ${r.key} | ${round(r.meanPrimary)} | ${round(r.meanIndependent)} | ${r.meanDiff} | ${r.countPrimary} |`
    )
    .join("\n");

  return `# AC 2.2.5 — Historical trend validation evidence

## Criterion

**Given** the historical trend for a location is calculated,  
**When** the team validates it against available City of Melbourne data,  
**Then** the comparison and its result are recorded as evidence in the PGP.

## Result

| Field | Value |
|---|---|
| Status | **${summary.pass ? "PASS" : "FAIL"}** |
| Location ID | ${locationId} |
| Source dataset | \`${result.sourceDataset}\` |
| Since | ${result.since} |
| Raw CoM rows used | ${result.usedRowCount} |
| Trend buckets | ${comparison.bucketCount} |
| Bucket mismatches | ${comparison.mismatches} |
| Max \\|Δ mean\\| | ${comparison.maxAbsMeanDiff} |
| Spot-check matches | ${result.spotCheck.matched}/${result.spotCheck.samples.length} |
| Verified at (UTC) | ${result.verifiedAt} |

## Source

- Export URL: ${result.sourceUrl}
- Records API (spot-check): ${result.spotCheck.url}

## Comparison method

1. Download City of Melbourne hourly pedestrian counts for the location.
2. Calculate the production historical trend (mean / median / std by day × hour).
3. Re-aggregate the **same CoM rows** with an independent reducer.
4. Require every bucket mean/median/count to match (abs tol 1e-6).
5. Spot-check live CoM Records API samples appear in the calculated buckets.

## Sample matched buckets

| Bucket (day\\|hour) | Production mean | Independent mean | \\|Δ\\| | n |
|---|---:|---:|---:|---:|
${sampleRows || "| — | — | — | — | — |"}

## Google Drive PGP

Upload this entire folder (\`pgp/evidence/AC-2.2.5/\`) into the team Project Governance Portfolio Google Drive folder, under an \`AC-2.2.5\` (or equivalent) evidence path. Record the Drive link in \`DRIVE_LINK.md\`.

## Reproduce

\`\`\`bash
npm run verify:ac-225
\`\`\`
`;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "../..");
  loadEnvFile(resolve(root, ".env"));
  loadEnvFile(resolve(root, "apps/web/.env.local"));

  const args = parseArgs(process.argv.slice(2));
  const dataBaseUrl = (
    process.env.MELBOURNE_DATA_BASE_URL ||
    "https://data.melbourne.vic.gov.au/api/v2/catalog/datasets"
  ).replace(/\/$/, "");

  const trendModuleUrl = pathToFileURL(
    resolve(root, "scripts/sync/src/historicalTrend.js")
  ).href;
  const {
    calculateLocationHistoricalTrend,
    independentTrendFromBuckets,
    compareTrends,
  } = await import(trendModuleUrl);

  console.log(
    `Calculating historical trend for location_id=${args.locationId} from City of Melbourne…`
  );
  const calculated = await calculateLocationHistoricalTrend(
    dataBaseUrl,
    args.locationId,
    { since: args.since }
  );

  if (calculated.usedRowCount === 0) {
    console.error(
      "No CoM rows for this location/date filter. Try another --location-id."
    );
    process.exit(2);
  }

  const independent = independentTrendFromBuckets(calculated.buckets);
  const comparison = compareTrends(calculated.trend, independent);

  const spotMeta = await spotCheckComRecords(
    dataBaseUrl,
    calculated.sourceDataset,
    args.locationId,
    args.since
  );
  let spotCheck = {
    url: spotMeta.url,
    matched: 0,
    samples: [],
    error: spotMeta.error,
  };
  if (spotMeta.ok) {
    const validated = validateSpotSamples(spotMeta.records, calculated.buckets);
    spotCheck = {
      url: spotMeta.url,
      matched: validated.matched,
      samples: validated.samples,
    };
  }

  const spotPass =
    spotCheck.samples.length === 0
      ? false
      : spotCheck.matched === spotCheck.samples.length;
  const pass = comparison.pass && spotPass;

  const quietSummary = calculated.trend
    .slice()
    .sort((a, b) => a.mean - b.mean)
    .slice(0, 5)
    .map((t) => ({
      day_name: t.day_name,
      hourday: t.hourday,
      mean: round(t.mean),
      median: round(t.median),
      count: t.count,
    }));

  const result = {
    acceptanceCriterion: "2.2.5",
    description:
      "Historical trend for a location validated against City of Melbourne data",
    locationId: args.locationId,
    since: args.since,
    sourceDataset: calculated.sourceDataset,
    sourceUrl: calculated.sourceUrl,
    rawRowCount: calculated.rawRowCount,
    usedRowCount: calculated.usedRowCount,
    skippedRowCount: calculated.skippedRowCount,
    calculatedTrendBucketCount: calculated.bucketCount,
    quietestBuckets: quietSummary,
    comparison: {
      bucketCount: comparison.bucketCount,
      mismatches: comparison.mismatches,
      maxAbsMeanDiff: comparison.maxAbsMeanDiff,
      pass: comparison.pass,
      // Keep evidence readable — store mismatches + a capped match sample
      rows: [
        ...comparison.rows.filter((r) => r.status !== "match"),
        ...comparison.rows.filter((r) => r.status === "match").slice(0, 24),
      ],
    },
    spotCheck,
    summary: {
      pass,
      comparisonPass: comparison.pass,
      spotCheckPass: spotPass,
    },
    verifiedAt: new Date().toISOString(),
    reproducibleCommand:
      "node scripts/verify/ac-225-historical-trend-com-validation.mjs --location-id " +
      args.locationId,
    evidencePath: "pgp/evidence/AC-2.2.5/",
    googleDrivePgpNote:
      "Upload pgp/evidence/AC-2.2.5/ into the team Google Drive PGP folder and paste the Drive URL into DRIVE_LINK.md",
  };

  // Drop internal Map before serialize
  delete calculated.buckets;

  const outDir = resolve(root, "pgp/evidence/AC-2.2.5/results");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = resolve(outDir, `ac-225-${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  writeFileSync(resolve(outDir, "latest.json"), JSON.stringify(result, null, 2));

  const md = toMarkdown(result);
  writeFileSync(resolve(root, "pgp/evidence/AC-2.2.5/COMPARISON.md"), md);
  writeFileSync(resolve(outDir, `ac-225-${stamp}.md`), md);

  console.log("");
  console.log(`AC 2.2.5 ${pass ? "PASS" : "FAIL"}`);
  console.log(
    `location_id=${args.locationId} buckets=${comparison.bucketCount} mismatches=${comparison.mismatches} spot=${spotCheck.matched}/${spotCheck.samples.length}`
  );
  console.log(`evidence: ${jsonPath}`);
  console.log(
    "Upload pgp/evidence/AC-2.2.5/ to the team Google Drive PGP folder."
  );

  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
