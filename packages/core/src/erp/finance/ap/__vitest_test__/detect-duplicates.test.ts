/**
 * Unit tests for detectDuplicates — pure calculator.
 *
 * No I/O, no mocks needed.
 * Fingerprint: supplierId|supplierRef|totalAmount|invoiceDate (YYYY-MM-DD)
 */
import { describe, expect, it } from "vitest";
import { detectDuplicates, type InvoiceFingerprint } from "../calculators/detect-duplicates";
import { createDuplicateFingerprint } from "./ap-test-builders";

function makeInvoice(overrides: Partial<InvoiceFingerprint> = {}): InvoiceFingerprint {
  return createDuplicateFingerprint(overrides);
}

describe("detectDuplicates", () => {
  // ── No duplicates ────────────────────────────────────────────────────────

  describe("no duplicates", () => {
    it("returns empty array for empty input", () => {
      expect(detectDuplicates([])).toEqual([]);
    });

    it("returns empty array for a single invoice", () => {
      expect(detectDuplicates([makeInvoice()])).toEqual([]);
    });

    it("returns empty array when all invoices are unique", () => {
      const invoices = [
        makeInvoice({ invoiceId: "id-1", supplierRef: "INV-001" }),
        makeInvoice({ invoiceId: "id-2", supplierRef: "INV-002" }),
        makeInvoice({ invoiceId: "id-3", supplierRef: "INV-003" }),
      ];
      expect(detectDuplicates(invoices)).toEqual([]);
    });

    it("treats different supplier IDs as distinct (no duplicate)", () => {
      const invoices = [
        makeInvoice({ invoiceId: "id-1", supplierId: "supplier-aaa" }),
        makeInvoice({ invoiceId: "id-2", supplierId: "supplier-bbb" }),
      ];
      expect(detectDuplicates(invoices)).toEqual([]);
    });

    it("treats different amounts as distinct", () => {
      const invoices = [
        makeInvoice({ invoiceId: "id-1", totalAmount: 10000n }),
        makeInvoice({ invoiceId: "id-2", totalAmount: 10001n }),
      ];
      expect(detectDuplicates(invoices)).toEqual([]);
    });

    it("treats different dates as distinct", () => {
      const invoices = [
        makeInvoice({ invoiceId: "id-1", invoiceDate: new Date("2026-03-01T00:00:00Z") }),
        makeInvoice({ invoiceId: "id-2", invoiceDate: new Date("2026-03-02T00:00:00Z") }),
      ];
      expect(detectDuplicates(invoices)).toEqual([]);
    });

    it("treats different supplier refs as distinct", () => {
      const invoices = [
        makeInvoice({ invoiceId: "id-1", supplierRef: "INV-001" }),
        makeInvoice({ invoiceId: "id-2", supplierRef: "INV-002" }),
      ];
      expect(detectDuplicates(invoices)).toEqual([]);
    });
  });

  // ── Exact duplicates ─────────────────────────────────────────────────────

  describe("exact duplicates", () => {
    it("detects 2 identical invoices as a duplicate group", () => {
      const inv1 = makeInvoice({ invoiceId: "id-1" });
      const inv2 = makeInvoice({ invoiceId: "id-2" });
      const groups = detectDuplicates([inv1, inv2]);

      expect(groups).toHaveLength(1);
      expect(groups[0].invoices).toHaveLength(2);
      expect(groups[0].invoices.map((i) => i.invoiceId)).toContain("id-1");
      expect(groups[0].invoices.map((i) => i.invoiceId)).toContain("id-2");
    });

    it("detects 3 identical invoices as a single duplicate group", () => {
      const invoices = [
        makeInvoice({ invoiceId: "id-1" }),
        makeInvoice({ invoiceId: "id-2" }),
        makeInvoice({ invoiceId: "id-3" }),
      ];
      const groups = detectDuplicates(invoices);

      expect(groups).toHaveLength(1);
      expect(groups[0].invoices).toHaveLength(3);
    });

    it("returns correct fingerprint string", () => {
      const invoices = [
        makeInvoice({ invoiceId: "id-1" }),
        makeInvoice({ invoiceId: "id-2" }),
      ];
      const groups = detectDuplicates(invoices);

      expect(groups[0].fingerprint).toBe("supplier-aaa|INV-001|10000|2026-03-01");
    });

    it("fingerprint uses YYYY-MM-DD date part only (time-of-day ignored)", () => {
      // Same date, different time — should still be duplicates
      const inv1 = makeInvoice({
        invoiceId: "id-1",
        invoiceDate: new Date("2026-03-01T00:00:00.000Z"),
      });
      const inv2 = makeInvoice({
        invoiceId: "id-2",
        invoiceDate: new Date("2026-03-01T23:59:59.999Z"),
      });
      const groups = detectDuplicates([inv1, inv2]);
      expect(groups).toHaveLength(1);
    });
  });

  // ── Multiple independent groups ──────────────────────────────────────────

  describe("multiple independent groups", () => {
    it("separates duplicates into distinct groups by fingerprint", () => {
      const groupA = [
        makeInvoice({ invoiceId: "a1", supplierId: "sup-A", supplierRef: "INV-100" }),
        makeInvoice({ invoiceId: "a2", supplierId: "sup-A", supplierRef: "INV-100" }),
      ];
      const groupB = [
        makeInvoice({ invoiceId: "b1", supplierId: "sup-B", supplierRef: "INV-200" }),
        makeInvoice({ invoiceId: "b2", supplierId: "sup-B", supplierRef: "INV-200" }),
        makeInvoice({ invoiceId: "b3", supplierId: "sup-B", supplierRef: "INV-200" }),
      ];
      const unique = [makeInvoice({ invoiceId: "u1", supplierRef: "INV-999" })];

      const groups = detectDuplicates([...groupA, ...groupB, ...unique]);
      expect(groups).toHaveLength(2);

      const groupSizes = groups.map((g) => g.invoices.length).sort();
      expect(groupSizes).toEqual([2, 3]);
    });

    it("does not include the single unique invoice in any group", () => {
      const invoices = [
        makeInvoice({ invoiceId: "dup-1" }),
        makeInvoice({ invoiceId: "dup-2" }),
        makeInvoice({ invoiceId: "unique", supplierRef: "UNIQUE-REF" }),
      ];
      const groups = detectDuplicates(invoices);
      const allIds = groups.flatMap((g) => g.invoices.map((i) => i.invoiceId));
      expect(allIds).not.toContain("unique");
    });
  });

  // ── Immutability ──────────────────────────────────────────────────────────

  describe("immutability", () => {
    it("does not mutate input array", () => {
      const original = [
        makeInvoice({ invoiceId: "id-1" }),
        makeInvoice({ invoiceId: "id-2" }),
      ];
      const snapshot = [...original];
      detectDuplicates(original);
      expect(original).toEqual(snapshot);
    });

    it("returns readonly arrays (TypeScript structural check via length)", () => {
      const groups = detectDuplicates([
        makeInvoice({ invoiceId: "id-1" }),
        makeInvoice({ invoiceId: "id-2" }),
      ]);
      // Verify returned groups and invoices are properly shaped
      expect(Array.isArray(groups)).toBe(true);
      expect(Array.isArray(groups[0].invoices)).toBe(true);
    });
  });

  // ── Invariants ───────────────────────────────────────────────────────────

  describe("detectDuplicates — invariants", () => {
    function buildMixedDataset(): InvoiceFingerprint[] {
      return [
        // Group A: 2 duplicates
        makeInvoice({ invoiceId: "a1", supplierId: "sup-1", supplierRef: "REF-100", totalAmount: 50000n }),
        makeInvoice({ invoiceId: "a2", supplierId: "sup-1", supplierRef: "REF-100", totalAmount: 50000n }),
        // Group B: 3 duplicates
        makeInvoice({ invoiceId: "b1", supplierId: "sup-2", supplierRef: "REF-200", totalAmount: 75000n, invoiceDate: new Date("2026-02-15T00:00:00Z") }),
        makeInvoice({ invoiceId: "b2", supplierId: "sup-2", supplierRef: "REF-200", totalAmount: 75000n, invoiceDate: new Date("2026-02-15T00:00:00Z") }),
        makeInvoice({ invoiceId: "b3", supplierId: "sup-2", supplierRef: "REF-200", totalAmount: 75000n, invoiceDate: new Date("2026-02-15T00:00:00Z") }),
        // Unique invoices (should not appear in any group)
        makeInvoice({ invoiceId: "u1", supplierRef: "UNIQUE-1" }),
        makeInvoice({ invoiceId: "u2", supplierRef: "UNIQUE-2" }),
      ];
    }

    it("every returned group contains at least 2 invoices (minimum group size)", () => {
      const invoices = buildMixedDataset();
      const groups = detectDuplicates(invoices);

      for (const group of groups) {
        expect(group.invoices.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("each group has exactly one unique fingerprint across all invoices", () => {
      const invoices = buildMixedDataset();
      const groups = detectDuplicates(invoices);

      for (const group of groups) {
        // Build fingerprints for all invoices in the group
        const fingerprints = group.invoices.map((inv) => {
          const dateStr = inv.invoiceDate.toISOString().slice(0, 10);
          return `${inv.supplierId}|${inv.supplierRef}|${inv.totalAmount}|${dateStr}`;
        });

        // All invoices in a group should have the same fingerprint
        const uniqueFingerprints = new Set(fingerprints);
        expect(uniqueFingerprints.size).toBe(1);
        expect(group.fingerprint).toBe(fingerprints[0]);
      }
    });

    it("no invoice appears in multiple groups", () => {
      const invoices = buildMixedDataset();
      const groups = detectDuplicates(invoices);

      const invoiceIdCounts = new Map<string, number>();
      for (const group of groups) {
        for (const inv of group.invoices) {
          invoiceIdCounts.set(inv.invoiceId, (invoiceIdCounts.get(inv.invoiceId) ?? 0) + 1);
        }
      }

      // Every invoice that appears should appear exactly once
      for (const count of invoiceIdCounts.values()) {
        expect(count).toBe(1);
      }
    });

    it("grouped invoices are a strict subset of input invoices", () => {
      const invoices = buildMixedDataset();
      const groups = detectDuplicates(invoices);

      const inputIds = new Set(invoices.map((inv) => inv.invoiceId));
      const groupedIds = new Set<string>();
      for (const group of groups) {
        for (const inv of group.invoices) {
          groupedIds.add(inv.invoiceId);
        }
      }

      // Every grouped invoice must be in the input
      for (const id of groupedIds) {
        expect(inputIds.has(id)).toBe(true);
      }

      // Grouped invoices count <= input invoices count
      expect(groupedIds.size).toBeLessThanOrEqual(invoices.length);
    });

    it("handles large input sets without losing group information", () => {
      // Create a larger dataset with multiple groups
      const invoices: InvoiceFingerprint[] = [];

      // 5 groups with varying sizes
      for (let g = 0; g < 5; g++) {
        const groupSize = g + 2; // 2, 3, 4, 5, 6 invoices per group
        for (let i = 0; i < groupSize; i++) {
          invoices.push(
            makeInvoice({
              invoiceId: `g${g}-inv${i}`,
              supplierId: `sup-${g}`,
              supplierRef: `REF-${g}`,
              totalAmount: BigInt(10000 * (g + 1)),
              invoiceDate: new Date(`2026-0${1 + (g % 9)}-15T00:00:00Z`),
            }),
          );
        }
      }

      // Add unique invoices
      for (let u = 0; u < 10; u++) {
        invoices.push(
          makeInvoice({
            invoiceId: `unique-${u}`,
            supplierRef: `UNIQUE-${u}`,
          }),
        );
      }

      const groups = detectDuplicates(invoices);

      // Should detect 5 groups (one per group above)
      expect(groups).toHaveLength(5);

      // Verify group sizes match expected
      const groupSizes = groups.map((g) => g.invoices.length).sort((a, b) => a - b);
      expect(groupSizes).toEqual([2, 3, 4, 5, 6]);

      // All grouped invoices should still be subset of input
      const groupedCount = groups.reduce((sum, g) => sum + g.invoices.length, 0);
      expect(groupedCount).toBe(2 + 3 + 4 + 5 + 6); // No overlap
      expect(groupedCount).toBeLessThanOrEqual(invoices.length);
    });
  });
});
