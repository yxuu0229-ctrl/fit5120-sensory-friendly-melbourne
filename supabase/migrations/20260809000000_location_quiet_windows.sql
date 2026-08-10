-- Per-location typical hourly profiles, with an explicit reliability flag.
--
-- The existing public.quiet_windows table aggregates every sensor in the city
-- into one bucket per (day_name, hourday), so it cannot answer "is there enough
-- history for THIS location?". This table adds the location dimension and
-- records how many observations back each estimate.
--
-- AC 2.2.6: when a location has insufficient history, the view must say so
-- rather than showing an unreliable number. is_reliable is computed once during
-- sync (scripts/sync/src/syncQuietWindows.js) so every consumer applies the
-- same threshold.

create table if not exists public.location_quiet_windows (
  location_id integer not null,
  day_name text not null,
  hourday integer not null check (hourday >= 0 and hourday <= 23),
  mean double precision not null default 0,
  median double precision not null default 0,
  std double precision not null default 0,
  sample_count integer not null default 0,
  is_reliable boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (location_id, day_name, hourday)
);

-- Deliberately NO foreign key to public.sensors.
-- The historical hourly dataset includes decommissioned sensors that no longer
-- appear in the current sensor-locations export. Those are exactly the rows with
-- sparse recent data that this feature needs to flag, and a FK would make the
-- nightly sync fail on them instead.

create index if not exists location_quiet_windows_lookup_idx
  on public.location_quiet_windows (day_name, hourday);

create index if not exists location_quiet_windows_reliable_idx
  on public.location_quiet_windows (is_reliable);

comment on column public.location_quiet_windows.sample_count is
  'Number of observed (date, hour) readings behind this estimate.';
comment on column public.location_quiet_windows.is_reliable is
  'True when sample_count >= MIN_RELIABLE_SAMPLES (scripts/sync/src/config.js).';

-- RLS: public read, no client writes (matches every other table here)
alter table public.location_quiet_windows enable row level security;

drop policy if exists "location_quiet_windows_public_read"
  on public.location_quiet_windows;
create policy "location_quiet_windows_public_read"
  on public.location_quiet_windows
  for select to anon, authenticated using (true);
