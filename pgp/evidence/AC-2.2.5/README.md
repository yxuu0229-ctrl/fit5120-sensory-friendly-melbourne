# PGP Evidence — Acceptance Criterion 2.2.5

## Criterion

**Given** the historical trend for a location is calculated,  
**When** the team validates it against available City of Melbourne data,  
**Then** the comparison and its result are recorded as evidence in the PGP.

## Implemented behaviour

| Piece | Location |
|---|---|
| Trend calculator (CoM hourly → day×hour mean/median/std) | [`scripts/sync/src/historicalTrend.js`](../../../scripts/sync/src/historicalTrend.js) |
| HTTP endpoint | `GET /api/sensors/{locationId}/historical-trend` |
| Validation verifier | [`scripts/verify/ac-225-historical-trend-com-validation.mjs`](../../../scripts/verify/ac-225-historical-trend-com-validation.mjs) |

Source dataset: City of Melbourne `pedestrian-counting-system-monthly-counts-per-hour` (CC BY).

## Reproducible verification

```bash
npm run verify:ac-225
```

Optional:

```bash
node scripts/verify/ac-225-historical-trend-com-validation.mjs --location-id 3 --since 2024-01-01
```

Outputs:

- [`COMPARISON.md`](./COMPARISON.md) — human-readable comparison (upload to Drive)
- [`results/latest.json`](./results/latest.json) — machine-readable result
- Timestamped copies under [`results/`](./results/)

## Google Drive PGP (team folder)

This repository keeps a **copy** of the evidence for git history and PR review.  
The official PGP location is the **team Google Drive folder**.

1. Upload the full directory `pgp/evidence/AC-2.2.5/` into the Drive PGP (e.g. `PGP/Evidence/AC-2.2.5/`).
2. Paste the Drive folder URL into [`DRIVE_LINK.md`](./DRIVE_LINK.md).
3. Link the same Drive URL from LeanKit / the iteration evidence index if required.

## Evidence links

| Artefact | Link / path |
|---|---|
| Repo evidence (this folder) | `pgp/evidence/AC-2.2.5/` |
| Comparison write-up | [`COMPARISON.md`](./COMPARISON.md) |
| Latest test result | [`results/latest.json`](./results/latest.json) |
| Google Drive PGP | see [`DRIVE_LINK.md`](./DRIVE_LINK.md) |
| GitHub Pull Request | https://github.com/Atharva-deep/melbourne-sensory-map/pull/2 |
| Latest verification | **PASS** — 168/168 buckets, 25/25 CoM spot-checks (location_id=3) |
