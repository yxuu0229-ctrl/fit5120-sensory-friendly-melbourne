import { getSupabase, hasSupabaseEnv } from "./supabaseClient";
import type { LocationQuietWindow } from "../lib/types";

export async function fetchQuietWindowsForHour(
  dayName: string,
  hourday: number,
  locationIds: number[]
): Promise<LocationQuietWindow[]> {
  if (!hasSupabaseEnv() || !locationIds.length) return [];
  const { data, error } = await getSupabase()
    .from("location_quiet_windows")
    .select("location_id,day_name,hourday,mean,sample_count,is_reliable")
    .eq("day_name", dayName)
    .eq("hourday", hourday)
    .in("location_id", locationIds);
  if (error) throw error;
  return (data ?? []) as LocationQuietWindow[];
}
