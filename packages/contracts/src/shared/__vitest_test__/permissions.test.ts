import { describe, expect, it } from "vitest";

import {
  PermissionValuePattern,
  normalizePermission,
  validatePermissionVocabulary,
} from "../permissions";
import { PermissionSchema, PermissionValues, isPermission } from "../../all-permissions";

describe("shared permissions", () => {
  it("contains no duplicate values", () => {
    expect(new Set(PermissionValues).size).toBe(PermissionValues.length);
  });

  it("keeps all values lowercase", () => {
    for (const value of PermissionValues) {
      expect(value).toBe(value.toLowerCase());
    }
  });

  it("enforces dot-separated permission format", () => {
    for (const value of PermissionValues) {
      expect(PermissionValuePattern.test(value)).toBe(true);
    }
  });

  it("keeps a single canonical treasury scope", () => {
    const hasTreasscope = PermissionValues.some((value) => value.startsWith("treas."));
    const hasTreasuryScope = PermissionValues.some((value) => value.startsWith("treasury."));

    expect(hasTreasscope).toBe(false);
    expect(hasTreasuryScope).toBe(true);
  });

  it("supports runtime validation via schema and guard", () => {
    const sample = "comm.workflow.execute";
    expect(PermissionSchema.safeParse(sample).success).toBe(true);
    expect(isPermission(sample)).toBe(true);
    expect(isPermission("comm.workflow.unknown")).toBe(false);
  });

  it("normalizes legacy aliases", () => {
    expect(normalizePermission("treas.bank-account.read")).toBe("treasury.bank-account.read");
    expect(normalizePermission("comm.agenda_item.create")).toBe("comm.agenda-item.create");
  });

  it("passes vocabulary validation checks", () => {
    expect(validatePermissionVocabulary(PermissionValues)).toEqual([]);
  });
});
