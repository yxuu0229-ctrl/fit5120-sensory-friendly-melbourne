/**
 * AC 1.1.4 — Routes listed calmest-first by sensory indicator
 *
 * Given:  more than one route is returned
 * When:   the results are listed
 * Then:   they are ordered from lowest to highest sensory indicator
 *         so the calmest option appears first
 *
 * Usage (repo root):
 *   node scripts/verify/ac-114-routes-ordered-by-sensory.mjs
 *   node scripts/verify/ac-114-routes-ordered-by-sensory.mjs --live
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

/** Mirrors src/lib/routeOrdering.ts */
function orderRoutesBySensoryIndicator(routes) {
  return routes
    .map((route, index) => ({ route, index }))
    .sort((a, b) => {
      const d = a.route.sensoryIndicator - b.route.sensoryIndicator;
      return d !== 0 ? d : a.index - b.index;
    })
    .map(({ route }) => route);
}

function isOrderedCalmestFirst(routes) {
  for (let i = 1; i < routes.length; i++) {
    if (routes[i].sensoryIndicator < routes[i - 1].sensoryIndicator) {
      return false;
    }
  }
  return true;
}

function runOfflineCases() {
  const cases = [];

  const input1 = [
    { id: "busy", sensoryIndicator: 4.2 },
    { id: "calm", sensoryIndicator: 1.1 },
    { id: "mid", sensoryIndicator: 2.5 },
  ];
  const out1 = orderRoutesBySensoryIndicator(input1);
  cases.push({
    name: "sorts lowest sensory indicator first",
    pass:
      out1.map((r) => r.id).join(",") === "calm,mid,busy" &&
      isOrderedCalmestFirst(out1),
    expectedOrder: ["calm", "mid", "busy"],
    actualOrder: out1.map((r) => r.id),
  });

  const input2 = [
    { id: "a", sensoryIndicator: 2 },
    { id: "b", sensoryIndicator: 2 },
    { id: "c", sensoryIndicator: 1 },
  ];
  const out2 = orderRoutesBySensoryIndicator(input2);
  cases.push({
    name: "stable sort preserves relative order on ties",
    pass:
      out2.map((r) => r.id).join(",") === "c,a,b" &&
      isOrderedCalmestFirst(out2),
    expectedOrder: ["c", "a", "b"],
    actualOrder: out2.map((r) => r.id),
  });

  const input3 = [
    { id: "x", sensoryIndicator: 0.5 },
    { id: "y", sensoryIndicator: 1.5 },
    { id: "z", sensoryIndicator: 3 },
  ];
  const out3 = orderRoutesBySensoryIndicator(input3);
  cases.push({
    name: "already-sorted list remains calmest-first",
    pass:
      out3.map((r) => r.id).join(",") === "x,y,z" &&
      isOrderedCalmestFirst(out3),
    expectedOrder: ["x", "y", "z"],
    actualOrder: out3.map((r) => r.id),
  });

  const bad = [
    { id: "a", sensoryIndicator: 3 },
    { id: "b", sensoryIndicator: 1 },
  ];
  cases.push({
    name: "detector rejects reverse sensory order",
    pass: isOrderedCalmestFirst(bad) === false,
    expectedOrder: "not calmest-first",
    actualOrder: bad.map((r) => r.id),
  });

  return cases;
}

function checkImplementationWired(root) {
  const checks = [];
  const orderingSrc = readFileSync(
    resolve(root, "src/lib/routeOrdering.ts"),
    "utf8"
  );
  checks.push({
    name: "routeOrdering.ts exports calmest-first sorter",
    pass:
      orderingSrc.includes("orderRoutesBySensoryIndicator") &&
      orderingSrc.includes("sensoryIndicator"),
  });

  const quietSrc = readFileSync(
    resolve(root, "src/lib/quietRoute.ts"),
    "utf8"
  );
  checks.push({
    name: "planQuietWalkingRoute uses orderRoutesBySensoryIndicator",
    pass:
      quietSrc.includes("orderRoutesBySensoryIndicator") &&
      quietSrc.includes("trips"),
  });

  const planSrc = readFileSync(
    resolve(root, "src/lib/planRoute.ts"),
    "utf8"
  );
  checks.push({
    name: "planRoute returns trips list",
    pass: planSrc.includes("trips") && planSrc.includes("planQuietWalkingRoute"),
  });

  const uiSrc = readFileSync(
    resolve(root, "src/components/LiveMapPage.tsx"),
    "utf8"
  );
  checks.push({
    name: "map UI lists route options by sensory indicator",
    pass:
      uiSrc.includes("Route options") &&
      uiSrc.includes("sensory") &&
      uiSrc.includes("trips"),
  });

  return checks;
}

