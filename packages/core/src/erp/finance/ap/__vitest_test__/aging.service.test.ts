/**
 * Unit tests for aging service (getAgingReport) and aging calculator (calculateAging).
 *
 * Service tests use DB mocks.
 * Calculator tests are pure — no mocks needed.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId } from "@afenda/contracts";
import { calculateAging, type InvoiceForAging } from "../calculators/aging";
import {
  AP_TEST_AS_OF_DATE,
  createAgingInvoice,
} from "./ap-test-builders";

// ── Mock DB for service ───────────────────────────────────────────────────────

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

import { getAgingReport } from "../aging.service";

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;

beforeEach(() => {
  vi.clearAllMocks();
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
  mockSelectWhere.mockResolvedValue([]);
});

// ── getAgingReport (service) ──────────────────────────────────────────────────

describe("getAgingReport", () => {
  it("returns ok=true with empty summary when no invoices", async () => {
    const result = await getAgingReport(mockDb, { orgId: ORG_ID });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.byBucket).toBeDefined();
      expect(Array.isArray(result.data.summary.byBucket)).toBe(true);
      expect(result.data.suppliers).toBeDefined();
    }
  });

  it("returns all 5 bucket labels in summary even when empty", async () => {
    const result = await getAgingReport(mockDb, { orgId: ORG_ID });
    if (result.ok) {
      const bucketLabels = result.data.summary.byBucket.map((b) => b.bucket);
      expect(bucketLabels).toContain("current");
      expect(bucketLabels).toContain("1-30");
      expect(bucketLabels).toContain("31-60");
      expect(bucketLabels).toContain("61-90");
      expect(bucketLabels).toContain("90+");
    }
  });

  it("returns zero totalOutstanding when no invoices", async () => {
    const result = await getAgingReport(mockDb, { orgId: ORG_ID });
    if (result.ok) {
      expect(result.data.summary.totalOutstandingMinor).toBe(0n);
      expect(result.data.summary.totalInvoiceCount).toBe(0);
    }
  });
});

// ── calculateAging (pure calculator) ─────────────────────────────────────────

const AS_OF = AP_TEST_AS_OF_DATE;

describe("calculateAging — bucket classification", () => {
  it("classifies invoice due today as 'current'", () => {
    const inv = createAgingInvoice({ dueDate: AS_OF });
    const report = calculateAging({ invoices: [inv], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "current");
    expect(bucket?.invoiceCount).toBe(1);
  });

  it("classifies invoice due tomorrow as 'current' (not yet overdue)", () => {
    const tomorrow = new Date(AS_OF);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const inv = createAgingInvoice({ dueDate: tomorrow });
    const report = calculateAging({ invoices: [inv], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "current");
    expect(bucket?.invoiceCount).toBe(1);
  });

  it("classifies invoice 1 day overdue as '1-30'", () => {
    const dueDate = new Date(AS_OF);
    dueDate.setDate(dueDate.getDate() - 1);
    const inv = createAgingInvoice({ dueDate });
    const report = calculateAging({ invoices: [inv], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "1-30");
    expect(bucket?.invoiceCount).toBe(1);
  });

  it("classifies invoice 30 days overdue as '1-30'", () => {
    const dueDate = new Date(AS_OF);
    dueDate.setDate(dueDate.getDate() - 30);
    const inv = createAgingInvoice({ dueDate });
    const report = calculateAging({ invoices: [inv], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "1-30");
    expect(bucket?.invoiceCount).toBe(1);
  });

  it("classifies invoice 31 days overdue as '31-60'", () => {
    const dueDate = new Date(AS_OF);
    dueDate.setDate(dueDate.getDate() - 31);
    const inv = createAgingInvoice({ dueDate });
    const report = calculateAging({ invoices: [inv], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "31-60");
    expect(bucket?.invoiceCount).toBe(1);
  });

  it("classifies invoice 60 days overdue as '31-60'", () => {
    const dueDate = new Date(AS_OF);
    dueDate.setDate(dueDate.getDate() - 60);
    const inv = createAgingInvoice({ dueDate });
    const report = calculateAging({ invoices: [inv], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "31-60");
    expect(bucket?.invoiceCount).toBe(1);
  });

  it("classifies invoice 61 days overdue as '61-90'", () => {
    const dueDate = new Date(AS_OF);
    dueDate.setDate(dueDate.getDate() - 61);
    const inv = createAgingInvoice({ dueDate });
    const report = calculateAging({ invoices: [inv], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "61-90");
    expect(bucket?.invoiceCount).toBe(1);
  });

  it("classifies invoice 91 days overdue as '90+'", () => {
    const dueDate = new Date(AS_OF);
    dueDate.setDate(dueDate.getDate() - 91);
    const inv = createAgingInvoice({ dueDate });
    const report = calculateAging({ invoices: [inv], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "90+");
    expect(bucket?.invoiceCount).toBe(1);
  });

  it("classifies invoice 180 days overdue as '90+'", () => {
    const dueDate = new Date(AS_OF);
    dueDate.setDate(dueDate.getDate() - 180);
    const inv = createAgingInvoice({ dueDate });
    const report = calculateAging({ invoices: [inv], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "90+");
    expect(bucket?.invoiceCount).toBe(1);
  });
});

describe("calculateAging — supplier grouping", () => {
  it("groups invoices by supplier", () => {
    const invA1 = createAgingInvoice({ supplierId: "sup-A", supplierName: "Alpha" });
    const invA2 = createAgingInvoice({ supplierId: "sup-A", supplierName: "Alpha" });
    const invB = createAgingInvoice({ supplierId: "sup-B", supplierName: "Beta" });

    const report = calculateAging({ invoices: [invA1, invA2, invB], asOfDate: AS_OF });

    expect(report.suppliers).toHaveLength(2);
    const alpha = report.suppliers.find((s) => s.supplierId === "sup-A");
    expect(alpha?.invoiceCount).toBe(2);
  });

  it("sorts suppliers by total outstanding descending", () => {
    const supA = createAgingInvoice({ supplierId: "sup-A", supplierName: "Alpha", balanceMinor: 5000n });
    const supB = createAgingInvoice({ supplierId: "sup-B", supplierName: "Beta", balanceMinor: 15000n });
    const supC = createAgingInvoice({ supplierId: "sup-C", supplierName: "Gamma", balanceMinor: 10000n });

    const report = calculateAging({ invoices: [supA, supB, supC], asOfDate: AS_OF });

    // Order: Beta (15000) > Gamma (10000) > Alpha (5000)
    expect(report.suppliers[0].supplierId).toBe("sup-B");
    expect(report.suppliers[1].supplierId).toBe("sup-C");
    expect(report.suppliers[2].supplierId).toBe("sup-A");
  });

  it("sums balance correctly within a supplier's bucket", () => {
    // Both invoices for same supplier, both 1-30 days overdue
    const dueDate = new Date(AS_OF);
    dueDate.setDate(dueDate.getDate() - 15);

    const inv1 = createAgingInvoice({ supplierId: "sup-A", dueDate, balanceMinor: 30000n });
    const inv2 = createAgingInvoice({ supplierId: "sup-A", dueDate, balanceMinor: 70000n });

    const report = calculateAging({ invoices: [inv1, inv2], asOfDate: AS_OF });
    const bucket = report.suppliers[0].buckets.find((b) => b.bucket === "1-30");
    expect(bucket?.totalAmountMinor).toBe(100000n);
    expect(bucket?.invoiceCount).toBe(2);
  });
});

describe("calculateAging — summary totals", () => {
  it("summary totalInvoiceCount matches all invoices", () => {
    const invoices = [
      createAgingInvoice({ supplierId: "sup-A" }),
      createAgingInvoice({ supplierId: "sup-A" }),
      createAgingInvoice({ supplierId: "sup-B" }),
    ];
    const report = calculateAging({ invoices, asOfDate: AS_OF });
    expect(report.summary.totalInvoiceCount).toBe(3);
  });

  it("summary totalOutstandingMinor sums all balances", () => {
    const invoices = [
      createAgingInvoice({ balanceMinor: 10000n }),
      createAgingInvoice({ balanceMinor: 20000n }),
      createAgingInvoice({ balanceMinor: 30000n }),
    ];
    const report = calculateAging({ invoices, asOfDate: AS_OF });
    expect(report.summary.totalOutstandingMinor).toBe(60000n);
  });

  it("returns 0n totals when no invoices", () => {
    const report = calculateAging({ invoices: [], asOfDate: AS_OF });
    expect(report.summary.totalOutstandingMinor).toBe(0n);
    expect(report.summary.totalInvoiceCount).toBe(0);
    expect(report.suppliers).toHaveLength(0);
  });

  it("all 5 bucket entries present in summary even with zero amounts", () => {
    const report = calculateAging({ invoices: [createAgingInvoice()], asOfDate: AS_OF });
    expect(report.summary.byBucket).toHaveLength(5);
    const labels = report.summary.byBucket.map((b) => b.bucket);
    expect(labels).toEqual(["current", "1-30", "31-60", "61-90", "90+"]);
  });

  it("asOfDate is preserved in report", () => {
    const report = calculateAging({ invoices: [], asOfDate: AS_OF });
    expect(report.asOfDate).toBe(AS_OF);
  });
});

describe("calculateAging — invariants", () => {
  function buildInvariantDataset(): InvoiceForAging[] {
    return [
      createAgingInvoice({ id: "inv-current-a", supplierId: "sup-A", supplierName: "Alpha", dueDate: new Date("2026-03-20T00:00:00.000Z"), balanceMinor: 5000n }),
      createAgingInvoice({ id: "inv-current-b", supplierId: "sup-A", supplierName: "Alpha", dueDate: new Date("2026-03-15T00:00:00.000Z"), balanceMinor: 7000n }),
      createAgingInvoice({ id: "inv-1-30", supplierId: "sup-B", supplierName: "Beta", dueDate: new Date("2026-03-01T00:00:00.000Z"), balanceMinor: 11000n }),
      createAgingInvoice({ id: "inv-31-60", supplierId: "sup-B", supplierName: "Beta", dueDate: new Date("2026-02-10T00:00:00.000Z"), balanceMinor: 13000n }),
      createAgingInvoice({ id: "inv-61-90", supplierId: "sup-C", supplierName: "Gamma", dueDate: new Date("2026-01-10T00:00:00.000Z"), balanceMinor: 17000n }),
      createAgingInvoice({ id: "inv-90-plus", supplierId: "sup-C", supplierName: "Gamma", dueDate: new Date("2025-12-01T00:00:00.000Z"), balanceMinor: 19000n }),
    ];
  }

  it("conserves amount and invoice counts across supplier and summary buckets", () => {
    const invoices = buildInvariantDataset();
    const report = calculateAging({ invoices, asOfDate: AS_OF });

    const supplierAmountSum = report.suppliers.reduce(
      (sum, supplier) => sum + supplier.totalOutstandingMinor,
      0n,
    );
    const supplierCountSum = report.suppliers.reduce(
      (sum, supplier) => sum + supplier.invoiceCount,
      0,
    );
    const summaryBucketAmountSum = report.summary.byBucket.reduce(
      (sum, bucket) => sum + bucket.totalAmountMinor,
      0n,
    );
    const summaryBucketCountSum = report.summary.byBucket.reduce(
      (sum, bucket) => sum + bucket.invoiceCount,
      0,
    );

    expect(supplierAmountSum).toBe(report.summary.totalOutstandingMinor);
    expect(summaryBucketAmountSum).toBe(report.summary.totalOutstandingMinor);
    expect(supplierCountSum).toBe(report.summary.totalInvoiceCount);
    expect(summaryBucketCountSum).toBe(report.summary.totalInvoiceCount);
  });

  it("keeps each supplier bucket totals aligned with supplier totals", () => {
    const invoices = buildInvariantDataset();
    const report = calculateAging({ invoices, asOfDate: AS_OF });

    for (const supplier of report.suppliers) {
      const bucketAmountSum = supplier.buckets.reduce(
        (sum, bucket) => sum + bucket.totalAmountMinor,
        0n,
      );
      const bucketCountSum = supplier.buckets.reduce(
        (sum, bucket) => sum + bucket.invoiceCount,
        0,
      );

      expect(bucketAmountSum).toBe(supplier.totalOutstandingMinor);
      expect(bucketCountSum).toBe(supplier.invoiceCount);
    }
  });

  it("keeps totals non-negative when all input balances are non-negative", () => {
    const invoices = buildInvariantDataset();
    const report = calculateAging({ invoices, asOfDate: AS_OF });

    expect(report.summary.totalOutstandingMinor >= 0n).toBe(true);
    for (const bucket of report.summary.byBucket) {
      expect(bucket.totalAmountMinor >= 0n).toBe(true);
    }
    for (const supplier of report.suppliers) {
      expect(supplier.totalOutstandingMinor >= 0n).toBe(true);
      for (const bucket of supplier.buckets) {
        expect(bucket.totalAmountMinor >= 0n).toBe(true);
      }
    }
  });
});
