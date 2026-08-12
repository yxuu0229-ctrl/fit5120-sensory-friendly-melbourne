import { useCallback, useEffect, useRef, useState } from "react";
import { watchPosition } from "../api/geolocation";
import { progressAlongRoute, remainingPath } from "../lib/geo";
import type { LatLng, RouteOption } from "../lib/types";

export function useLiveNavigation(active: boolean, route: RouteOption | null) {
  const [userPoint, setUserPoint] = useState<LatLng | null>(null);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState<[number, number][]>([]);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!active) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }
    stopRef.current = watchPosition((point) => setUserPoint(point));
    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    if (!route || !userPoint) {
      setRemaining(route?.positions ?? []);
      return;
    }
    const { percent, closestIndex } = progressAlongRoute(
      userPoint,
      route.positions
    );
    setProgress(percent);
    setRemaining(remainingPath(route.positions, closestIndex));
  }, [route, userPoint]);

  const reset = useCallback(() => {
    setProgress(0);
    setRemaining(route?.positions ?? []);
  }, [route]);

  return { userPoint, setUserPoint, progress, remaining, reset };
}
