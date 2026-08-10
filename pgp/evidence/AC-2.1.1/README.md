# PGP Evidence — Acceptance Criterion 2.1.1

## Criterion

**Given** I open the map view,  
**When** it loads,  
**Then** current pedestrian density is shown across the covered CBD area in the agreed bands (Low / Medium / High).

## Ownership

| Field | Value |
|---|---|
| Owner | **unassigned** |
| Rule | Unassigned until one member claims this card; after claim, keep **one** main owner |

Update [`OWNER.md`](./OWNER.md) when claimed.

## Agreed bands

| Band | Threshold (pedestrians / minute bucket) | Map colour |
|---|---|---|
| Low | ≤ 50 | green |
| Medium | 51–150 | amber |
| High | > 150 | red |

## Implemented behaviour

| Piece | Location |
|---|---|
| Band constants | [`apps/web/src/lib/densityBands.ts`](../../../apps/web/src/lib/densityBands.ts) |
| Map load + CBD layer + legend | [`RouteMap.tsx`](../../../apps/web/src/components/RouteMap.tsx) (`/map`) |
| Density API | `GET /api/density/current` |
| ETL band assignment | [`scripts/sync/src/config.js`](../../../scripts/sync/src/config.js) `densityLevel()` |

On `/map` open, `sensor_density_current` loads and CBD sensors render by band (toggle on by default).

## Reproducible verification

```bash
npm run verify:ac-211
```

Optional (with `npm run dev`):

```bash
node scripts/verify/ac-211-map-density-bands.mjs --live
```

## Google Drive PGP

1. Upload `pgp/evidence/AC-2.1.1/` to the team Google Drive PGP folder.
2. Paste the Drive URL into [`DRIVE_LINK.md`](./DRIVE_LINK.md).

## Evidence links

| Artefact | Link / path |
|---|---|
| Repo evidence | `pgp/evidence/AC-2.1.1/` |
| Comparison write-up | [`COMPARISON.md`](./COMPARISON.md) |
| Latest test result | [`results/latest.json`](./results/latest.json) |
| Google Drive PGP | see [`DRIVE_LINK.md`](./DRIVE_LINK.md) |
| GitHub Pull Request | https://github.com/Atharva-deep/melbourne-sensory-map/pull/4 |
| Latest verification | **PASS** — 75 CBD sensors, valid Low/Medium/High bands |
