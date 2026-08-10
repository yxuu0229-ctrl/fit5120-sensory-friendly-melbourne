import { describe, it, expect } from "vitest";
import {
  congestionAreas,
  highDensitySensorsNearRoute,
  sensorsNearRoute,
  type SensorLike,
} from "./congestion";

const cbdA: [number, number] = [-37.81, 144.96];
const cbdB: [number, number] = [-37.815, 144.965];
const farAway: [number, number] = [-38.5, 145.5];

type TestSensor = SensorLike & { sensor_name: string; total_count: number };

function sensor(overrides: Partial<TestSensor> = {}): TestSensor {
  return {
    latitude: cbdA[0],
    longitude: cbdA[1],
    density_level: "Low",
    sensor_name: "test_sensor",
    total_count: 10,
    ...overrides,
  };
}

describe("sensorsNearRoute", () => {
  it("keeps a sensor within 500m of at least one route point", () => {
    const near = sensor({ latitude: cbdA[0], longitude: cbdA[1] });
    const result = sensorsNearRoute([cbdA, cbdB], [near]);

    expect(result).toEqual([near]);
  });

  it("drops a sensor more than 500m from every route point", () => {
    const far = sensor({ latitude: farAway[0], longitude: farAway[1] });
    const result = sensorsNearRoute([cbdA, cbdB], [far]);

    expect(result).toEqual([]);
  });

  it("respects a custom radiusMeters to change inclusion", () => {
    // ~55m from cbdA: inside the default 500m radius, outside a 10m radius.
    const near = sensor({ latitude: cbdA[0] + 0.0005, longitude: cbdA[1] });
    const far = sensor({ latitude: farAway[0], longitude: farAway[1] });

    expect(sensorsNearRoute([cbdA, cbdB], [near, far], 10)).toEqual([]);
    expect(sensorsNearRoute([cbdA, cbdB], [near, far], 1_000_000)).toEqual([near, far]);
  });

  it("returns all sensors when routePath is empty", () => {
    const near = sensor({ latitude: cbdA[0], longitude: cbdA[1] });
    const far = sensor({ latitude: farAway[0], longitude: farAway[1] });

    const result = sensorsNearRoute([], [near, far]);

    expect(result).toEqual([near, far]);
  });

  it("returns all sensors, even far ones, when routePath has length 1 (quirk)", () => {
    const near = sensor({ latitude: cbdA[0], longitude: cbdA[1] });
    const far = sensor({ latitude: farAway[0], longitude: farAway[1] });

    const result = sensorsNearRoute([cbdA], [near, far]);

    expect(result).toEqual([near, far]);
  });

  it("preserves extra fields on the returned sensors", () => {
    const near = sensor({
      latitude: cbdA[0],
      longitude: cbdA[1],
      sensor_name: "flinders_st",
      total_count: 42,
    });

    const [result] = sensorsNearRoute([cbdA, cbdB], [near]);

    expect(result.sensor_name).toBe("flinders_st");
    expect(result.total_count).toBe(42);
  });
});

describe("congestionAreas", () => {
  it("computes the exact mean lat/lng centroid for 2+ same-level sensors", () => {
    const a = sensor({ latitude: -37.81, longitude: 144.96, density_level: "Medium" });
    const b = sensor({ latitude: -37.812, longitude: 144.962, density_level: "Medium" });

    const result = congestionAreas([cbdA, cbdB], [a, b]);

    expect(result).toEqual([
      {
        level: "Medium",
        count: 2,
        lat: (-37.81 + -37.812) / 2,
        lng: (144.96 + 144.962) / 2,
      },
    ]);
  });

  it("returns multiple levels in Low -> Medium -> High order", () => {
    const low = sensor({ latitude: cbdA[0], longitude: cbdA[1], density_level: "Low" });
    const high = sensor({ latitude: cbdA[0], longitude: cbdA[1], density_level: "High" });
    const medium = sensor({ latitude: cbdA[0], longitude: cbdA[1], density_level: "Medium" });

    const result = congestionAreas([cbdA, cbdB], [high, low, medium]);

    expect(result.map((area) => area.level)).toEqual(["Low", "Medium", "High"]);
  });

  it("omits levels with no matching sensors", () => {
    const low = sensor({ latitude: cbdA[0], longitude: cbdA[1], density_level: "Low" });

    const result = congestionAreas([cbdA, cbdB], [low]);

    expect(result).toHaveLength(1);
    expect(result[0].level).toBe("Low");
  });

  it("excludes a far sensor when the route has more than one point", () => {
    const far = sensor({ latitude: farAway[0], longitude: farAway[1], density_level: "High" });

    const result = congestionAreas([cbdA, cbdB], [far]);

    expect(result).toEqual([]);
  });

  it("returns an empty array when nothing is within radius", () => {
    const far = sensor({ latitude: farAway[0], longitude: farAway[1] });

    const result = congestionAreas([cbdA, cbdB], [far], 10);

    expect(result).toEqual([]);
  });
});

describe("highDensitySensorsNearRoute", () => {
  it("returns only High sensors within radius, as full objects", () => {
    const high = sensor({
      latitude: cbdA[0],
      longitude: cbdA[1],
      density_level: "High",
      sensor_name: "high_one",
    });
    const low = sensor({ latitude: cbdA[0], longitude: cbdA[1], density_level: "Low" });

    const result = highDensitySensorsNearRoute([cbdA, cbdB], [high, low]);

    expect(result).toEqual([high]);
  });

  it("excludes a High sensor outside the radius", () => {
    const farHigh = sensor({ latitude: farAway[0], longitude: farAway[1], density_level: "High" });

    const result = highDensitySensorsNearRoute([cbdA, cbdB], [farHigh]);

    expect(result).toEqual([]);
  });

  it("returns all High sensors when routePath has length 1 (quirk)", () => {
    const nearHigh = sensor({ latitude: cbdA[0], longitude: cbdA[1], density_level: "High" });
    const farHigh = sensor({ latitude: farAway[0], longitude: farAway[1], density_level: "High" });
    const farLow = sensor({ latitude: farAway[0], longitude: farAway[1], density_level: "Low" });

    const result = highDensitySensorsNearRoute([cbdA], [nearHigh, farHigh, farLow]);

    expect(result).toEqual([nearHigh, farHigh]);
  });
});
