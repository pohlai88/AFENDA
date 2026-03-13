import { describe, expect, it } from "vitest";

import {
  FixedClock,
  SystemClock,
  getClock,
  now,
  nowMs,
  nowUtc,
  setClock,
  withClock,
  withFixedClock,
} from "../clock";

describe("shared clock", () => {
  it("FixedClock returns stable values", () => {
    const clock = new FixedClock("2025-01-01T00:00:00.000Z");

    expect(clock.nowIso()).toBe("2025-01-01T00:00:00.000Z");
    expect(clock.nowMs()).toBe(1735689600000);
    expect(clock.now().toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("throws on invalid fixed date input", () => {
    expect(() => new FixedClock("not-a-date")).toThrow("FixedClock: invalid date input");
  });

  it("withFixedClock binds time for callback and restores previous clock", () => {
    const before = getClock();

    const value = withFixedClock("2024-12-31T23:59:59.000Z", () => {
      expect(nowUtc()).toBe("2024-12-31T23:59:59.000Z");
      expect(now().toISOString()).toBe("2024-12-31T23:59:59.000Z");
      return nowMs();
    });

    expect(value).toBe(1735689599000);
    expect(getClock()).toBe(before);
  });

  it("withClock restores clock when callback throws", () => {
    const before = getClock();
    const fixed = new FixedClock("2026-01-01T00:00:00.000Z");

    expect(() =>
      withClock(fixed, () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");

    expect(getClock()).toBe(before);
  });

  it("setClock returns previous clock", () => {
    const previous = getClock();
    const fixed = new FixedClock("2027-01-01T00:00:00.000Z");

    const returned = setClock(fixed);
    expect(returned).toBe(previous);

    // cleanup
    setClock(previous);
  });

  it("SystemClock returns valid UTC outputs", () => {
    expect(() => new Date(SystemClock.nowIso())).not.toThrow();
    expect(Number.isFinite(SystemClock.nowMs())).toBe(true);
  });
});
