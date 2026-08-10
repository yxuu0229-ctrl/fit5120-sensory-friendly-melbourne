import { describe, expect, it } from "vitest";
import {
  formatHourLabel,
  melbourneDayHour,
  nextMelbourneDayHour,
} from "./quietWindowForecast";

describe("quietWindowForecast time helpers", () => {
  it("melbourneDayHour returns a weekday name and 0–23 hour", () => {
    const { dayName, hourday } = melbourneDayHour(
      new Date("2026-08-10T05:30:00.000Z")
    );
    expect([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]).toContain(dayName);
    expect(hourday).toBeGreaterThanOrEqual(0);
    expect(hourday).toBeLessThanOrEqual(23);
  });

  it("nextMelbourneDayHour advances one hour and rolls the weekday at midnight", () => {
    // 2026-08-10 13:30 UTC = Monday 23:30 Melbourne (AEST, UTC+10)
    // next hour → Tuesday 12am
    expect(nextMelbourneDayHour(new Date("2026-08-10T13:30:00.000Z"))).toEqual({
      dayName: "Tuesday",
      hourday: 0,
    });

    // 2026-08-10 04:15 UTC = Monday 14:15 Melbourne → next = Monday 3pm
    expect(nextMelbourneDayHour(new Date("2026-08-10T04:15:00.000Z"))).toEqual({
      dayName: "Monday",
      hourday: 15,
    });
  });

  it("formatHourLabel covers midnight and noon", () => {
    expect(formatHourLabel(0)).toBe("12am");
    expect(formatHourLabel(12)).toBe("12pm");
    expect(formatHourLabel(15)).toBe("3pm");
  });
});
