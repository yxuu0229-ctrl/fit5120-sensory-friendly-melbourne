import { describe, it, expect } from "vitest";
import { refuges, refugeFromPlace, refugeFromStatic, type NearbyRefuge } from "./refuge";

function place(overrides: Partial<NearbyRefuge> = {}): NearbyRefuge {
  return {
    id: "place-1",
    name: "Some Place",
    category: null,
    theme: null,
    sub_theme: null,
    source: "places table",
    latitude: -37.81,
    longitude: 144.96,
    distanceMeters: 123.6,
    ...overrides,
  };
}

describe("refugeFromPlace", () => {
  it("rounds distanceMeters and labels it 'current location' for searchMode current", () => {
    const view = refugeFromPlace(place({ distanceMeters: 123.6 }), "current");
    expect(view.distanceText).toBe("124 m from current location");
  });

  it("labels distance 'selected route' for searchMode route", () => {
    const view = refugeFromPlace(place({ distanceMeters: 123.6 }), "route");
    expect(view.distanceText).toBe("124 m from selected route");
  });

  it("uses category for kind when present", () => {
    const view = refugeFromPlace(place({ category: "Library" }), "current");
    expect(view.kind).toBe("Library");
  });

  it("falls back to source for kind when category is null", () => {
    const view = refugeFromPlace(place({ category: null, source: "osm" }), "current");
    expect(view.kind).toBe("osm");
  });

  it("maps text containing 'library' to the library image", () => {
    const view = refugeFromPlace(place({ name: "City Library" }), "current");
    expect(view.imageUrl).toBe("/images/library.jpg");
  });

  it("maps park/garden/reserve/open space text to the park image", () => {
    expect(refugeFromPlace(place({ theme: "park" }), "current").imageUrl).toBe("/images/park.jpg");
    expect(refugeFromPlace(place({ theme: "garden" }), "current").imageUrl).toBe("/images/park.jpg");
    expect(refugeFromPlace(place({ theme: "reserve" }), "current").imageUrl).toBe("/images/park.jpg");
    expect(refugeFromPlace(place({ theme: "open space" }), "current").imageUrl).toBe(
      "/images/park.jpg"
    );
  });

  it("maps museum and health-set keywords to the public-space image", () => {
    expect(refugeFromPlace(place({ sub_theme: "museum" }), "current").imageUrl).toBe(
      "/images/public-space.jpg"
    );
    expect(refugeFromPlace(place({ sub_theme: "hospital" }), "current").imageUrl).toBe(
      "/images/public-space.jpg"
    );
  });

  it("falls back to the default Melbourne image when nothing matches", () => {
    const view = refugeFromPlace(place({ name: "Unnamed spot" }), "current");
    expect(view.imageUrl).toBe("/images/default-melbourne.jpg");
  });

  it("prefers theme, then sub_theme, then the literal fallback string for note", () => {
    expect(refugeFromPlace(place({ theme: "Quiet corner" }), "current").note).toBe("Quiet corner");
    expect(
      refugeFromPlace(place({ theme: null, sub_theme: "Reading room" }), "current").note
    ).toBe("Reading room");
    expect(refugeFromPlace(place({ theme: null, sub_theme: null }), "current").note).toBe(
      "Not guaranteed quiet; use as potential refuge."
    );
  });

  it("always sets the constant 'Tagged as sensory refuge in places table' quietness", () => {
    const view = refugeFromPlace(place(), "current");
    expect(view.quietness).toBe("Tagged as sensory refuge in places table");
  });

  it("passes id and name through unchanged", () => {
    const view = refugeFromPlace(place({ id: "abc-123", name: "Named Place" }), "current");
    expect(view.id).toBe("abc-123");
    expect(view.name).toBe("Named Place");
  });
});

describe("refugeFromStatic", () => {
  it("maps refuges[0] (state-library) fields into their detail-page slots", () => {
    const view = refugeFromStatic(refuges[0]);
    expect(view.id).toBe("state-library");
    expect(view.kind).toBe("Library / public forecourt");
    expect(view.distanceText).toBe("5 min from current route");
    // availability renders in the "Source" slot, not a separate "availability" slot.
    expect(view.source).toBe("Open public area");
    expect(view.quietness).toBe("Medium confidence, predicted lower crowd");
    expect(view.note).toBe("Not guaranteed quiet; use as potential refuge.");
    expect(view.imageUrl).toBe("/images/library.jpg");
  });

  it("maps refuges[2] (town-hall-arcade) availability into the Source slot", () => {
    const view = refugeFromStatic(refuges[2]);
    expect(view.source).toBe("Unknown");
  });
});
