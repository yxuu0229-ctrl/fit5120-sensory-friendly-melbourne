-- Melbourne Sensory Map — core schema + public read RLS
-- Density levels match prototype: Low <= 50, Medium <= 150, High > 150

create extension if not exists "pgcrypto";


-- sensors

create table if not exists public.sensors (
  location_id integer primary key,
  sensor_name text,
  sensor_description text,
  status text,
  status_label text,
  is_active boolean default true,
  location_type text,
  direction_1 text,
  direction_2 text,
  directions text,
  latitude double precision not null,
  longitude double precision not null,
  in_cbd boolean default false,
  updated_at timestamptz not null default now()
);

create index if not exists sensors_in_cbd_idx on public.sensors (in_cbd);
create index if not exists sensors_lat_lng_idx on public.sensors (latitude, longitude);


-- pedestrian_live (past-hour time series)

create table if not exists public.pedestrian_live (
  id bigint generated always as identity primary key,
  location_id integer not null references public.sensors (location_id) on delete cascade,
  sensing_datetime timestamptz not null,
  direction_1 integer not null default 0,
  direction_2 integer not null default 0,
  total_count integer not null default 0,
  density_level text not null check (density_level in ('Low', 'Medium', 'High')),
  created_at timestamptz not null default now(),
  unique (location_id, sensing_datetime)
);

create index if not exists pedestrian_live_sensing_idx
  on public.pedestrian_live (sensing_datetime desc);
create index if not exists pedestrian_live_density_idx
  on public.pedestrian_live (density_level);


-- sensor_density_current (primary map layer — one row per sensor)

create table if not exists public.sensor_density_current (
  location_id integer primary key references public.sensors (location_id) on delete cascade,
  sensor_name text,
  latitude double precision not null,
  longitude double precision not null,
  in_cbd boolean default false,
  total_count integer not null default 0,
  density_level text not null check (density_level in ('Low', 'Medium', 'High')),
  sensing_datetime timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists sensor_density_current_level_idx
  on public.sensor_density_current (density_level);
create index if not exists sensor_density_current_cbd_idx
  on public.sensor_density_current (in_cbd);


-- quiet_windows (typical hourly profiles)
create table if not exists public.quiet_windows (
  day_name text not null,
  hourday integer not null check (hourday >= 0 and hourday <= 23),
  mean double precision not null default 0,
  median double precision not null default 0,
  std double precision not null default 0,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (day_name, hourday)
);


-- places (landmarks, toilets, sensory refuges
create table if not exists public.places (
  id text primary key,
  name text not null,
  category text,
  theme text,
  sub_theme text,
  source text not null,
  is_sensory_refuge boolean not null default false,
  in_cbd boolean default false,
  latitude double precision not null,
  longitude double precision not null,
  updated_at timestamptz not null default now()
);

create index if not exists places_refuge_idx on public.places (is_sensory_refuge);
create index if not exists places_source_idx on public.places (source);
create index if not exists places_lat_lng_idx on public.places (latitude, longitude);


-- sync_runs (ETL audit)
create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'error')),
  mode text not null default 'live',
  rows_upserted jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists sync_runs_started_idx on public.sync_runs (started_at desc);


-- RLS: public read, no client writes
alter table public.sensors enable row level security;
alter table public.pedestrian_live enable row level security;
alter table public.sensor_density_current enable row level security;
alter table public.quiet_windows enable row level security;
alter table public.places enable row level security;
alter table public.sync_runs enable row level security;

drop policy if exists "sensors_public_read" on public.sensors;
create policy "sensors_public_read" on public.sensors
  for select to anon, authenticated using (true);

drop policy if exists "pedestrian_live_public_read" on public.pedestrian_live;
create policy "pedestrian_live_public_read" on public.pedestrian_live
  for select to anon, authenticated using (true);

drop policy if exists "sensor_density_current_public_read" on public.sensor_density_current;
create policy "sensor_density_current_public_read" on public.sensor_density_current
  for select to anon, authenticated using (true);

drop policy if exists "quiet_windows_public_read" on public.quiet_windows;
create policy "quiet_windows_public_read" on public.quiet_windows
  for select to anon, authenticated using (true);

drop policy if exists "places_public_read" on public.places;
create policy "places_public_read" on public.places
  for select to anon, authenticated using (true);

drop policy if exists "sync_runs_public_read" on public.sync_runs;
create policy "sync_runs_public_read" on public.sync_runs
  for select to anon, authenticated using (true);

-- Service role bypasses RLS automatically for GitHub Actions upserts.
