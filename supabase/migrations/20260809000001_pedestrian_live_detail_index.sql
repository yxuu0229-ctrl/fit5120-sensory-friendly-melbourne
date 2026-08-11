-- AC 2.2.7: speed sensor detail-view lookups (past-hour series by location)
create index if not exists pedestrian_live_location_sensing_idx
  on public.pedestrian_live (location_id, sensing_datetime desc);
