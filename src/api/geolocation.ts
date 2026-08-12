import type { LatLng } from "../lib/types";

export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });
}

export function watchPosition(
  onUpdate: (point: LatLng) => void,
  onError?: (message: string) => void
): () => void {
  if (!navigator.geolocation) {
    onError?.("Geolocation is not available");
    return () => undefined;
  }
  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }),
    () => onError?.("Could not track your location"),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}
