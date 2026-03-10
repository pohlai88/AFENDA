/**
 * Unit tests for aging service — getAgingReport.
 *
 * Verifies service exports and basic behavior.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId } from "@afenda/contracts";

const mockSelectFrom = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockDb = {
  select: mockSelect,
} as any;

vi.mock("@afenda/db", () => ({
  invoice: {},
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    sql: vi.fn(() => ({})),
  };
});

import { getAgingReport } from "../aging.service.js";

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelectWhere.mockResolvedValue([]);
});

describe("getAgingReport", () => {
  it("returns buckets with zero totals when no invoices", async () => {
    const result = await getAgingReport(mockDb, { orgId: ORG_ID });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.byBucket).toBeDefined();
      expect(Array.isArray(result.data.summary.byBucket)).toBe(true);
      expect(result.data.suppliers).toBeDefined();
    }
  });
});