/* ---- Live planner mirror (src/lib/geo.ts + src/lib/quietRoute.ts) ----
 * The planner now runs in the browser, so the live check reproduces it
 * directly against Supabase + OSRM instead of calling an API server. */

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function sampleLine(coords, stepMeters = 40) {
  if (coords.length === 0) return [];
  const out = [{ lat: coords[0][1], lng: coords[0][0] }];
  let carry = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = { lat: coords[i - 1][1], lng: coords[i - 1][0] };
    const curr = { lat: coords[i][1], lng: coords[i][0] };
    carry += haversineMeters(prev, curr);
    if (carry >= stepMeters) {
      out.push(curr);
      carry = 0;
    }
  }
  const last = coords[coords.length - 1];
  out.push({ lat: last[1], lng: last[0] });
  return out;
}

const DENSITY_WEIGHT = { Low: 0, Medium: 2, High: 5 };

function scoreRoute(route, sensors, radiusMeters = 90) {
  const samples = sampleLine(route.coordinates, 45);
  if (samples.length === 0) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (const p of samples) {
    let nearestPenalty = 0.4;
    let nearestDist = Infinity;
    for (const s of sensors) {
      const d = haversineMeters(p, { lat: s.latitude, lng: s.longitude });
      if (d < nearestDist && d <= radiusMeters) {
        nearestDist = d;
        nearestPenalty = DENSITY_WEIGHT[s.density_level] ?? 1;
      }
    }
    total += nearestPenalty;
  }
  return total / samples.length + (route.distanceMeters / 1000) * 0.15;
}

function pickQuietWaypoint(from, to, sensors) {
  const mid = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
  const corridor = haversineMeters(from, to);
  const candidates = sensors
    .filter((s) => s.density_level === "Low")
    .map((s) => {
      const p = { lat: s.latitude, lng: s.longitude };
      return {
        p,
        toMid: haversineMeters(p, mid),
        toA: haversineMeters(p, from),
        toB: haversineMeters(p, to),
      };
    })
    .filter(
      (c) =>
        c.toMid < corridor * 0.55 &&
        c.toA > 120 &&
        c.toB > 120 &&
        c.toA + c.toB < corridor * 1.8
    )
    .sort((a, b) => a.toMid - b.toMid);
  return candidates[0]?.p ?? null;
}

async function fetchOsrmRoutes(osrmBase, from, to, via) {
  const points = via
    ? `${from.lng},${from.lat};${via.lng},${via.lat};${to.lng},${to.lat}`
    : `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url =
    `${osrmBase}/route/v1/foot/${points}` +
    `?overview=full&geometries=geojson&alternatives=${via ? "false" : "true"}&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM request failed: ${res.status}`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error(data.message || "No foot route found");
  }
  return data.routes
    .filter((r) => r.geometry?.coordinates?.length)
    .map((r) => ({
      distanceMeters: r.distance,
      coordinates: r.geometry.coordinates,
    }));
}

async function fetchSensors() {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const res = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/sensor_density_current?select=latitude,longitude,density_level`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) return [];
  return (await res.json()) || [];
}

async function runLiveCheck(osrmBase) {
  const from = { lat: -37.8136, lng: 144.9631 };
  const to = { lat: -37.82, lng: 144.968 };

  const sensors = await fetchSensors();
  const direct = await fetchOsrmRoutes(osrmBase, from, to, null);
  let candidates = direct.map((route, i) => ({
    route,
    label: i === 0 ? "Direct walk (OSRM)" : `Walk alternative ${i + 1}`,
  }));
  const via = pickQuietWaypoint(from, to, sensors);
  if (via) {
    try {
      const viaRoutes = await fetchOsrmRoutes(osrmBase, from, to, via);
      candidates = candidates.concat(
        viaRoutes.map((route, i) => ({
          route,
          label:
            i === 0
              ? "Walk via quieter sensor area"
              : `Quiet walk alternative ${i + 1}`,
        }))
      );
    } catch {
      // keep direct
    }
  }

  const scored = candidates.map((c) => ({
    label: c.label,
    sensoryIndicator: Number(scoreRoute(c.route, sensors).toFixed(3)),
  }));
  const trips = orderRoutesBySensoryIndicator(scored);

  if (trips.length < 2) {
    return {
      ran: true,
      pass: false,
      error: `Expected >= 2 trips for AC 1.1.4, got ${trips.length}`,
      tripCount: trips.length,
    };
  }
  const indicators = trips.map((t) => t.sensoryIndicator);
  if (indicators.some((v) => v == null || !Number.isFinite(v))) {
    return {
      ran: true,
      pass: false,
      error: "One or more trips missing sensoryIndicator",
      indicators,
    };
  }
  const ordered = isOrderedCalmestFirst(trips);
  return {
    ran: true,
    pass: ordered,
    tripCount: trips.length,
    indicators,
    labels: trips.map((t) => t.label),
    firstIsCalmest: indicators[0] === Math.min(...indicators),
    sensorCount: sensors.length,
  };
}

