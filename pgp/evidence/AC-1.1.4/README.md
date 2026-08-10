# PGP Evidence — Acceptance Criterion 1.1.4

## Criterion

**Given** more than one route is returned,  
**When** the results are listed,  
**Then** they are ordered from lowest to highest sensory indicator so the calmest option appears first.

## Implemented behaviour

| Piece | Location |
|---|---|
| Calmest-first sorter | [`apps/web/src/lib/routeOrdering.ts`](../../../apps/web/src/lib/routeOrdering.ts) |
| Walk planner returns ranked `trips` | [`apps/web/src/lib/quietRoute.ts`](../../../apps/web/src/lib/quietRoute.ts) |
| API | `POST /api/route/plan` → `{ trip, trips }` (`trips` ascending by sensory indicator) |
| Map UI list | [`RouteMap.tsx`](../../../apps/web/src/components/RouteMap.tsx) “Route options” |

Sensory indicator = density-aware crowd score along the path (lower = calmer). The first listed / selected route is the calmest.

## Reproducible verification

```bash
npm run verify:ac-114
```

Optional live check (with `npm run dev` running):

```bash
node scripts/verify/ac-114-routes-ordered-by-sensory.mjs --live
```

## Google Drive PGP

1. Upload `pgp/evidence/AC-1.1.4/` to the team Google Drive PGP folder.
2. Paste the Drive URL into [`DRIVE_LINK.md`](./DRIVE_LINK.md).

## Evidence links

| Artefact | Link / path |
|---|---|
| Repo evidence | `pgp/evidence/AC-1.1.4/` |
| Comparison write-up | [`COMPARISON.md`](./COMPARISON.md) |
| Latest test result | [`results/latest.json`](./results/latest.json) |
| Google Drive PGP | see [`DRIVE_LINK.md`](./DRIVE_LINK.md) |
| GitHub Pull Request | _filled after PR is opened_ |
