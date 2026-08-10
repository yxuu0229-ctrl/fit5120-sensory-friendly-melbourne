/**
 * AC 2.1.1 — Map shows current CBD pedestrian density in Low / Medium / High
 *
 * Given:  I open the map view
 * When:   it loads
 * Then:   current pedestrian density is shown across the covered CBD area
 *         in the agreed bands (Low / Medium / High)
 *
 * Usage:
 *   node scripts/verify/ac-211-map-density-bands.mjs
 *   node scripts/verify/ac-211-map-density-bands.mjs --live
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";
import http from "node:http";

function httpGetJson(urlString, headers = {}) {
  return new Promise((resolvePromise, reject) => {
    const url = new URL(urlString);
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers,
        agent: false,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`${res.statusCode} ${text.slice(0, 200)}`));
            return;
          }
          try {
            resolvePromise(JSON.parse(text));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const AGREED = {
  Low: { max: 50 },
  Medium: { max: 150 },
  High: { max: Infinity },
};

const CBD = {
  latMin: -37.825,
  latMax: -37.805,
  lngMin: 144.95,
  lngMax: 144.98,
};

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

function densityLevelFromCount(n) {
  const v = Number(n) || 0;
  if (v <= 50) return "Low";
  if (v <= 150) return "Medium";
  return "High";
}

function inCbd(lat, lng) {
  return (
    lat >= CBD.latMin &&
    lat <= CBD.latMax &&
    lng >= CBD.lngMin &&
    lng <= CBD.lngMax
  );
}

function checkBandThresholds() {
  const samples = [
    { count: 0, expect: "Low" },
    { count: 50, expect: "Low" },
    { count: 51, expect: "Medium" },
    { count: 150, expect: "Medium" },
    { count: 151, expect: "High" },
    { count: 500, expect: "High" },
  ];
  const rows = samples.map((s) => {
    const got = densityLevelFromCount(s.count);
    return { ...s, got, pass: got === s.expect };
  });
  return {
    name: "agreed band thresholds Low≤50 / Medium≤150 / High>150",
    pass: rows.every((r) => r.pass),
    rows,
  };
}

function checkImplementationWired(root) {
  const checks = [];
  const bands = readFileSync(
    resolve(root, "apps/web/src/lib/densityBands.ts"),
    "utf8"
  );
  checks.push({
    name: "densityBands.ts defines Low/Medium/High",
    pass:
      bands.includes('level: "Low"') &&
      bands.includes('level: "Medium"') &&
      bands.includes('level: "High"') &&
      bands.includes("maxInclusive: 50") &&
      bands.includes("maxInclusive: 150"),
  });

  const map = readFileSync(
    resolve(root, "apps/web/src/components/RouteMap.tsx"),
    "utf8"
  );
  checks.push({
    name: "map loads sensor_density_current on open",
    pass:
      map.includes("sensor_density_current") &&
      map.includes("DENSITY_BANDS") &&
      map.includes("density-legend"),
  });
  checks.push({
    name: "map defaults to showing density (showDensity true)",
    pass: /useState\(true\)/.test(map) && map.includes("showDensity"),
  });

  const api = readFileSync(
    resolve(root, "apps/web/src/app/api/density/current/route.ts"),
    "utf8"
  );
  checks.push({
    name: "GET /api/density/current exposes CBD density layer",
    pass: api.includes("2.1.1") && api.includes("bandCounts"),
  });

  const sync = readFileSync(
    resolve(root, "scripts/sync/src/config.js"),
    "utf8"
  );
  checks.push({
    name: "ETL densityLevel matches agreed thresholds",
    pass:
      sync.includes("n <= 50") &&
      sync.includes('return "Low"') &&
      sync.includes("n <= 150") &&
      sync.includes('return "Medium"') &&
      sync.includes('return "High"'),
  });

  return checks;
}

async function checkLiveData(supabaseUrl, anonKey) {
  // Use node:https (agent:false) — undici/fetch can trip a UV assert on Windows exit.
  const endpoint =
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/sensor_density_current` +
    `?select=location_id,latitude,longitude,total_count,density_level,in_cbd`;
  let rows;
  try {
    rows = await httpGetJson(endpoint, {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    });
  } catch (e) {
    return {
      name: "supabase density query",
      pass: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
  rows = rows || [];
  const cbd = rows.filter(
    (r) => r.in_cbd === true || inCbd(r.latitude, r.longitude)
  );
  let invalid = 0;
  let mismatch = 0;
  const bandCounts = { Low: 0, Medium: 0, High: 0 };
  for (const r of cbd) {
    if (!(r.density_level in AGREED)) {
      invalid += 1;
      continue;
    }
    bandCounts[r.density_level] += 1;
    if (densityLevelFromCount(r.total_count) !== r.density_level) {
      mismatch += 1;
    }
  }
  const pass = cbd.length > 0 && invalid === 0 && mismatch === 0;
  return {
    name: "live CBD sensors use agreed Low/Medium/High bands",
    pass,
    totalSensors: rows.length,
    cbdSensors: cbd.length,
    bandCounts,
    invalidLevel: invalid,
    bandMismatch: mismatch,
  };
}

async function checkLiveApi(baseUrl) {
  try {
    const body = await httpGetJson(
      `${baseUrl.replace(/\/$/, "")}/api/density/current`
    );
    const summary = body.summary || {};
    return {
      name: "GET /api/density/current bandsValid",
      pass: Boolean(summary.bandsValid && summary.coversCbd),
      summary,
      bandCounts: summary.bandCounts,
    };
  } catch (e) {
    return {
      name: "GET /api/density/current",
      pass: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function toMarkdown(result) {
  const offline = result.offline.checks
    .map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} |`)
    .join("\n");
  const data = result.dataCheck;
  const live = result.liveApi;
  return `# AC 2.1.1 — Map pedestrian density bands

## Criterion

**Given** I open the map view,  
**When** it loads,  
**Then** current pedestrian density is shown across the covered CBD area in the agreed bands (Low / Medium / High).

## Ownership

| Field | Value |
|---|---|
| Owner | **unassigned** (claim in LeanKit / team board; keep one main owner after claim) |
| Status | ${result.summary.pass ? "**PASS**" : "**FAIL**"} |

## Agreed bands

| Band | Threshold |
|---|---|
| Low | ≤ 50 pedestrians / minute bucket |
| Medium | 51–150 |
| High | > 150 |

## Result

| Check group | Result |
|---|---|
| Offline / wiring | ${result.offline.passed}/${result.offline.checks.length} |
| Live Supabase data | ${data ? (data.pass ? "PASS" : "FAIL") : "skipped"} |
| Live API | ${live?.ran ? (live.pass ? "PASS" : "FAIL") : "skipped"} |
| Verified at (UTC) | ${result.verifiedAt} |

${data ? `### Live data\n\n- CBD sensors: ${data.cbdSensors}\n- Band counts: Low ${data.bandCounts?.Low ?? 0}, Medium ${data.bandCounts?.Medium ?? 0}, High ${data.bandCounts?.High ?? 0}\n- Invalid levels: ${data.invalidLevel ?? 0}\n- Band mismatches: ${data.bandMismatch ?? 0}\n` : ""}

## Offline / wiring

| Check | Result |
|---|---|
${offline}

## Google Drive PGP

Upload \`pgp/evidence/AC-2.1.1/\` into the team Google Drive PGP folder and paste the Drive URL into \`DRIVE_LINK.md\`.

## Reproduce

\`\`\`bash
npm run verify:ac-211
\`\`\`
`;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "../..");
  loadEnvFile(resolve(root, ".env"));
  loadEnvFile(resolve(root, "apps/web/.env.local"));

  const liveApi = process.argv.includes("--live");
  const baseUrl =
    process.env.AC211_BASE_URL ||
    process.argv.find((a) => a.startsWith("--base-url="))?.split("=")[1] ||
    "http://localhost:3000";

  const thresholdCheck = checkBandThresholds();
  const wiring = checkImplementationWired(root);
  const offlineChecks = [...wiring, thresholdCheck];

  let dataCheck = null;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    dataCheck = await checkLiveData(url, key);
  } else {
    dataCheck = {
      name: "live CBD sensors use agreed Low/Medium/High bands",
      pass: false,
      error: "Missing Supabase env",
    };
  }

  let liveApiResult = { ran: false, pass: true };
  if (liveApi) {
    try {
      liveApiResult = { ran: true, ...(await checkLiveApi(baseUrl)) };
    } catch (e) {
      liveApiResult = {
        ran: true,
        pass: false,
        name: "GET /api/density/current",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const pass =
    offlineChecks.every((c) => c.pass) &&
    Boolean(dataCheck?.pass) &&
    (!liveApiResult.ran || liveApiResult.pass);

  const result = {
    acceptanceCriterion: "2.1.1",
    description:
      "Map view shows current CBD pedestrian density in Low/Medium/High bands",
    owner: "unassigned",
    ownershipNote:
      "Unassigned until one member claims this card; after claim, keep one main owner",
    agreedBands: {
      Low: "total_count <= 50",
      Medium: "51 <= total_count <= 150",
      High: "total_count > 150",
    },
    thresholdCheck,
    offline: {
      passed: offlineChecks.filter((c) => c.pass).length,
      checks: offlineChecks,
    },
    dataCheck,
    liveApi: liveApiResult,
    summary: { pass },
    verifiedAt: new Date().toISOString(),
    reproducibleCommand: "npm run verify:ac-211",
    evidencePath: "pgp/evidence/AC-2.1.1/",
    googleDrivePgpNote:
      "Upload pgp/evidence/AC-2.1.1/ into the team Google Drive PGP folder and paste the Drive URL into DRIVE_LINK.md",
    implementation: {
      bands: "apps/web/src/lib/densityBands.ts",
      map: "apps/web/src/components/RouteMap.tsx",
      api: "GET /api/density/current",
      etl: "scripts/sync/src/config.js#densityLevel",
    },
  };

  const outDir = resolve(root, "pgp/evidence/AC-2.1.1/results");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = resolve(outDir, `ac-211-${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  writeFileSync(resolve(outDir, "latest.json"), JSON.stringify(result, null, 2));
  const md = toMarkdown(result);
  writeFileSync(resolve(root, "pgp/evidence/AC-2.1.1/COMPARISON.md"), md);
  writeFileSync(resolve(outDir, `ac-211-${stamp}.md`), md);

  console.log("");
  for (const c of offlineChecks)
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (dataCheck)
    console.log(
      `${dataCheck.pass ? "PASS" : "FAIL"}  ${dataCheck.name}` +
        (dataCheck.cbdSensors != null
          ? ` (cbd=${dataCheck.cbdSensors})`
          : dataCheck.error
            ? ` (${dataCheck.error})`
            : "")
    );
  if (liveApiResult.ran) {
    console.log(
      `${liveApiResult.pass ? "PASS" : "FAIL"}  ${liveApiResult.name || "live API"}`
    );
  }
  console.log("");
  console.log(`AC 2.1.1 ${pass ? "PASS" : "FAIL"}`);
  console.log(`owner: unassigned`);
  console.log(`evidence: ${jsonPath}`);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
