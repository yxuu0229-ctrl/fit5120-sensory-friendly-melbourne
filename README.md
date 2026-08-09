# Melbourne Sensory Map — Backend

Supabase-backed open data pipeline for a neurodivergent-friendly Melbourne CBD travel map.  
**This repo owns the backend + a minimal status shell.** The polished map UI is built separately against the same tables.

## What you get

| Piece | Path |
|---|---|
| Schema + RLS | [`supabase/migrations/`](supabase/migrations/) |
| Open-data ETL | [`scripts/sync/`](scripts/sync/) |
| GitHub Actions sync | [`.github/workflows/sync-open-data.yml`](.github/workflows/sync-open-data.yml) |
| Minimal Next.js status page | [`apps/web/`](apps/web/) |
| Env template | [`.env.example`](.env.example) |

## Architecture

```
City of Melbourne Open Data  →  GitHub Actions (every 15 min)  →  Supabase
                                                                      ↓
                                              apps/web (status) + other FE map
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
cp .env.example apps/web/.env.local
```

Fill both files:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MELBOURNE_DATA_BASE_URL=https://data.melbourne.vic.gov.au/api/v2/catalog/datasets
```

- Browser / Next.js: only `NEXT_PUBLIC_*`
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

## 5. Status shell + quieter route map (local)

```bash
npm run dev
```

- Status: [http://localhost:3000](http://localhost:3000)
- Map A→B routing: [http://localhost:3000/map](http://localhost:3000/map)

### Map density layer (AC 2.1.1)

On `/map` load, current `sensor_density_current` points are shown across the covered CBD in agreed bands:

| Band | Threshold |
|---|---|
| Low | ≤ 50 |
| Medium | 51–150 |
| High | > 150 |

```bash
npm run verify:ac-211
```

Evidence (upload to team Google Drive PGP): [`pgp/evidence/AC-2.1.1/`](pgp/evidence/AC-2.1.1/). Owner: unassigned until claimed.

### Transport modes on `/map`

| Mode | Engine |
|---|---|
| Walk | OSRM `foot` + quieter bias from `sensor_density_current` |
| Cycle | OSRM `bike` |
| Drive | OSRM `driving` |
| Public transport / Train / Tram / Bus | **PTV Timetable API v3** (nearby stops → shared route → departures) + OSRM walk legs |

PTV does **not** expose an official A→B journey planner. Our transit mode builds a practical itinerary from open PTV stop/route/departure data.

Add to `apps/web/.env.local` (and restart `npm run dev`):

```env
PTV_DEVID=your_developer_id
PTV_API_KEY=your_api_key
```

Request credentials: [PTV Timetable API](https://www.ptv.vic.gov.au/footer/data-and-reporting/datasets/ptv-timetable-api/).

Routing API used by the map: `POST /api/route/plan` with `{ from, to, mode }`.

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

## Open data sources

City of Melbourne ([data.melbourne.vic.gov.au](https://data.melbourne.vic.gov.au/pages/home/)), CC BY:

- `pedestrian-counting-system-past-hour-counts-per-minute`
- `pedestrian-counting-system-sensor-locations`
- `pedestrian-counting-system-monthly-counts-per-hour`
- `landmarks-and-places-of-interest-including-schools-theatres-health-services-spor`
- `public-toilets`

## Prototype reference

Earlier Streamlit exploration lives in `sensory_dashboard.py` and the cleaned CSVs at repo root. The production path is Supabase + this sync pipeline.
