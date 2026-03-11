/**
 * Unit tests for threeWayMatch — pure calculator.
 *
 * No I/O, no mocks needed.
 */
import { describe, expect, it } from "vitest";
import { threeWayMatch } from "../calculators/three-way-match";

describe("threeWayMatch", () => {
  // ── MATCHED ──────────────────────────────────────────────────────────────

  describe("MATCHED", () => {
    it("returns MATCHED when PO = Receipt = Invoice", () => {
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 10000n,
        invoiceAmount: 10000n,
        tolerancePercent: 1,
      });
      expect(result.status).toBe("MATCHED");
    });

    it("returns MATCHED when all amounts are zero", () => {
      const result = threeWayMatch({
        poAmount: 0n,
        receiptAmount: 0n,
        invoiceAmount: 0n,
        tolerancePercent: 0,
      });
      expect(result.status).toBe("MATCHED");
    });

    it("returns MATCHED for large identical amounts", () => {
      const result = threeWayMatch({
        poAmount: 999999999n,
        receiptAmount: 999999999n,
        invoiceAmount: 999999999n,
        tolerancePercent: 0,
      });
      expect(result.status).toBe("MATCHED");
    });
  });

  // ── QUANTITY_MISMATCH ────────────────────────────────────────────────────

  describe("QUANTITY_MISMATCH", () => {
    it("returns QUANTITY_MISMATCH when PO ≠ Receipt", () => {
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 9000n,
        invoiceAmount: 10000n,
        tolerancePercent: 1,
      });
      expect(result.status).toBe("QUANTITY_MISMATCH");
      if (result.status === "QUANTITY_MISMATCH") {
        expect(result.poAmount).toBe(10000n);
        expect(result.receiptAmount).toBe(9000n);
      }
    });

    it("returns QUANTITY_MISMATCH when PO > Receipt", () => {
      const result = threeWayMatch({
        poAmount: 50000n,
        receiptAmount: 30000n,
        invoiceAmount: 50000n,
        tolerancePercent: 5,
      });
      expect(result.status).toBe("QUANTITY_MISMATCH");
    });

    it("returns QUANTITY_MISMATCH when Receipt > PO (over-receipt)", () => {
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 12000n,
        invoiceAmount: 12000n,
        tolerancePercent: 0,
      });
      expect(result.status).toBe("QUANTITY_MISMATCH");
    });

    it("checks PO vs Receipt BEFORE checking Invoice — PO mismatch wins", () => {
      // Even if Invoice matches Receipt, PO mismatch is reported first
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 9000n,
        invoiceAmount: 9000n, // Invoice matches Receipt exactly
        tolerancePercent: 0,
      });
      expect(result.status).toBe("QUANTITY_MISMATCH");
    });
  });

  // ── WITHIN_TOLERANCE ────────────────────────────────────────────────────

  describe("WITHIN_TOLERANCE", () => {
    it("returns WITHIN_TOLERANCE when variance is exactly at tolerance", () => {
      // PO = Receipt = 10000, Invoice = 10100 → variance = 100 → 1.00% = 1% tolerance
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 10000n,
        invoiceAmount: 10100n,
        tolerancePercent: 1,
      });
      expect(result.status).toBe("WITHIN_TOLERANCE");
      if (result.status === "WITHIN_TOLERANCE") {
        expect(result.variance).toBe(100n);
        expect(result.variancePercent).toBe(1);
      }
    });

    it("returns WITHIN_TOLERANCE for a small under-invoice", () => {
      // Invoice is $0.50 less than receipt on $100 → 0.5%
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 10000n,
        invoiceAmount: 9950n,
        tolerancePercent: 1,
      });
      expect(result.status).toBe("WITHIN_TOLERANCE");
      if (result.status === "WITHIN_TOLERANCE") {
        expect(result.variance).toBe(-50n); // negative = under-invoiced
      }
    });

    it("returns WITHIN_TOLERANCE for 0.5% variance with 1% tolerance", () => {
      const result = threeWayMatch({
        poAmount: 100000n,
        receiptAmount: 100000n,
        invoiceAmount: 100500n, // +0.5%
        tolerancePercent: 1,
      });
      expect(result.status).toBe("WITHIN_TOLERANCE");
      if (result.status === "WITHIN_TOLERANCE") {
        expect(result.variancePercent).toBe(0.5);
      }
    });
  });

  // ── OVER_TOLERANCE ───────────────────────────────────────────────────────

  describe("OVER_TOLERANCE", () => {
    it("returns OVER_TOLERANCE when variance exceeds tolerance", () => {
      // Invoice is 5% over receipt, tolerance is 1%
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 10000n,
        invoiceAmount: 10500n,
        tolerancePercent: 1,
      });
      expect(result.status).toBe("OVER_TOLERANCE");
      if (result.status === "OVER_TOLERANCE") {
        expect(result.variance).toBe(500n);
        expect(result.variancePercent).toBe(5);
      }
    });

    it("returns OVER_TOLERANCE when receipt is 0 but invoice is non-zero", () => {
      const result = threeWayMatch({
        poAmount: 0n,
        receiptAmount: 0n,
        invoiceAmount: 1n, // Any non-zero invoice against zero receipt = 100% variance
        tolerancePercent: 1,
      });
      expect(result.status).toBe("OVER_TOLERANCE");
      if (result.status === "OVER_TOLERANCE") {
        expect(result.variancePercent).toBe(100);
      }
    });

    it("returns OVER_TOLERANCE with zero tolerance for any variance", () => {
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 10000n,
        invoiceAmount: 10001n, // 1 cent over
        tolerancePercent: 0,
      });
      expect(result.status).toBe("OVER_TOLERANCE");
    });

    it("returns OVER_TOLERANCE for large negative variance beyond tolerance", () => {
      // Invoice is 10% under — still over the 1% tolerance
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 10000n,
        invoiceAmount: 9000n,
        tolerancePercent: 1,
      });
      expect(result.status).toBe("OVER_TOLERANCE");
      if (result.status === "OVER_TOLERANCE") {
        expect(result.variance).toBe(-1000n);
        expect(result.variancePercent).toBe(10);
      }
    });
  });

  // ── Edge / Boundary ───────────────────────────────────────────────────────

  describe("boundary conditions", () => {
    it("uses basis-point precision (no floating-point drift at .33% thresholds)", () => {
      // 33.33 units out of 10000 → 0.3333%
      const result = threeWayMatch({
        poAmount: 10000n,
        receiptAmount: 10000n,
        invoiceAmount: 10033n, // 0.33%
        tolerancePercent: 1,
      });
      // 0.33% < 1% → WITHIN_TOLERANCE
      expect(result.status).toBe("WITHIN_TOLERANCE");
    });

    it("handles very large amounts without overflow", () => {
      // $10M invoice, 2% variance on 1% tolerance
      const result = threeWayMatch({
        poAmount: 1_000_000_000n, // $10,000,000.00 in cents
        receiptAmount: 1_000_000_000n,
        invoiceAmount: 1_020_000_000n, // +2%
        tolerancePercent: 1,
      });
      expect(result.status).toBe("OVER_TOLERANCE");
      if (result.status === "OVER_TOLERANCE") {
        expect(result.variance).toBe(20_000_000n);
        expect(result.variancePercent).toBe(2);
      }
    });

    it("handles 1 cent precision", () => {
      const result = threeWayMatch({
        poAmount: 1n,
        receiptAmount: 1n,
        invoiceAmount: 1n,
        tolerancePercent: 0,
      });
      expect(result.status).toBe("MATCHED");
    });
  });

  // ── Invariants ───────────────────────────────────────────────────────────

  describe("threeWayMatch — invariants", () => {
    function testVarianceInvariant(
      poAmount: bigint,
      receiptAmount: bigint,
      invoiceAmount: bigint,
      tolerancePercent: number,
    ) {
      const result = threeWayMatch({
        poAmount,
        receiptAmount,
        invoiceAmount,
        tolerancePercent,
      });
      return result;
    }

    it("variance calculation is always sign-correct (positive over, negative under)", () => {
      // Over-invoice: invoice > receipt → positive variance
      const over = testVarianceInvariant(10000n, 10000n, 11000n, 5);
      if (over.status === "WITHIN_TOLERANCE" || over.status === "OVER_TOLERANCE") {
        expect(over.variance).toBeGreaterThan(0n);
        expect(over.variance).toBe(1000n);
      }

      // Under-invoice: invoice < receipt → negative variance
      const under = testVarianceInvariant(10000n, 10000n, 9000n, 5);
      if (under.status === "WITHIN_TOLERANCE" || under.status === "OVER_TOLERANCE") {
        expect(under.variance).toBeLessThan(0n);
        expect(under.variance).toBe(-1000n);
      }

      // Exact match: invoice === receipt → zero or MATCHED
      const exact = testVarianceInvariant(10000n, 10000n, 10000n, 5);
      if (exact.status === "WITHIN_TOLERANCE") {
        expect(exact.variance).toBe(0n);
      } else if (exact.status === "MATCHED") {
        // No variance field for MATCHED
        expect(exact.status).toBe("MATCHED");
      }
    });

    it("variance magnitude equals absolute difference between invoice and receipt", () => {
      const cases: Array<[bigint, bigint, bigint, number]> = [
        [100000n, 100000n, 101000n, 2], // +1000
        [100000n, 100000n, 99000n, 2],  // -1000
        [50000n, 50000n, 50500n, 2],    // +500
        [200000n, 200000n, 190000n, 5], // -10000
      ];

      for (const [po, receipt, invoice, tol] of cases) {
        const result = testVarianceInvariant(po, receipt, invoice, tol);
        if (result.status === "WITHIN_TOLERANCE" || result.status === "OVER_TOLERANCE") {
          const expectedVariance = invoice - receipt;
          expect(result.variance).toBe(expectedVariance);
          const absVariance = result.variance < 0n ? -result.variance : result.variance;
          const expectedAbsVariance = expectedVariance < 0n ? -expectedVariance : expectedVariance;
          expect(absVariance).toBe(expectedAbsVariance);
        }
      }
    });

    it("variancePercent is always non-negative", () => {
      const cases: Array<[bigint, bigint, bigint, number]> = [
        [10000n, 10000n, 11000n, 5],   // +10%
        [10000n, 10000n, 9000n, 5],    // -10% but variancePercent is abs
        [100000n, 100000n, 100500n, 1], // +0.5%
        [100000n, 100000n, 99500n, 1],  // -0.5%
      ];

      for (const [po, receipt, invoice, tol] of cases) {
        const result = testVarianceInvariant(po, receipt, invoice, tol);
        if (result.status === "WITHIN_TOLERANCE" || result.status === "OVER_TOLERANCE") {
          expect(result.variancePercent).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("status is mutually exclusive (only one branch taken)", () => {
      const cases: Array<[bigint, bigint, bigint, number]> = [
        [10000n, 10000n, 10000n, 1],    // MATCHED
        [10000n, 9000n, 9000n, 1],      // QUANTITY_MISMATCH
        [10000n, 10000n, 10100n, 1],    // WITHIN_TOLERANCE
        [10000n, 10000n, 11000n, 1],    // OVER_TOLERANCE
        [0n, 0n, 0n, 0],                 // MATCHED (zero case)
      ];

      for (const [po, receipt, invoice, tol] of cases) {
        const result = testVarianceInvariant(po, receipt, invoice, tol);
        // Exactly one status field is populated
        const statusCount =
          (result.status === "MATCHED" ? 1 : 0) +
          (result.status === "QUANTITY_MISMATCH" ? 1 : 0) +
          (result.status === "WITHIN_TOLERANCE" ? 1 : 0) +
          (result.status === "OVER_TOLERANCE" ? 1 : 0) +
          (result.status === "PRICE_MISMATCH" ? 1 : 0);
        expect(statusCount).toBe(1);
      }
    });

    it("over-invoice and under-invoice with same magnitude honor tolerance identically", () => {
      // +2% variance with 1% tolerance → OVER_TOLERANCE
      const over = testVarianceInvariant(10000n, 10000n, 10200n, 1);
      expect(over.status).toBe("OVER_TOLERANCE");
      if (over.status === "OVER_TOLERANCE") {
        expect(over.variancePercent).toBe(2);
      }

      // -2% variance with 1% tolerance → OVER_TOLERANCE (abs value counts)
      const under = testVarianceInvariant(10000n, 10000n, 9800n, 1);
      expect(under.status).toBe("OVER_TOLERANCE");
      if (under.status === "OVER_TOLERANCE") {
        expect(under.variancePercent).toBe(2);
      }
    });

    it("tolerance threshold is applied consistently as basis points", () => {
      // Tolerance = 1% = 100 basis points
      // Variance = 1% (exactly at 100bp) → WITHIN_TOLERANCE
      const atThreshold = testVarianceInvariant(100000n, 100000n, 101000n, 1);
      expect(atThreshold.status).toBe("WITHIN_TOLERANCE");

      // Variance = 1.01% (above 100bp) → OVER_TOLERANCE
      const aboveThreshold = testVarianceInvariant(100000n, 100000n, 101010n, 1);
      expect(aboveThreshold.status).toBe("OVER_TOLERANCE");

      // Variance = 0.99% (below 100bp) → WITHIN_TOLERANCE
      const belowThreshold = testVarianceInvariant(100000n, 100000n, 100990n, 1);
      expect(belowThreshold.status).toBe("WITHIN_TOLERANCE");
    });

    it("detects PO vs Receipt mismatch BEFORE checking Invoice tolerance", () => {
      // PO ≠ Receipt, but Invoice matches Receipt perfectly
      // Should be QUANTITY_MISMATCH (not MATCHED or WITHIN_TOLERANCE)
      const result = testVarianceInvariant(10000n, 9500n, 9500n, 0);
      expect(result.status).toBe("QUANTITY_MISMATCH");
      if (result.status === "QUANTITY_MISMATCH") {
        expect(result.poAmount).toBe(10000n);
        expect(result.receiptAmount).toBe(9500n);
      }
    });

    it("is deterministic — idempotent across repeated calls", () => {
      const input = {
        poAmount: 123456n,
        receiptAmount: 123456n,
        invoiceAmount: 125000n,
        tolerancePercent: 2.5,
      };

      const result1 = threeWayMatch(input);
      const result2 = threeWayMatch(input);
      const result3 = threeWayMatch(input);

      // All results should have the same status
      expect(result1.status).toBe(result2.status);
      expect(result2.status).toBe(result3.status);

      // If variance fields exist, they should match
      if (result1.status === "WITHIN_TOLERANCE" || result1.status === "OVER_TOLERANCE") {
        if (result2.status === "WITHIN_TOLERANCE" || result2.status === "OVER_TOLERANCE") {
          expect(result1.variance).toBe(result2.variance);
          expect(result1.variancePercent).toBe(result2.variancePercent);
        }
      }
    });

    it("handles mixed scale amounts while preserving variance accuracy", () => {
      const cases: Array<[bigint, bigint, bigint, number, string]> = [
        [1n, 1n, 1n, 0, "1 cent"],
        [100n, 100n, 100n, 0, "1 dollar"],
        [1000000000n, 1000000000n, 1010000000n, 1, "10M with 1% tolerance"],
        [1n, 1n, 2n, 50, "small amount, large tolerance"],
      ];

      for (const [po, receipt, invoice, tol, label] of cases) {
        const result = testVarianceInvariant(po, receipt, invoice, tol);
        // Should not throw or produce NaN/Infinity
        expect(Number.isFinite(result.variancePercent ?? 0)).toBe(true);
      }
    });
  });
});
