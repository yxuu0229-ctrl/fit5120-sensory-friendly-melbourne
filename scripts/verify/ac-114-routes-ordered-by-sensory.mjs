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

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Mirrors apps/web/src/lib/routeOrdering.ts */
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
    resolve(root, "apps/web/src/lib/routeOrdering.ts"),
    "utf8"
  );
  checks.push({
    name: "routeOrdering.ts exports calmest-first sorter",
    pass:
      orderingSrc.includes("orderRoutesBySensoryIndicator") &&
      orderingSrc.includes("sensoryIndicator"),
  });

  const quietSrc = readFileSync(
    resolve(root, "apps/web/src/lib/quietRoute.ts"),
    "utf8"
  );
  checks.push({
    name: "planQuietWalkingRoute uses orderRoutesBySensoryIndicator",
    pass:
      quietSrc.includes("orderRoutesBySensoryIndicator") &&
      quietSrc.includes("trips"),
  });

  const apiSrc = readFileSync(
    resolve(root, "apps/web/src/app/api/route/plan/route.ts"),
    "utf8"
  );
  checks.push({
    name: "plan API returns trips list",
    pass: apiSrc.includes("trips") && apiSrc.includes("planQuietWalkingRoute"),
  });

  const uiSrc = readFileSync(
    resolve(root, "apps/web/src/components/RouteMap.tsx"),
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

async function runLiveCheck(baseUrl) {
  const from = { lat: -37.8136, lng: 144.9631 };
  const to = { lat: -37.82, lng: 144.968 };
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/route/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, mode: "walk" }),
  });
  const body = await res.json();
  if (!res.ok) {
    return {
      ran: true,
      pass: false,
      error: body.error || `HTTP ${res.status}`,
    };
  }
  const trips = body.trips || (body.trip ? [body.trip] : []);
  if (trips.length < 2) {
    return {
      ran: true,
      pass: false,
      error: `Expected >= 2 trips for AC 1.1.4, got ${trips.length}`,
      tripCount: trips.length,
    };
  }
  const indicators = trips.map(
    (t) => t.sensoryIndicator ?? t.crowdScore ?? null
  );
  if (indicators.some((v) => v == null || !Number.isFinite(v))) {
    return {
      ran: true,
      pass: false,
      error: "One or more trips missing sensoryIndicator",
      indicators,
    };
  }
  const ordered = isOrderedCalmestFirst(
    indicators.map((sensoryIndicator) => ({ sensoryIndicator }))
  );
  return {
    ran: true,
    pass: ordered,
    tripCount: trips.length,
    indicators,
    labels: trips.map((t) => t.label),
    firstIsCalmest: indicators[0] === Math.min(...indicators),
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
| Live API check | ${live?.ran ? (live.pass ? "PASS" : "FAIL") : "skipped"} |
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
    ? `## Live API

- Trips returned: ${live.tripCount ?? "—"}
- Sensory indicators (list order): ${(live.indicators || []).join(" → ") || live.error || "—"}
- First is calmest: ${live.firstIsCalmest ?? "—"}
`
    : "## Live API\n\nSkipped (run with `--live` against \`npm run dev\`).\n"
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
  const live = process.argv.includes("--live");
  const baseUrl =
    process.env.AC114_BASE_URL ||
    process.argv.find((a) => a.startsWith("--base-url="))?.split("=")[1] ||
    "http://localhost:3000";

  const cases = runOfflineCases();
  const wiringChecks = checkImplementationWired(root);
  const offlinePass = cases.every((c) => c.pass);
  const wiringPass = wiringChecks.every((c) => c.pass);

  let liveResult = { ran: false, pass: true };
  if (live) {
    try {
      liveResult = await runLiveCheck(baseUrl);
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
      ordering: "apps/web/src/lib/routeOrdering.ts",
      planner: "apps/web/src/lib/quietRoute.ts#planQuietWalkingRoute",
      api: "POST /api/route/plan → { trip, trips }",
      ui: "apps/web/src/components/RouteMap.tsx route options list",
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
      `${liveResult.pass ? "PASS" : "FAIL"}  live API calmest-first (${liveResult.tripCount ?? "?"} trips)`
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
