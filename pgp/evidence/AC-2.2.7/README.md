# PGP Evidence — Acceptance Criterion 2.2.7

## Criterion

**Given** the detail view is requested,  
**When** the query runs,  
**Then** the result is returned within the agreed response time.

## Agreed response time

| Metric | Value |
|---|---|
| SLA | **≤ 2000 ms** (`DETAIL_VIEW_SLA_MS`) |
| Scope | Wall-clock duration of the sensor detail Supabase queries (current snapshot + `pedestrian_live` series for one `location_id`) |

## Implemented behaviour

| Piece | Location |
|---|---|
| Detail query helper | [`apps/web/src/lib/sensorDetail.ts`](../../../apps/web/src/lib/sensorDetail.ts) |
| HTTP detail endpoint | `GET /api/sensors/{locationId}/detail` → [`apps/web/src/app/api/sensors/[locationId]/detail/route.ts`](../../../apps/web/src/app/api/sensors/[locationId]/detail/route.ts) |
| Map UI detail panel | Sensor marker click on [`/map`](../../../apps/web/src/components/RouteMap.tsx) |
| Supporting index | [`supabase/migrations/20260809000000_pedestrian_live_detail_index.sql`](../../../supabase/migrations/20260809000000_pedestrian_live_detail_index.sql) |

Response headers from the API: `X-Detail-Query-Ms`, `X-Detail-SLA-Ms`, `X-Detail-Within-SLA`.

## Reproducible verification

From the repository root (requires synced Supabase data and env keys):

```bash
npm run verify:ac-227
```

Equivalent:

```bash
node scripts/verify/ac-227-detail-response-time.mjs --runs 5
```

The script writes machine-readable results to:

- [`results/latest.json`](./results/latest.json) — most recent run
- `results/ac-227-<timestamp>.json` — timestamped archive

Exit code `0` = PASS (every run ≤ SLA); `1` = FAIL.

## Evidence links

| Artefact | Link / path |
|---|---|
| PGP evidence (this folder) | `pgp/evidence/AC-2.2.7/` |
| Latest test result | [`results/latest.json`](./results/latest.json) |
| GitHub Pull Request | _filled after PR is opened_ |