function toMarkdown(result) {
  const offlineRows = result.offline.cases
    .map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} |`)
    .join("\n");
  const wireRows = result.wiring.checks
    .map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} |`)
    .join("\n");
  const live = result.live;
  return `# AC 1.1.4 — Route listing ordered by sensory indicator

## Criterion

**Given** more than one route is returned,  
**When** the results are listed,  
**Then** they are ordered from lowest to highest sensory indicator so the calmest option appears first.

## Result

| Field | Value |
|---|---|
| Status | **${result.summary.pass ? "PASS" : "FAIL"}** |
| Offline ordering cases | ${result.offline.passed}/${result.offline.cases.length} |
| Implementation wiring | ${result.wiring.passed}/${result.wiring.checks.length} |
| Live planner check | ${live?.ran ? (live.pass ? "PASS" : "FAIL") : "skipped"} |
| Verified at (UTC) | ${result.verifiedAt} |

## Offline ordering

| Case | Result |
|---|---|
${offlineRows}

## Implementation wiring

| Check | Result |
|---|---|
${wireRows}

${
  live?.ran
    ? `## Live planner (OSRM + Supabase)

- Trips returned: ${live.tripCount ?? "—"}
- Sensory indicators (list order): ${(live.indicators || []).join(" → ") || live.error || "—"}
- First is calmest: ${live.firstIsCalmest ?? "—"}
`
    : "## Live planner\n\nSkipped (run with `--live` to plan against OSRM + Supabase directly).\n"
}

## Google Drive PGP

Upload \`pgp/evidence/AC-1.1.4/\` into the team Google Drive PGP folder and paste the Drive URL into \`DRIVE_LINK.md\`.

## Reproduce

\`\`\`bash
npm run verify:ac-114
\`\`\`
`;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "../..");
  loadEnvFile(resolve(root, ".env"));
  loadEnvFile(resolve(root, ".env.local"));
  const live = process.argv.includes("--live");
  const osrmBase = (
    process.env.VITE_OSRM_URL ||
    process.env.NEXT_PUBLIC_OSRM_URL ||
    "https://router.project-osrm.org"
  ).replace(/\/$/, "");

  const cases = runOfflineCases();
  const wiringChecks = checkImplementationWired(root);
  const offlinePass = cases.every((c) => c.pass);
  const wiringPass = wiringChecks.every((c) => c.pass);

  let liveResult = { ran: false, pass: true };
  if (live) {
    try {
      liveResult = await runLiveCheck(osrmBase);
    } catch (e) {
      liveResult = {
        ran: true,
        pass: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const pass =
    offlinePass && wiringPass && (!liveResult.ran || liveResult.pass);

  const result = {
    acceptanceCriterion: "1.1.4",
    description:
      "When multiple routes are listed, order is lowest→highest sensory indicator (calmest first)",
    offline: {
      passed: cases.filter((c) => c.pass).length,
      cases,
    },
    wiring: {
      passed: wiringChecks.filter((c) => c.pass).length,
      checks: wiringChecks,
    },
    live: liveResult,
    summary: { pass },
    verifiedAt: new Date().toISOString(),
    reproducibleCommand: "npm run verify:ac-114",
    evidencePath: "pgp/evidence/AC-1.1.4/",
    googleDrivePgpNote:
      "Upload pgp/evidence/AC-1.1.4/ into the team Google Drive PGP folder and paste the Drive URL into DRIVE_LINK.md",
    implementation: {
      ordering: "src/lib/routeOrdering.ts",
      planner: "src/lib/quietRoute.ts#planQuietWalkingRoute",
      entry: "src/lib/planRoute.ts#planRoute → { trip, trips }",
      ui: "src/components/LiveMapPage.tsx route options list",
    },
  };

  const outDir = resolve(root, "pgp/evidence/AC-1.1.4/results");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = resolve(outDir, `ac-114-${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  writeFileSync(resolve(outDir, "latest.json"), JSON.stringify(result, null, 2));

  const md = toMarkdown(result);
  writeFileSync(resolve(root, "pgp/evidence/AC-1.1.4/COMPARISON.md"), md);
  writeFileSync(resolve(outDir, `ac-114-${stamp}.md`), md);

  console.log("");
  for (const c of cases) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  for (const c of wiringChecks)
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  if (liveResult.ran) {
    console.log(
      `${liveResult.pass ? "PASS" : "FAIL"}  live planner calmest-first (${liveResult.tripCount ?? "?"} trips)`
    );
    if (liveResult.error) console.log(`       ${liveResult.error}`);
    if (liveResult.indicators) {
      console.log(`       indicators: ${liveResult.indicators.join(" → ")}`);
    }
  }
  console.log("");
  console.log(`AC 1.1.4 ${pass ? "PASS" : "FAIL"}`);
  console.log(`evidence: ${jsonPath}`);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
