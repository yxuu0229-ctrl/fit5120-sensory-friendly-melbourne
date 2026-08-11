import { describe, it, expect } from "vitest";
import type { JourneyData } from "./journeyData";
import { createPrototypeJourneyData, prototypeRouteOptions } from "./journeyDataPrototype";
import { osrmRouteToCandidate } from "./journeyDataLive";
import { planJourney } from "./journeyPlanning";

describe("createPrototypeJourneyData", () => {
  // Compile-time check: the prototype adapter satisfies the JourneyData port.
  const journey: JourneyData = createPrototypeJourneyData();

  it("sensorReadings returns at most `limit` readings with valid density and coordinates", async () => {
    const readings = await journey.sensorReadings(3);

    expect(readings.length).toBeLessThanOrEqual(3);
    for (const reading of readings) {
      expect(["Low", "Medium", "High"]).toContain(reading.density_level);
      expect(Number.isFinite(reading.latitude)).toBe(true);
      expect(Number.isFinite(reading.longitude)).toBe(true);
    }
  });

  it("sensoryRefuges returns a non-empty list with stable string ids and CBD-range coordinates", async () => {
    const refuges = await journey.sensoryRefuges();

    expect(refuges.length).toBeGreaterThan(0);
    for (const refuge of refuges) {
      expect(typeof refuge.id).toBe("string");
      expect(refuge.latitude).toBeGreaterThan(-38);
      expect(refuge.latitude).toBeLessThan(-37.5);
      expect(refuge.longitude).toBeGreaterThan(144.5);
      expect(refuge.longitude).toBeLessThan(145.5);
    }

    // ids should be stable across calls
    const refugesAgain = await journey.sensoryRefuges();
    expect(refugesAgain.map((r) => r.id)).toEqual(refuges.map((r) => r.id));
  });

  it("walkingRoutes returns no error/trip and its candidates plan into a Route A", async () => {
    const result = await journey.walkingRoutes(
      { lat: -37.8136, lng: 144.9631 },
      { lat: -37.81, lng: 144.96 }
    );

    expect(result.error).toBeNull();
    expect(result.trip).toBeNull();

    const planned = planJourney(result.candidates, [], {
      avoidCongestion: true,
      tolerance: "Medium",
    });
    expect(planned.length).toBeGreaterThanOrEqual(1);
    expect(planned[0].name).toBe("Route A");
  });

  it("geocode matches a known CBD name and falls back to Melbourne centre for unknown queries", async () => {
    const known = await journey.geocode("Please take me to State Library Victoria");
    expect(known).not.toBeNull();
    expect(known?.label).toBe("State Library Victoria");
    expect(known?.point).toEqual({ lat: -37.8098, lng: 144.9652 });

    const unknown = await journey.geocode("Somewhere completely unknown");
    expect(unknown).not.toBeNull();
    expect(unknown?.label).toBe("Somewhere completely unknown");
    expect(unknown?.point).toEqual({ lat: -37.8136, lng: 144.9631 });
  });
});

describe("prototypeRouteOptions", () => {
  it("has exactly three routes named Route A/B/C matching the moved card numbers", () => {
    expect(prototypeRouteOptions).toHaveLength(3);
    expect(prototypeRouteOptions.map((route) => route.name)).toEqual(["Route A", "Route B", "Route C"]);

    const [routeA, routeB, routeC] = prototypeRouteOptions;

    expect(routeA.distanceMeters).toBe(480);
    expect(routeA.durationSeconds).toBe(31 * 60);
    expect(routeA.sensoryLoad).toBe(12);
    expect(routeA.sensoryLevel).toBe("Low");

    expect(routeB.distanceMeters).toBe(620);
    expect(routeB.durationSeconds).toBe(35 * 60);
    expect(routeB.sensoryLoad).toBe(48);
    expect(routeB.sensoryLevel).toBe("Medium");

    expect(routeC.distanceMeters).toBe(220);
    expect(routeC.durationSeconds).toBe(24 * 60);
    expect(routeC.sensoryLoad).toBe(84);
    expect(routeC.sensoryLevel).toBe("High");
  });
});

describe("osrmRouteToCandidate", () => {
  it("maps geojson [lng,lat] coordinates to [lat,lng] positions", () => {
    const candidate = osrmRouteToCandidate(
      {
        distance: 123,
        duration: 45,
        geometry: { coordinates: [[144.9631, -37.8136], [144.96, -37.81]] },
      },
      "Direct walking route"
    );

    expect(candidate.label).toBe("Direct walking route");
    expect(candidate.distanceMeters).toBe(123);
    expect(candidate.durationSeconds).toBe(45);
    expect(candidate.positions).toEqual([
      [-37.8136, 144.9631],
      [-37.81, 144.96],
    ]);
  });
});
