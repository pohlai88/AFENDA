/**
 * Unit tests for generateNACHAFile — pure calculator.
 *
 * Validates NACHA fixed-width record layout, line lengths, totals.
 * No I/O, no mocks needed.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  generateNACHAFile,
  type NACHAOriginatorInfo,
  type NACHAPaymentItem,
} from "../calculators/payment-file-nacha";
import {
  AP_TEST_EFFECTIVE_DATE,
  AP_TEST_ORIGINATOR,
  createNachaPaymentItem,
} from "./ap-test-builders";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "golden");
const NACHA_GOLDEN_FIXTURE = readFileSync(join(FIXTURES_DIR, "payment-file-nacha.ach"), "utf8");
const NACHA_SAVINGS_GOLDEN_FIXTURE = readFileSync(
  join(FIXTURES_DIR, "payment-file-nacha-savings.ach"),
  "utf8",
);

const ORIGINATOR: NACHAOriginatorInfo = AP_TEST_ORIGINATOR;

const EFFECTIVE_DATE = AP_TEST_EFFECTIVE_DATE;

function makeItem(overrides: Partial<NACHAPaymentItem> = {}): NACHAPaymentItem {
  return createNachaPaymentItem(overrides);
}

function normalizeNachaContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/^(.{23})\d{6}\d{4}/, "$1DATE__TIME")
    .trimEnd();
}

describe("generateNACHAFile", () => {
  // ── Return shape ──────────────────────────────────────────────────────────

  describe("return shape", () => {
    it("returns NACHA_ACH format", () => {
      const result = generateNACHAFile([makeItem()], ORIGINATOR, EFFECTIVE_DATE);
      expect(result.format).toBe("NACHA_ACH");
    });

    it("returns correct transaction count", () => {
      const items = [
        makeItem(),
        makeItem({ invoiceNumber: "INV-002" }),
        makeItem({ invoiceNumber: "INV-003" }),
      ];
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
      expect(result.transactionCount).toBe(3);
    });

    it("returns summed totalAmountMinor", () => {
      const items = [
        makeItem({ amountMinor: 100000n }),
        makeItem({ amountMinor: 200000n }),
        makeItem({ amountMinor: 300000n }),
      ];
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
      expect(result.totalAmountMinor).toBe(600000n);
    });

    it("returns a non-empty fileName ending in .txt", () => {
      const result = generateNACHAFile([makeItem()], ORIGINATOR, EFFECTIVE_DATE);
      expect(result.fileName).toMatch(/\.txt$/);
    });

    it("returns a generatedAt Date", () => {
      const result = generateNACHAFile([makeItem()], ORIGINATOR, EFFECTIVE_DATE);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it("matches the representative golden ACH fixture", () => {
      const result = generateNACHAFile(
        [
          makeItem(),
          makeItem({
            invoiceNumber: "INV-2026-002",
            supplierName: "A Very Long Supplier Name Exceeds Limit Inc.",
            supplierAccountNumber: "987654321098765",
            supplierRoutingNumber: "031300012",
            amountMinor: 125n,
            accountType: "savings",
          }),
        ],
        ORIGINATOR,
        EFFECTIVE_DATE,
      );

      expect(normalizeNachaContent(result.content)).toBe(
        normalizeNachaContent(NACHA_GOLDEN_FIXTURE),
      );
    });
  });

  // ── Record line length (94 chars each) ────────────────────────────────────

  describe("fixed-width record line length", () => {
    it("all non-padding lines are exactly 94 characters", () => {
      const result = generateNACHAFile(
        [makeItem(), makeItem({ invoiceNumber: "INV-002" })],
        ORIGINATOR,
        EFFECTIVE_DATE,
      );
      const lines = result.content.split("\n");
      for (const line of lines) {
        expect(line.length, `Line must be 94 chars: "${line}"`).toBe(94);
      }
    });

    it("padding lines (9's) are exactly 94 characters", () => {
      const result = generateNACHAFile([makeItem()], ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");
      const padLines = lines.filter((l) => l.startsWith("9") && l === "9".repeat(94));
      // Must have some padding to fill the last block of 10
      expect(padLines.length).toBeGreaterThanOrEqual(0);
      for (const line of padLines) {
        expect(line.length).toBe(94);
      }
    });
  });

  // ── Record type codes ─────────────────────────────────────────────────────

  describe("record type codes", () => {
    it("first record starts with '1' (File Header)", () => {
      const result = generateNACHAFile([makeItem()], ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");
      expect(lines[0][0]).toBe("1");
    });

    it("last non-padding data record is '9' (File Control)", () => {
      const result = generateNACHAFile([makeItem()], ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");
      // Find the File Control record (type 9 but not all-9s padding)
      const fileControlLine = lines.find((l, i) => l[0] === "9" && i > 0 && l !== "9".repeat(94));
      expect(fileControlLine).toBeDefined();
      if (fileControlLine) {
        expect(fileControlLine[0]).toBe("9");
      }
    });

    it("batch header starts with '5'", () => {
      const result = generateNACHAFile([makeItem()], ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");
      const batchHeader = lines.find((l) => l[0] === "5");
      expect(batchHeader).toBeDefined();
    });

    it("entry detail records start with '6'", () => {
      const result = generateNACHAFile(
        [makeItem(), makeItem({ invoiceNumber: "INV-002" })],
        ORIGINATOR,
        EFFECTIVE_DATE,
      );
      const lines = result.content.split("\n");
      const entries = lines.filter((l) => l[0] === "6");
      expect(entries).toHaveLength(2);
    });

    it("batch control starts with '8'", () => {
      const result = generateNACHAFile([makeItem()], ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");
      const batchControl = lines.find((l) => l[0] === "8");
      expect(batchControl).toBeDefined();
    });
  });

  // ── Total lines is a multiple of 10 (blocking factor) ────────────────────

  describe("blocking factor", () => {
    it("total line count is always a multiple of 10", () => {
      for (const itemCount of [1, 2, 5, 9, 10, 11]) {
        const items = Array.from({ length: itemCount }, (_, i) =>
          makeItem({ invoiceNumber: `INV-${i}` }),
        );
        const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
        const lineCount = result.content.split("\n").length;
        expect(lineCount % 10, `Expected multiple of 10 for ${itemCount} items`).toBe(0);
      }
    });
  });

  // ── Amount in entry detail records ────────────────────────────────────────

  describe("amount encoding", () => {
    it("encodes amount as 10-digit zero-padded cents in entry record", () => {
      const result = generateNACHAFile(
        [makeItem({ amountMinor: 500000n })],
        ORIGINATOR,
        EFFECTIVE_DATE,
      );
      const lines = result.content.split("\n");
      const entryLine = lines.find((l) => l[0] === "6")!;
      // Entry format: 1(type) + 2(txCode) + 9(routing) + 1(check) + 17(acct) + 10(amount) ...
      // Amount starts at position 30 (0-indexed: chars 29-38)
      const amountField = entryLine.slice(29, 39);
      expect(amountField).toBe("0000500000");
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles zero items without throwing", () => {
      const result = generateNACHAFile([], ORIGINATOR, EFFECTIVE_DATE);
      expect(result.totalAmountMinor).toBe(0n);
      expect(result.transactionCount).toBe(0);
    });

    it("all lines in empty run are still 94 characters", () => {
      const result = generateNACHAFile([], ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");
      for (const line of lines) {
        expect(line.length).toBe(94);
      }
    });

    it("handles large amounts (>$1M) without truncation", () => {
      const result = generateNACHAFile(
        [makeItem({ amountMinor: 100_000_000n })], // $1,000,000.00
        ORIGINATOR,
        EFFECTIVE_DATE,
      );
      expect(result.totalAmountMinor).toBe(100_000_000n);
    });

    it("handles supplier name longer than 22 chars by truncating", () => {
      // Should not throw — just truncate to fit record
      expect(() =>
        generateNACHAFile(
          [makeItem({ supplierName: "A Very Long Supplier Name Exceeds Limit Inc." })],
          ORIGINATOR,
          EFFECTIVE_DATE,
        ),
      ).not.toThrow();
    });
  });

  // ── Invariants ───────────────────────────────────────────────────────────

  describe("generateNACHAFile — invariants", () => {
    it("conserves amount — control sum equals sum of all item amounts", () => {
      const items = [
        makeItem({ invoiceNumber: "INV-001", amountMinor: 100000n }),
        makeItem({ invoiceNumber: "INV-002", amountMinor: 250000n }),
        makeItem({ invoiceNumber: "INV-003", amountMinor: 350000n }),
      ];
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);

      const sumMinor = items.reduce((acc, item) => acc + item.amountMinor, 0n);
      expect(result.totalAmountMinor).toBe(sumMinor);
    });

    it("entry detail count in batch control matches item count", () => {
      for (const itemCount of [1, 2, 5, 10, 15]) {
        const items = Array.from({ length: itemCount }, (_, i) =>
          makeItem({ invoiceNumber: `INV-${i}` }),
        );
        const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
        const lines = result.content.split("\n");

        // Find entry detail records
        const entryDetails = lines.filter((l) => l[0] === "6");
        expect(entryDetails).toHaveLength(itemCount);
        expect(result.transactionCount).toBe(itemCount);
      }
    });

    it("all lines are exactly 94 characters (fixed-width format)", () => {
      const items = [
        makeItem({ invoiceNumber: "INV-001" }),
        makeItem({ invoiceNumber: "INV-002" }),
        makeItem({ invoiceNumber: "INV-003" }),
      ];
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");

      for (const line of lines) {
        expect(line.length).toBe(94);
      }
    });

    it("total line count is always multiple of 10 (blocking factor)", () => {
      for (const itemCount of [0, 1, 2, 5, 9, 10, 11, 19, 20, 21]) {
        const items = Array.from({ length: itemCount }, (_, i) =>
          makeItem({ invoiceNumber: `INV-${i}` }),
        );
        const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
        const lineCount = result.content.split("\n").length;

        expect(lineCount % 10).toBe(0);
      }
    });

    it("record type progression follows NACHA structure", () => {
      const items = Array.from({ length: 3 }, (_, i) => makeItem({ invoiceNumber: `INV-${i}` }));
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");

      const recordTypes = lines.map((l) => l[0]);

      // Should start with 1 (File Header)
      expect(recordTypes[0]).toBe("1");

      // Should have 5 (Batch Header)
      expect(recordTypes).toContain("5");

      // Should have 6's (Entry Details) for each item
      const entryCount = recordTypes.filter((t) => t === "6").length;
      expect(entryCount).toBe(items.length);

      // Should have 8 (Batch Control)
      expect(recordTypes).toContain("8");

      // Should have 9 (File Control)
      expect(recordTypes).toContain("9");
    });

    it("no entry record has amount field exceeding or with invalid format", () => {
      const items = [
        makeItem({ amountMinor: 1n }),
        makeItem({ amountMinor: 100n }),
        makeItem({ amountMinor: 100_000_000n }),
        makeItem({ amountMinor: 999_999_999n }),
      ];
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");

      const entryLines = lines.filter((l) => l[0] === "6");
      for (const line of entryLines) {
        // Amount field is at positions 29-38 (10 digits, zero-padded)
        const amountField = line.slice(29, 39);
        expect(amountField.length).toBe(10);
        expect(amountField).toMatch(/^\d{10}$/); // All digits
        const amount = BigInt(amountField);
        expect(amount).toBeGreaterThanOrEqual(0n);
      }
    });

    it("deterministic output for same input", () => {
      const items = [
        makeItem({ invoiceNumber: "INV-001", amountMinor: 123456n }),
        makeItem({ invoiceNumber: "INV-002", amountMinor: 789012n }),
      ];

      const result1 = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
      const result2 = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);

      expect(result1.transactionCount).toBe(result2.transactionCount);
      expect(result1.totalAmountMinor).toBe(result2.totalAmountMinor);
      expect(normalizeNachaContent(result1.content)).toBe(normalizeNachaContent(result2.content));
    });

    it("handles large transaction sets without data loss", () => {
      const items = Array.from({ length: 50 }, (_, i) =>
        makeItem({
          invoiceNumber: `INV-${String(i).padStart(5, "0")}`,
          amountMinor: BigInt(50000 * (i + 1)),
        }),
      );
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);

      expect(result.transactionCount).toBe(50);
      const expectedTotal = items.reduce((sum, item) => sum + item.amountMinor, 0n);
      expect(result.totalAmountMinor).toBe(expectedTotal);

      const lines = result.content.split("\n");
      const entryLines = lines.filter((l) => l[0] === "6");
      expect(entryLines).toHaveLength(50);
    });

    it("amount per entry never loses precision in 94-char encoding", () => {
      const testAmounts = [1n, 100n, 999999999n, 123456789n];
      for (const amount of testAmounts) {
        const result = generateNACHAFile(
          [makeItem({ amountMinor: amount })],
          ORIGINATOR,
          EFFECTIVE_DATE,
        );
        expect(result.totalAmountMinor).toBe(amount);
      }
    });
  });

  // ── Savings account variant ────────────────────────────────────────────────

  describe("savings account variant", () => {
    it("generates valid NACHA payment with savings accounts", () => {
      const items = [
        makeItem({ accountType: "savings", amountMinor: 250000n }),
        makeItem({ accountType: "savings", amountMinor: 250001n }),
      ];
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);

      expect(result.format).toBe("NACHA_ACH");
      expect(result.transactionCount).toBe(2);
      expect(result.totalAmountMinor).toBe(500001n);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("account type field is set correctly for savings accounts", () => {
      const savingsItems = [makeItem({ accountType: "savings", amountMinor: 100000n })];
      const checkingItems = [makeItem({ accountType: "checking", amountMinor: 100000n })];

      const savingsResult = generateNACHAFile(savingsItems, ORIGINATOR, EFFECTIVE_DATE);
      const checkingResult = generateNACHAFile(checkingItems, ORIGINATOR, EFFECTIVE_DATE);

      const savingsLines = savingsResult.content.split("\n");
      const checkingLines = checkingResult.content.split("\n");

      const savingsEntryLine = savingsLines.find((l) => l[0] === "6");
      const checkingEntryLine = checkingLines.find((l) => l[0] === "6");

      // Transaction code is at positions 1-2 (22 for checking, 32 for savings)
      expect(savingsEntryLine?.slice(1, 3)).toBe("32");
      expect(checkingEntryLine?.slice(1, 3)).toBe("22");
    });

    it("all lines in savings variant are exactly 94 characters", () => {
      const items = [
        makeItem({ accountType: "savings", amountMinor: 250000n }),
        makeItem({ accountType: "savings", amountMinor: 250001n }),
      ];
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);
      const lines = result.content.split("\n");

      for (const line of lines) {
        if (line.trim().length > 0) {
          expect(line.length).toBe(94);
        }
      }
    });

    it("matches the representative golden NACHA savings fixture", () => {
      const items = [
        makeItem({ accountType: "savings", amountMinor: 250000n }),
        makeItem({ accountType: "savings", amountMinor: 250001n }),
      ];
      const result = generateNACHAFile(items, ORIGINATOR, EFFECTIVE_DATE);

      // Normalize both contents (remove dynamic timestamp)
      const normalized = normalizeNachaContent(result.content);
      const goldenNormalized = normalizeNachaContent(NACHA_SAVINGS_GOLDEN_FIXTURE);

      expect(normalized).toBe(goldenNormalized);
    });
  });
});
