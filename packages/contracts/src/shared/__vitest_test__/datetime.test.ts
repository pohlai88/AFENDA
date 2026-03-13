import { describe, expect, it } from "vitest";

import {
  datePartitionColumnDefinition,
  datePartitionColumnExpr,
  datePartitionFor,
  endOfDayUtc,
  parseIsoDateToUtcMidnight,
  startOfDayUtc,
  truncateToSecondsUtc,
} from "../datetime";

describe("shared datetime", () => {
  it("returns partition date for ISO UTC input", () => {
    expect(datePartitionFor("2026-03-13T00:00:00.000Z")).toBe("2026-03-13");
  });

  it("returns partition date for Date input", () => {
    expect(datePartitionFor(new Date("2026-03-13T23:59:59.999Z"))).toBe("2026-03-13");
  });

  it("builds UTC-safe Postgres partition expression", () => {
    expect(datePartitionColumnExpr("created_at")).toBe("(created_at AT TIME ZONE 'UTC')::date");
  });

  it("builds generated column definition for partition", () => {
    expect(datePartitionColumnDefinition("occurred_at", "date_partition")).toBe(
      "date_partition DATE GENERATED ALWAYS AS ((occurred_at AT TIME ZONE 'UTC')::date) STORED",
    );
  });

  it("parses ISO date to UTC midnight", () => {
    expect(parseIsoDateToUtcMidnight("2026-03-13")).toBe("2026-03-13T00:00:00.000Z");
  });

  it("computes day boundaries in UTC", () => {
    expect(startOfDayUtc("2026-03-13")).toBe("2026-03-13T00:00:00.000Z");
    expect(endOfDayUtc("2026-03-13")).toBe("2026-03-13T23:59:59.999Z");
    expect(endOfDayUtc("2026-03-13", false)).toBe("2026-03-14T00:00:00.000Z");
  });

  it("truncates datetime to second precision", () => {
    expect(truncateToSecondsUtc("2026-03-13T12:34:56.987Z")).toBe("2026-03-13T12:34:56.000Z");
  });
});
