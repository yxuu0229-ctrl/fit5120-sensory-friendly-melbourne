import { describe, it, expect } from "vitest";
import { planJourney, type RouteCandidate, type Sensor } from "./journeyPlanning";

const cbdA: [number, number] = [-37.81, 144.96];
const cbdB: [number, number] = [-37.815, 144.965];
const cbdC: [number, number] = [-37.82, 144.97];

function candidate(overrides: Partial<RouteCandidate> = {}): RouteCandidate {
  return {
    label: "Route",
    distanceMeters: 500,
    durationSeconds: 300,
    positions: [cbdA, cbdB],
    ...overrides,
  };
}

describe("planJourney", () => {
  it("dedups candidates with matching start/end and distance bucket, keeping the first", () => {
    const first = candidate({ label: "First", distanceMeters: 500, positions: [cbdA, cbdB] });
    const duplicate = candidate({ label: "Duplicate", distanceMeters: 505, positions: [cbdA, cbdB] });
    const distinct = candidate({ label: "Distinct", distanceMeters: 500, positions: [cbdA, cbdC] });

    const result = planJourney([first, duplicate, distinct], [], { avoidCongestion: true });

    expect(result).toHaveLength(2);
    expect(result.map((route) => route.label)).toContain("First");
    expect(result.map((route) => route.label)).not.toContain("Duplicate");
    expect(result.map((route) => route.label)).toContain("Distinct");
  });

  it("drops candidates with one or fewer positions", () => {
    const tooShort = candidate({ label: "Short", positions: [cbdA] });
    const empty = candidate({ label: "Empty", positions: [] });
    const valid = candidate({ label: "Valid", positions: [cbdA, cbdB] });

    const result = planJourney([tooShort, empty, valid], [], { avoidCongestion: true });

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Valid");
  });

  it("scores routes higher when High-density sensors are within 120m of sampled points", () => {
    const positions: [number, number][] = [cbdA, cbdB, cbdC];
    const highSensors: Sensor[] = [
      { latitude: cbdA[0], longitude: cbdA[1], density_level: "High" },
      { latitude: cbdB[0], longitude: cbdB[1], density_level: "High" },
      { latitude: cbdC[0], longitude: cbdC[1], density_level: "High" },
    ];
    const lowSensors: Sensor[] = [
      { latitude: cbdA[0], longitude: cbdA[1], density_level: "Low" },
      { latitude: cbdB[0], longitude: cbdB[1], density_level: "Low" },
      { latitude: cbdC[0], longitude: cbdC[1], density_level: "Low" },
    ];
    const farSensors: Sensor[] = [
      { latitude: -38.5, longitude: 145.5, density_level: "High" },
    ];

    const [highResult] = planJourney([candidate({ positions })], highSensors, { avoidCongestion: true });
    const [lowResult] = planJourney([candidate({ positions })], lowSensors, { avoidCongestion: true });
    const [farResult] = planJourney([candidate({ positions })], farSensors, { avoidCongestion: true });

    expect(highResult.sensoryLevel).toBe("High");
    expect(lowResult.sensoryLoad).toBeLessThan(highResult.sensoryLoad);
    // Baseline: no sensors within 120m -> 0.4 per sample, well below the High-density case.
    expect(farResult.sensoryLoad).toBeLessThan(highResult.sensoryLoad);
  });

  it("returns sensoryLoad 20 (Low) for every route when sensors is empty", () => {
    const result = planJourney(
      [candidate({ positions: [cbdA, cbdB] }), candidate({ positions: [cbdA, cbdC] })],
      [],
      { avoidCongestion: true }
    );

    for (const route of result) {
      expect(route.sensoryLoad).toBe(20);
      expect(route.sensoryLevel).toBe("Low");
    }
  });

  it("bands sensoryLoad into Low (<30), Medium (30-69), and High (>=70) with monotonic ordering", () => {
    const positions: [number, number][] = [cbdA, cbdB, cbdC];
    const lowSensors: Sensor[] = [{ latitude: cbdA[0], longitude: cbdA[1], density_level: "Low" }];
    const mediumSensors: Sensor[] = [
      { latitude: cbdA[0], longitude: cbdA[1], density_level: "Medium" },
      { latitude: cbdB[0], longitude: cbdB[1], density_level: "Medium" },
      { latitude: cbdC[0], longitude: cbdC[1], density_level: "Medium" },
    ];
    const highSensors: Sensor[] = [
      { latitude: cbdA[0], longitude: cbdA[1], density_level: "High" },
      { latitude: cbdB[0], longitude: cbdB[1], density_level: "High" },
      { latitude: cbdC[0], longitude: cbdC[1], density_level: "High" },
    ];

    const [lowResult] = planJourney([candidate({ positions })], lowSensors, { avoidCongestion: true });
    const [mediumResult] = planJourney([candidate({ positions })], mediumSensors, { avoidCongestion: true });
    const [highResult] = planJourney([candidate({ positions })], highSensors, { avoidCongestion: true });

    expect(lowResult.sensoryLoad).toBeLessThan(30);
    expect(lowResult.sensoryLevel).toBe("Low");
    expect(mediumResult.sensoryLoad).toBeGreaterThanOrEqual(30);
    expect(mediumResult.sensoryLoad).toBeLessThan(70);
    expect(mediumResult.sensoryLevel).toBe("Medium");
    expect(highResult.sensoryLoad).toBeGreaterThanOrEqual(70);
    expect(highResult.sensoryLevel).toBe("High");
    expect(lowResult.sensoryLoad).toBeLessThan(mediumResult.sensoryLoad);
    expect(mediumResult.sensoryLoad).toBeLessThan(highResult.sensoryLoad);
  });

  it("flips ranking based on avoidCongestion: low-load-longer vs higher-load-shorter", () => {
    const positions: [number, number][] = [cbdA, cbdB, cbdC];
    const sensors: Sensor[] = [
      { latitude: cbdB[0], longitude: cbdB[1], density_level: "High" },
    ];
    const routeX = candidate({ label: "X", positions: [cbdA, [-37.9, 145.1]], distanceMeters: 3000 });
    const routeY = candidate({ label: "Y", positions, distanceMeters: 500 });

    const avoidResult = planJourney([routeX, routeY], sensors, { avoidCongestion: true });
    expect(avoidResult[0].label).toBe("X");
    expect(avoidResult[0].name).toBe("Route A");

    const fastestResult = planJourney([routeX, routeY], sensors, { avoidCongestion: false });
    expect(fastestResult[0].name).toBe("Route A");
    expect(fastestResult[0].distanceMeters).toBeLessThanOrEqual(fastestResult[1].distanceMeters);
  });

  it("falls back to duration then distance as tie-breakers", () => {
    const equalLoadA = candidate({ label: "EqualLoadFast", positions: [cbdA, cbdB], distanceMeters: 200 });
    const equalLoadB = candidate({ label: "EqualLoadSlow", positions: [cbdA, [-37.83, 144.98]], distanceMeters: 900 });

    const avoidResult = planJourney([equalLoadA, equalLoadB], [], { avoidCongestion: true });
    expect(avoidResult[0].sensoryLoad).toBe(avoidResult[1].sensoryLoad);
    expect(avoidResult[0].durationSeconds).toBeLessThanOrEqual(avoidResult[1].durationSeconds);
    expect(avoidResult[0].label).toBe("EqualLoadFast");

    const equalDurationA = candidate({
      label: "EqualDurationShort",
      positions: [cbdA, [-37.811, 144.961]],
      distanceMeters: 100,
    });
    const equalDurationB = candidate({
      label: "EqualDurationLong",
      positions: [cbdA, [-37.83, 144.99]],
      distanceMeters: 100,
    });
    const fastestResult = planJourney([equalDurationA, equalDurationB], [], { avoidCongestion: false });
    expect(fastestResult[0].durationSeconds).toBe(fastestResult[1].durationSeconds);
    expect(fastestResult[0].distanceMeters).toBeLessThanOrEqual(fastestResult[1].distanceMeters);
  });

  it("returns at most 3 routes labelled Route A/B/C in rank order", () => {
    const candidates = [
      candidate({ label: "One", positions: [cbdA, cbdB], distanceMeters: 100 }),
      candidate({ label: "Two", positions: [cbdA, cbdC], distanceMeters: 200 }),
      candidate({ label: "Three", positions: [cbdB, cbdC], distanceMeters: 300 }),
      candidate({ label: "Four", positions: [cbdB, cbdA], distanceMeters: 400 }),
      candidate({ label: "Five", positions: [cbdC, cbdA], distanceMeters: 500 }),
    ];

    const result = planJourney(candidates, [], { avoidCongestion: false });

    expect(result).toHaveLength(3);
    expect(result.map((route) => route.name)).toEqual(["Route A", "Route B", "Route C"]);
    for (let index = 1; index < result.length; index += 1) {
      expect(result[index - 1].durationSeconds).toBeLessThanOrEqual(result[index].durationSeconds);
    }
  });

  it("discards the input durationSeconds and recomputes it from distance", () => {
    const [result] = planJourney(
      [candidate({ durationSeconds: 99999, distanceMeters: 800, positions: [cbdA, cbdB] })],
      [],
      { avoidCongestion: true }
    );

    expect(result.durationSeconds).toBe(600);
  });
});
