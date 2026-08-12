# Team TE37 Melbourne Sensory Map

Team TE37's shared source of truth for the Supabase-backed open-data pipeline and the React (Vite) sensory-aware Melbourne CBD travel map.

**Live website:** [fit5120-sensory-friendly-melbourne.vercel.app](https://fit5120-sensory-friendly-melbourne.vercel.app/)

Every implementation change must map to a LeanKit Epic, User Story and Acceptance Criterion. Development is reviewed through Pull Requests; protected or privileged values must never be committed.

## What you get

| Piece | Path |
|---|---|
| Schema + RLS | [`supabase/migrations/`](supabase/migrations/) |
| Open-data ETL | [`scripts/sync/`](scripts/sync/) |
| GitHub Actions sync | [`.github/workflows/sync-open-data.yml`](.github/workflows/sync-open-data.yml) |
| React app (journey planner, live map, data status) | [`src/`](src/) |
| Env template | [`.env.example`](.env.example) |

## Team governance

- [Overall solution and repository structure](docs/01-overall-solution-and-repository-structure.md)
- [System architecture plan](docs/02-system-architecture-plan.md)
- [Six-person GitHub usage handbook](docs/03-six-person-github-usage-handbook.md)
- [Deployment handbook](docs/04-deployment-handbook.md)
- [Security baseline](docs/05-security-baseline.md)
- [Member contribution rules](docs/06-member-contribution-rules.md)
- [LeanKit / AgilePlace](https://monashie.leankit.com)
- [Team TE37 Project Governance Portfolio](https://drive.google.com/drive/folders/1zkA3NtSfl-Jjgt35kKVRmSxm1q3pCHG6)

## Architecture

```
City of Melbourne Open Data  →  GitHub Actions (every 15 min)  →  Supabase
                                                                      ↓
                                          src/ (single React app: planner + live map + status)
```

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the full contents of
   [`supabase/migrations/20260328000000_init_schema.sql`](supabase/migrations/20260328000000_init_schema.sql).
3. In **Settings → API**, copy:
   - Project URL
   - `anon` `public` key
   - `service_role` key (secret)

## 2. Configure environment

```bash
cp .env.example .env
```

Fill it in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
MELBOURNE_DATA_BASE_URL=https://data.melbourne.vic.gov.au/api/v2/catalog/datasets
```

- Browser (Vite): only `VITE_*` (legacy `NEXT_PUBLIC_*` names still accepted)
- Sync scripts / GitHub Actions: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

## 3. Install and run first sync

```bash
npm install
npm run sync:full
```

`sync:full` loads sensors, live density, quiet windows, landmarks, and toilets.

Live-only sync (default Action schedule):

```bash
npm run sync
```

Flags also accepted by the script:

- `--quiet-windows` — recompute historical quiet profiles
- `--places` — refresh landmarks + toilets
- `--full` — everything

## 4. GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |

Workflow [`.github/workflows/sync-open-data.yml`](.github/workflows/sync-open-data.yml):

- Cron every 15 minutes (live sensors + density)
- Quiet windows once per UTC day (00:00 window)
- Places weekly (Sunday UTC 00:00 window)
- Manual **Run workflow** with `full` for a complete refresh

## 5. Run the app (local)

```bash
npm run dev
```

One React app at [http://localhost:5173](http://localhost:5173). The top nav covers the journey planner pages plus:

- **Live map** — A→B routing with density layer, sensor detail and refuges
- **Data status** — backend smoke-test page (reachable from the Live map panel)

### Map density layer (AC 2.1.1)

When the Live map loads, current `sensor_density_current` points are shown across the covered CBD in agreed bands:

| Band | Threshold |
|---|---|
| Low | ≤ 50 |
| Medium | 51–150 |
| High | > 150 |

```bash
npm run verify:ac-211
```

Evidence (upload to team Google Drive PGP): [`pgp/evidence/AC-2.1.1/`](pgp/evidence/AC-2.1.1/). Owner: unassigned until claimed.

### Transport modes on the Live map

| Mode | Engine |
|---|---|
| Walk | OSRM `foot` + quieter bias from `sensor_density_current` |
| Cycle | OSRM `bike` |
| Drive | OSRM `driving` |

Planner used by the map: `planRoute(from, to, mode)` in [`src/lib/planRoute.ts`](src/lib/planRoute.ts) (runs in the browser against Supabase + OSRM).

### Route options ordering (AC 1.1.4)

For walk mode, when multiple alternatives are returned, `trips` is ordered **lowest → highest sensory indicator** (calmest first). The selected/default `trip` is always `trips[0]`.

```bash
npm run verify:ac-114
```

Evidence pack (upload to the team Google Drive PGP): [`pgp/evidence/AC-1.1.4/`](pgp/evidence/AC-1.1.4/).

## Frontend table contract

All tables are **public read** via the anon key (RLS `SELECT` only). Writes happen only with the service role in the ETL.

### `sensor_density_current` (primary map layer)

One row per sensor — latest crowd reading.

| Column | Type | Notes |
|---|---|---|
| `location_id` | int PK | Joins to `sensors` |
| `sensor_name` | text | |
| `latitude` / `longitude` | float | WGS84 |
| `in_cbd` | bool | Rough CBD bbox |
| `total_count` | int | Pedestrians in latest minute bucket |
| `density_level` | text | `Low` ≤50, `Medium` ≤150, `High` >150 |
| `sensing_datetime` | timestamptz | |
| `updated_at` | timestamptz | |

Example:

```ts
const { data } = await supabase.from("sensor_density_current").select("*");
```

### `places`

Landmarks + public toilets.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Stable hash |
| `name` | text | |
| `category` | text | e.g. Parks & Open Space |
| `theme` / `sub_theme` | text | Source taxonomy |
| `source` | text | `landmarks` or `toilets` |
| `is_sensory_refuge` | bool | Keyword-tagged quiet-ish places |
| `latitude` / `longitude` | float | |
| `in_cbd` | bool | |

Sensory refuges:

```ts
const { data } = await supabase
  .from("places")
  .select("*")
  .eq("is_sensory_refuge", true);
```

### `quiet_windows`

Typical crowd by weekday + hour (from 2024+ hourly history).

| Column | Type |
|---|---|
| `day_name` | text (`Monday` …) |
| `hourday` | int 0–23 |
| `mean` / `median` / `std` / `count` | numbers |

### Also available

- `sensors` — static sensor metadata
- `pedestrian_live` — past-hour time series (detail charts)
- `sync_runs` — ETL audit (`status`, `rows_upserted`, `error`)

### Historical trend validation (AC 2.2.5)

Per-location day×hour trend from City of Melbourne hourly counts:
`calculateLocationHistoricalTrendFromCom(locationId)` in [`src/lib/historicalTrend.ts`](src/lib/historicalTrend.ts) — surfaced in the Live map sensor detail panel ("Load historical trend").

Validate the calculation against live CoM open data and write PGP evidence:

```bash
npm run verify:ac-225
```

Evidence pack (upload to the team **Google Drive PGP** folder): [`pgp/evidence/AC-2.2.5/`](pgp/evidence/AC-2.2.5/).

### Sensor detail view (AC 2.2.7)

Click a density sensor on the Live map — `fetchSensorDetail` in [`src/lib/sensorDetail.ts`](src/lib/sensorDetail.ts) runs the timed Supabase queries.

Agreed response time: **≤ 2000 ms** for the Supabase detail queries. Verify:

```bash
npm run verify:ac-227
```

Evidence pack: [`pgp/evidence/AC-2.2.7/`](pgp/evidence/AC-2.2.7/).

## Open data sources

City of Melbourne ([data.melbourne.vic.gov.au](https://data.melbourne.vic.gov.au/pages/home/)), CC BY:

- `pedestrian-counting-system-past-hour-counts-per-minute`
- `pedestrian-counting-system-sensor-locations`
- `pedestrian-counting-system-monthly-counts-per-hour`
- `landmarks-and-places-of-interest-including-schools-theatres-health-services-spor`
- `public-toilets`

## Prototype reference

Earlier Streamlit exploration lives in `sensory_dashboard.py` and the cleaned CSVs at repo root. The production path is Supabase + this sync pipeline.
