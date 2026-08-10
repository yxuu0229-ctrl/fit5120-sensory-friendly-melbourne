# AC 2.2.5 — Historical trend validation evidence

## Criterion

**Given** the historical trend for a location is calculated,  
**When** the team validates it against available City of Melbourne data,  
**Then** the comparison and its result are recorded as evidence in the PGP.

## Result

| Field | Value |
|---|---|
| Status | **PASS** |
| Location ID | 3 |
| Source dataset | `pedestrian-counting-system-monthly-counts-per-hour` |
| Since | 2024-01-01 |
| Raw CoM rows used | 17498 |
| Trend buckets | 168 |
| Bucket mismatches | 0 |
| Max \|Δ mean\| | 0 |
| Spot-check matches | 25/25 |
| Verified at (UTC) | 2026-08-10T10:18:25.327Z |

## Source

- Export URL: https://data.melbourne.vic.gov.au/api/v2/catalog/datasets/pedestrian-counting-system-monthly-counts-per-hour/exports/csv?delimiter=%2C&where=location_id%3D3%20AND%20sensing_date%3E%3D'2024-01-01'
- Records API (spot-check): https://data.melbourne.vic.gov.au/api/v2/catalog/datasets/pedestrian-counting-system-monthly-counts-per-hour/records?limit=25&where=location_id%3D3%20AND%20sensing_date%3E%3D'2024-01-01'

## Comparison method

1. Download City of Melbourne hourly pedestrian counts for the location.
2. Calculate the production historical trend (mean / median / std by day × hour).
3. Re-aggregate the **same CoM rows** with an independent reducer.
4. Require every bucket mean/median/count to match (abs tol 1e-6).
5. Spot-check live CoM Records API samples appear in the calculated buckets.

## Sample matched buckets

| Bucket (day\|hour) | Production mean | Independent mean | \|Δ\| | n |
|---|---:|---:|---:|---:|
| Friday|0 | 280.9327 | 280.9327 | 0 | 104 |
| Friday|1 | 160.5192 | 160.5192 | 0 | 104 |
| Friday|10 | 868.9712 | 868.9712 | 0 | 104 |
| Friday|11 | 1329.4808 | 1329.4808 | 0 | 104 |
| Friday|12 | 2014.6346 | 2014.6346 | 0 | 104 |
| Friday|13 | 2156.6346 | 2156.6346 | 0 | 104 |
| Friday|14 | 2119.0673 | 2119.0673 | 0 | 104 |
| Friday|15 | 2213.4327 | 2213.4327 | 0 | 104 |
| Friday|16 | 2339.375 | 2339.375 | 0 | 104 |
| Friday|17 | 2577.8942 | 2577.8942 | 0 | 104 |
| Friday|18 | 2583.4231 | 2583.4231 | 0 | 104 |
| Friday|19 | 2346.7404 | 2346.7404 | 0 | 104 |

## Google Drive PGP

Upload this entire folder (`pgp/evidence/AC-2.2.5/`) into the team Project Governance Portfolio Google Drive folder, under an `AC-2.2.5` (or equivalent) evidence path. Record the Drive link in `DRIVE_LINK.md`.

## Reproduce

```bash
npm run verify:ac-225
```
