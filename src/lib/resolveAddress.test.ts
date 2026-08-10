import { describe, it, expect, vi } from "vitest";
import { resolveAddress, shouldSkipAddress } from "./resolveAddress";

describe("resolveAddress", () => {
  it("returns a ready resolution using the typed value when resolveLocal matches, without calling geocode", async () => {
    const geocode = vi.fn();
    const result = await resolveAddress("State Library Victoria", {
      resolveLocal: () => ({ lat: -37.8098, lng: 144.9652 }),
      geocode,
    });

    expect(result).toEqual({
      point: { lat: -37.8098, lng: 144.9652 },
      status: "ready",
      message: "Using: State Library Victoria",
    });
    expect(geocode).not.toHaveBeenCalled();
  });

  it("returns a ready resolution using the geocode label when there is no local match", async () => {
    const result = await resolveAddress("123 Example St", {
      resolveLocal: () => null,
      geocode: async () => ({ label: "123 Example St, Melbourne", point: { lat: -37.81, lng: 144.96 } }),
    });

    expect(result).toEqual({
      point: { lat: -37.81, lng: 144.96 },
      status: "ready",
      message: "Using: 123 Example St, Melbourne",
    });
  });

  it("returns an error resolution when geocode finds no match", async () => {
    const result = await resolveAddress("nowhere in particular", {
      resolveLocal: () => null,
      geocode: async () => null,
    });

    expect(result).toEqual({
      point: null,
      status: "error",
      message: "Address not recognised. Please choose a suggested location or enter more detail.",
    });
  });

  it("returns an error resolution when geocode rejects", async () => {
    const result = await resolveAddress("boom", {
      resolveLocal: () => null,
      geocode: async () => {
        throw new Error("network failure");
      },
    });

    expect(result).toEqual({
      point: null,
      status: "error",
      message: "Address lookup failed. Please choose a suggested location.",
    });
  });
});

describe("shouldSkipAddress", () => {
  it("skips an empty value regardless of skipDefaultOrigin", () => {
    expect(shouldSkipAddress("", { skipDefaultOrigin: false })).toBe(true);
    expect(shouldSkipAddress("", { skipDefaultOrigin: true })).toBe(true);
  });

  it("skips 'Current location' case-insensitively only when skipDefaultOrigin is true", () => {
    expect(shouldSkipAddress("Current location", { skipDefaultOrigin: true })).toBe(true);
    expect(shouldSkipAddress("current location", { skipDefaultOrigin: true })).toBe(true);
    expect(shouldSkipAddress("Current location", { skipDefaultOrigin: false })).toBe(false);
  });

  it("never skips normal text", () => {
    expect(shouldSkipAddress("State Library Victoria", { skipDefaultOrigin: true })).toBe(false);
    expect(shouldSkipAddress("State Library Victoria", { skipDefaultOrigin: false })).toBe(false);
  });
});
