import { describe, expect, it } from "vitest";

import { schemaCompatibilityCheck, verifySeedMatchesCode } from "../governance";

describe("shared governance", () => {
  it("verifies seed permissions against canonical values", () => {
    const result = verifySeedMatchesCode([
      { key: "comm.task.read" },
      { key: "comm.task.update" },
      { key: "unknown.permission" },
    ]);

    expect(result.ok).toBe(false);
    expect(result.unknownInSeed).toContain("unknown.permission");
    expect(result.missingInSeed.length).toBeGreaterThan(0);
  });

  it("passes schema compatibility within same major", () => {
    const result = schemaCompatibilityCheck({
      currentVersion: "1.4.0",
      targetVersion: "1.5.0",
    });

    expect(result.compatible).toBe(true);
  });

  it("blocks major version bump without approval", () => {
    const result = schemaCompatibilityCheck({
      currentVersion: "1.9.0",
      targetVersion: "2.0.0",
      allowMajorBump: false,
    });

    expect(result.compatible).toBe(false);
    expect(result.reason).toContain("requires explicit approval");
  });
});
