import { getSupabase, hasSupabaseEnv } from "./supabaseClient";
import type { RefugePlace } from "../lib/types";

export async function fetchSensoryRefuges(): Promise<RefugePlace[]> {
  if (!hasSupabaseEnv()) return [];
  const { data, error } = await getSupabase()
    .from("places")
    .select("id,name,category,theme,latitude,longitude")
    .eq("is_sensory_refuge", true);
  if (error) throw error;
  return (data ?? []) as RefugePlace[];
}
