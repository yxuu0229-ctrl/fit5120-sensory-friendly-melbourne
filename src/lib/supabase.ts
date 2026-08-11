import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Both naming schemes are accepted so existing .env files keep working:
// VITE_* (this app's native prefix) and NEXT_PUBLIC_* (kept from the retired
// Next.js app; still exposed via envPrefix in vite.config.ts).
function readEnv() {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    url: env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
    key:
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      env.VITE_SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function hasSupabaseEnv(): boolean {
  const { url, key } = readEnv();
  return Boolean(url && key);
}

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const { url, key } = readEnv();
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or the NEXT_PUBLIC_ equivalents)"
    );
  }

  client = createClient(url, key);
  return client;
}
