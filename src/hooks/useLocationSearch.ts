import { useEffect, useState } from "react";
import {
  autocompletePlaces,
  resolvePlaceDetails,
} from "../api/googlePlaces";
import type { PlaceResult } from "../lib/types";

export function useLocationSearch(query: string) {
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const handle = window.setTimeout(async () => {
      setLoading(true);
      const results = await autocompletePlaces(query);
      if (!cancelled) {
        setSuggestions(results);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  async function pick(suggestion: PlaceResult) {
    return (await resolvePlaceDetails(suggestion)) ?? suggestion;
  }

  return { suggestions, loading, pick };
}
