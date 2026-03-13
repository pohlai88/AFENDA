import { describe, expect, it } from "vitest";

import {
  CorrelationIdHeader,
  DeprecationWarningHeader,
  HeaderNameValues,
  IdempotencyKeyHeader,
  OrgIdHeader,
  RequestIdHeader,
} from "../headers";

describe("shared headers", () => {
  it("keeps required header names in allowlist", () => {
    expect(HeaderNameValues).toContain(CorrelationIdHeader);
    expect(HeaderNameValues).toContain(RequestIdHeader);
    expect(HeaderNameValues).toContain(IdempotencyKeyHeader);
    expect(HeaderNameValues).toContain(OrgIdHeader);
    expect(HeaderNameValues).toContain(DeprecationWarningHeader);
  });

  it("enforces lowercase header constants", () => {
    for (const header of HeaderNameValues) {
      expect(header).toBe(header.toLowerCase());
    }
  });
});
