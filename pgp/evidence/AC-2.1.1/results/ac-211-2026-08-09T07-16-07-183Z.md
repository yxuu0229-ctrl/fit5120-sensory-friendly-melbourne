# AC 2.1.1 — Map pedestrian density bands

## Criterion

**Given** I open the map view,  
**When** it loads,  
**Then** current pedestrian density is shown across the covered CBD area in the agreed bands (Low / Medium / High).

## Ownership

| Field | Value |
|---|---|
| Owner | **unassigned** (claim in LeanKit / team board; keep one main owner after claim) |
| Status | **PASS** |

## Agreed bands

| Band | Threshold |
|---|---|
| Low | ≤ 50 pedestrians / minute bucket |
| Medium | 51–150 |
| High | > 150 |

## Result

| Check group | Result |
|---|---|
| Offline / wiring | 6/6 |
| Live Supabase data | PASS |
| Live API | skipped |
| Verified at (UTC) | 2026-08-09T07:16:07.182Z |

### Live data

- CBD sensors: 75
- Band counts: Low 56, Medium 15, High 4
- Invalid levels: 0
- Band mismatches: 0


## Offline / wiring

| Check | Result |
|---|---|
| densityBands.ts defines Low/Medium/High | PASS |
| map loads sensor_density_current on open | PASS |
| map defaults to showing density (showDensity true) | PASS |
| GET /api/density/current exposes CBD density layer | PASS |
| ETL densityLevel matches agreed thresholds | PASS |
| agreed band thresholds Low≤50 / Medium≤150 / High>150 | PASS |

## Google Drive PGP

Upload `pgp/evidence/AC-2.1.1/` into the team Google Drive PGP folder and paste the Drive URL into `DRIVE_LINK.md`.

## Reproduce

```bash
npm run verify:ac-211
```
