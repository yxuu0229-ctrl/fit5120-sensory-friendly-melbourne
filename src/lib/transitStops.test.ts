import { describe, it, expect } from "vitest";
import { transitStopsNearRoute, TRANSIT_NEAR_ROUTE_METERS } from "./transitStops";

// Swanston Street walk: Melbourne Central down past the State Library to Bourke St Mall.
const swanstonWalk: [number, number][] = [
  [-37.81, 144.9628],
  [-37.8098, 144.9646],
  [-37.8136, 144.964],
];

describe("transitStopsNearRoute", () => {
  it("returns stations and tram stops within the radius, nearest first", () => {
    const stops = transitStopsNearRoute(swanstonWalk);

    const ids = stops.map((stop) => stop.id);
    expect(ids).toContain("melbourne-central");
    expect(ids).toContain("state-library");
    expect(ids).toContain("bourke-st-mall");
    for (const stop of stops) {
      expect(stop.distanceMeters).toBeLessThanOrEqual(TRANSIT_NEAR_ROUTE_METERS);
    }
    for (let index = 1; index < stops.length; index += 1) {
      expect(stops[index - 1].distanceMeters).toBeLessThanOrEqual(stops[index].distanceMeters);
    }
  });

  it("returns no stops for a route away from the CBD network", () => {
    const richmondish: [number, number][] = [
      [-37.83, 145.0],
      [-37.84, 145.01],
    ];
    expect(transitStopsNearRoute(richmondish)).toEqual([]);
  });

  it("returns [] when the path has fewer than two points", () => {
    expect(transitStopsNearRoute([])).toEqual([]);
    expect(transitStopsNearRoute([[-37.8183, 144.9671]])).toEqual([]);
  });
});
