export type LatLng = {
  lat: number;
  lng: number;
};

export function distanceMeters(a: LatLng, b: LatLng) {
  const radius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

export function distanceToRouteMeters(point: LatLng, routePath: [number, number][]) {
  return Math.min(
    ...routePath.map(([lat, lng]) => distanceMeters(point, { lat, lng }))
  );
}
