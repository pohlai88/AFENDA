/**
 * Unit tests for generateISO20022PaymentFile — pure calculator.
 *
 * Validates XML structure, field values, edge cases and XML escaping.
 * No I/O, no mocks needed.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  generateISO20022PaymentFile,
  type PaymentRunForExport,
  type DebtorAccount,
} from "../calculators/payment-file-iso20022";
import { AP_TEST_DEBTOR, createIsoPaymentItem, createIsoPaymentRun } from "./ap-test-builders";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "golden");
const ISO20022_GOLDEN_FIXTURE = readFileSync(
  join(FIXTURES_DIR, "payment-file-iso20022.xml"),
  "utf8",
);
const ISO20022_EUR_GOLDEN_FIXTURE = readFileSync(
  join(FIXTURES_DIR, "payment-file-iso20022-eur.xml"),
  "utf8",
);
const ISO20022_GBP_GOLDEN_FIXTURE = readFileSync(
  join(FIXTURES_DIR, "payment-file-iso20022-gbp.xml"),
  "utf8",
);

function makeRun(
  items: PaymentRunForExport["items"] = [],
  overrides: Partial<PaymentRunForExport> = {},
): PaymentRunForExport {
  return createIsoPaymentRun(items, overrides);
}

function makeItem(overrides: Partial<PaymentRunForExport["items"][number]> = {}) {
  return createIsoPaymentItem(overrides);
}

const DEBTOR: DebtorAccount = AP_TEST_DEBTOR;

function normalizeIsoContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/<CreDtTm>[^<]+<\/CreDtTm>/, "<CreDtTm>__CREATED_AT__</CreDtTm>")
    .trimEnd();
}

describe("generateISO20022PaymentFile", () => {
  // ── Return shape ──────────────────────────────────────────────────────────

  describe("return shape", () => {
    it("returns ISO20022_PAIN_001 format", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.format).toBe("ISO20022_PAIN_001");
    });

    it("returns correct transaction count", () => {
      const items = [makeItem({ id: "i1" }), makeItem({ id: "i2" }), makeItem({ id: "i3" })];
      const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);
      expect(result.transactionCount).toBe(3);
    });

    it("returns summed totalAmountMinor", () => {
      const items = [
        makeItem({ id: "i1", amountMinor: 100000n }),
        makeItem({ id: "i2", amountMinor: 200000n }),
        makeItem({ id: "i3", amountMinor: 300000n }),
      ];
      const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);
      expect(result.totalAmountMinor).toBe(600000n);
    });

    it("returns a non-empty fileName", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.fileName.length).toBeGreaterThan(0);
    });

    it("returns a generatedAt Date", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it("matches the representative golden XML fixture", () => {
      const result = generateISO20022PaymentFile(
        makeRun([
          makeItem(),
          makeItem({
            id: "item-002",
            invoiceId: "inv-002",
            invoiceNumber: "INV-2026-002",
            supplierName: "A&B Supplies",
            supplierIBAN: "FR7630006000011234567890189",
            supplierBIC: "AGRIFRPP",
            amountMinor: 125n,
            remittanceInfo: "INV-2026-002 & credit",
          }),
        ]),
        DEBTOR,
      );

      expect(normalizeIsoContent(result.content)).toBe(
        normalizeIsoContent(ISO20022_GOLDEN_FIXTURE),
      );
    });
  });

  // ── XML structure ─────────────────────────────────────────────────────────

  describe("XML structure", () => {
    it("starts with XML declaration", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.content).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    });

    it("contains ISO 20022 namespace", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.content).toContain("urn:iso:std:iso:20022:tech:xsd:pain.001.001.03");
    });

    it("contains Document root element", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.content).toContain("<Document");
      expect(result.content).toContain("</Document>");
    });

    it("contains GrpHdr with NbOfTxs", () => {
      const items = [makeItem({ id: "i1" }), makeItem({ id: "i2" })];
      const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);
      expect(result.content).toContain("<NbOfTxs>2</NbOfTxs>");
    });

    it("contains debtor name in XML", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.content).toContain("<Nm>ACME Corp</Nm>");
    });

    it("contains debtor IBAN in XML", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.content).toContain("GB29NWBK60161331926819");
    });

    it("contains supplier IBAN for each item", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.content).toContain("DE89370400440532013000");
    });

    it("contains correct control sum (decimal format)", () => {
      // 500000 minor units = $5,000.00
      const result = generateISO20022PaymentFile(
        makeRun([makeItem({ amountMinor: 500000n })]),
        DEBTOR,
      );
      expect(result.content).toContain("<CtrlSum>5000.00</CtrlSum>");
    });

    it("contains CstmrCdtTrfInitn element", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.content).toContain("<CstmrCdtTrfInitn>");
      expect(result.content).toContain("</CstmrCdtTrfInitn>");
    });

    it("contains PmtInf block", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.content).toContain("<PmtInf>");
    });

    it("contains CdtTrfTxInf for each item", () => {
      const items = [makeItem({ id: "i1" }), makeItem({ id: "i2" })];
      const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);
      const count = (result.content.match(/<CdtTrfTxInf>/g) ?? []).length;
      expect(count).toBe(2);
    });

    it("contains requested execution date", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), DEBTOR);
      expect(result.content).toContain("<ReqdExctnDt>2026-03-15</ReqdExctnDt>");
    });
  });

  // ── XML escaping ──────────────────────────────────────────────────────────

  describe("XML escaping", () => {
    it("escapes & in supplier name", () => {
      const item = makeItem({ supplierName: "A&B Supplies" });
      const result = generateISO20022PaymentFile(makeRun([item]), DEBTOR);
      expect(result.content).toContain("A&amp;B Supplies");
      expect(result.content).not.toContain("A&B Supplies");
    });

    it("escapes < > in debtor name", () => {
      const debtor: DebtorAccount = { ...DEBTOR, name: "Corp <XYZ>" };
      const result = generateISO20022PaymentFile(makeRun([makeItem()]), debtor);
      expect(result.content).toContain("Corp &lt;XYZ&gt;");
    });

    it("escapes quotes in names", () => {
      const item = makeItem({ supplierName: 'O\'Brien & "Mates"' });
      const result = generateISO20022PaymentFile(makeRun([item]), DEBTOR);
      expect(result.content).toContain("O&apos;Brien");
      expect(result.content).toContain("&quot;Mates&quot;");
    });
  });

  // ── Empty run ─────────────────────────────────────────────────────────────

  describe("empty payment run", () => {
    it("handles zero items gracefully", () => {
      const result = generateISO20022PaymentFile(makeRun([]), DEBTOR);
      expect(result.totalAmountMinor).toBe(0n);
      expect(result.transactionCount).toBe(0);
      expect(result.content).toContain("<NbOfTxs>0</NbOfTxs>");
    });

    it("generates valid XML even with no transactions", () => {
      const result = generateISO20022PaymentFile(makeRun([]), DEBTOR);
      expect(result.content).toContain("<Document");
      expect(result.content).toContain("</Document>");
    });
  });

  // ── Amount formatting ─────────────────────────────────────────────────────

  describe("amount formatting", () => {
    it("correctly formats 100 cents as 1.00", () => {
      const result = generateISO20022PaymentFile(
        makeRun([makeItem({ amountMinor: 100n })]),
        DEBTOR,
      );
      expect(result.content).toContain("1.00");
    });

    it("correctly formats 1 cent as 0.01", () => {
      const result = generateISO20022PaymentFile(makeRun([makeItem({ amountMinor: 1n })]), DEBTOR);
      expect(result.content).toContain("0.01");
    });

    it("correctly formats 123456789 cents as 1234567.89", () => {
      const result = generateISO20022PaymentFile(
        makeRun([makeItem({ amountMinor: 123456789n })]),
        DEBTOR,
      );
      expect(result.content).toContain("1234567.89");
    });
  });

  // ── Invariants ───────────────────────────────────────────────────────────

  describe("generateISO20022PaymentFile — invariants", () => {
    it("conserves amount — control sum equals sum of all item amounts", () => {
      const items = [
        makeItem({ id: "i1", amountMinor: 100000n }),
        makeItem({ id: "i2", amountMinor: 250000n }),
        makeItem({ id: "i3", amountMinor: 350000n }),
      ];
      const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);

      const sumMinor = items.reduce((acc, item) => acc + item.amountMinor, 0n);
      expect(result.totalAmountMinor).toBe(sumMinor);

      // Control sum should appear in XML as decimal
      const decimalSum =
        (sumMinor / 100n).toString() + "." + String(sumMinor % 100n).padStart(2, "0");
      expect(result.content).toContain(`<CtrlSum>${decimalSum}</CtrlSum>`);
    });

    it("transaction count matches item count", () => {
      for (const itemCount of [0, 1, 5, 10, 25]) {
        const items = Array.from({ length: itemCount }, (_, i) =>
          makeItem({ id: `i${i}`, invoiceNumber: `INV-${i}` }),
        );
        const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);
        expect(result.transactionCount).toBe(itemCount);
        expect(result.content).toContain(`<NbOfTxs>${itemCount}</NbOfTxs>`);
      }
    });

    it("XML is well-formed — document structure is valid", () => {
      const items = [makeItem(), makeItem({ id: "i2", supplierName: "Test<>&\"'Unit" })];
      const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);

      // Check for required root and main structure elements
      expect(result.content).toContain("<?xml");
      expect(result.content).toContain("<Document");
      expect(result.content).toContain("</Document>");
      expect(result.content).toContain("<CstmrCdtTrfInitn>");
      expect(result.content).toContain("</CstmrCdtTrfInitn>");
      expect(result.content).toContain("<GrpHdr>");
      expect(result.content).toContain("</GrpHdr>");
    });

    it("no unescaped special characters in text content", () => {
      const items = [makeItem({ supplierName: "A&B<C>D\"E'F" })];
      const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);

      // After escaping, raw special chars should not appear in contexts where they matter
      // (excluding URL/namespace declarations which are already safe)
      const content = result.content;
      const inTextContent = content.match(/>([^<]*)</g) ?? [];
      for (const match of inTextContent) {
        const text = match.slice(1, -1); // Remove > and <
        // Should not have raw & < > " ' outside of entity escapes
        expect(text).not.toMatch(/&(?![a-z]+;)/); // & not followed by entity
        expect(text).not.toMatch(/</); // Raw <
        expect(text).not.toMatch(/>/); // Raw >
      }
    });

    it("deterministic output for same input", () => {
      const items = [
        makeItem({ id: "i1", amountMinor: 123456n }),
        makeItem({ id: "i2", amountMinor: 789012n }),
      ];
      const run = makeRun(items);

      const result1 = generateISO20022PaymentFile(run, DEBTOR);
      const result2 = generateISO20022PaymentFile(run, DEBTOR);

      expect(result1.transactionCount).toBe(result2.transactionCount);
      expect(result1.totalAmountMinor).toBe(result2.totalAmountMinor);
      expect(normalizeIsoContent(result1.content)).toBe(normalizeIsoContent(result2.content));
    });

    it("handles large transaction sets without data loss", () => {
      const items = Array.from({ length: 100 }, (_, i) =>
        makeItem({
          id: `i${i}`,
          invoiceId: `inv-${i}`,
          invoiceNumber: `INV-${String(i).padStart(4, "0")}`,
          amountMinor: BigInt(10000 * (i + 1)),
        }),
      );
      const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);

      expect(result.transactionCount).toBe(100);
      const expectedTotal = items.reduce((sum, item) => sum + item.amountMinor, 0n);
      expect(result.totalAmountMinor).toBe(expectedTotal);

      // Verify all items appear in document
      for (let i = 0; i < 100; i++) {
        expect(result.content).toContain(`INV-${String(i).padStart(4, "0")}`);
      }
    });

    it("currency code appears in the document", () => {
      const items = [makeItem({ currencyCode: "USD" }), makeItem({ currencyCode: "USD" })];
      const result = generateISO20022PaymentFile(makeRun(items), DEBTOR);

      // Currency code should appear at least once in the document
      expect(result.content).toContain("USD");
      expect(result.content.indexOf("USD")).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Multi-currency support (SEPA/International) ──────────────────────────

  describe("multi-currency support", () => {
    it("generates valid EUR payment run (SEPA standard)", () => {
      const debtor: DebtorAccount = {
        name: "ACME Corp GmbH",
        iban: "DE89370400440532013000",
        bic: "COBADEFFXXX",
        currency: "EUR",
      };

      const items = [
        makeItem({
          id: "eur-i1",
          invoiceNumber: "EUR-2026-001",
          supplierName: "European Supplier Ltd",
          supplierIBAN: "FR1420041010050500013M02606",
          supplierBIC: "BNAGFRPPXXX",
          amountMinor: 150000n,
          currencyCode: "EUR",
        }),
        makeItem({
          id: "eur-i2",
          invoiceNumber: "EUR-2026-002",
          supplierName: "Nordic Payment Partner",
          supplierIBAN: "SE4550000000058398257466",
          supplierBIC: "NDEASESS",
          amountMinor: 275000n,
          currencyCode: "EUR",
        }),
      ];

      const result = generateISO20022PaymentFile(makeRun(items, { currencyCode: "EUR" }), debtor);
      expect(result.format).toBe("ISO20022_PAIN_001");
      expect(result.transactionCount).toBe(2);
      expect(result.totalAmountMinor).toBe(425000n);
      expect(result.content).toContain("EUR");
      expect(result.content).toContain("SEPA");
    });

    it("generates valid GBP payment run (UK domestic)", () => {
      const debtor: DebtorAccount = {
        name: "ACME Corp UK",
        iban: "GB29NWBK60161331926819",
        bic: "NWBKGB2L",
        currency: "GBP",
      };

      const items = [
        makeItem({
          id: "gbp-i1",
          invoiceNumber: "GBP-2026-001",
          supplierName: "British Supplier Co",
          supplierIBAN: "GB82WEST12345698765432",
          supplierBIC: "PBNKGB22",
          amountMinor: 750050n,
          currencyCode: "GBP",
        }),
      ];

      const result = generateISO20022PaymentFile(makeRun(items, { currencyCode: "GBP" }), debtor);
      expect(result.format).toBe("ISO20022_PAIN_001");
      expect(result.transactionCount).toBe(1);
      expect(result.totalAmountMinor).toBe(750050n);
      expect(result.content).toContain("GBP");
      expect(result.content).toContain("GB29NWBK60161331926819");
    });

    it("debtor currency code matches payment run currency", () => {
      const currencies = ["USD", "EUR", "GBP", "CHF", "JPY"];
      for (const currency of currencies) {
        const debtor: DebtorAccount = {
          ...DEBTOR,
          currency,
        };
        const result = generateISO20022PaymentFile(
          makeRun([makeItem({ currencyCode: currency })], { currencyCode: currency }),
          debtor,
        );
        expect(result.content).toContain(currency);
      }
    });

    it("international IBAN validation — accepts multiple country prefixes", () => {
      const ibans = [
        { country: "DE", iban: "DE89370400440532013000", bic: "COBADEFFXXX" },
        { country: "FR", iban: "FR1420041010050500013M02606", bic: "BNAGFRPPXXX" },
        { country: "GB", iban: "GB82WEST12345698765432", bic: "PBNKGB22" },
        { country: "ES", iban: "ES9121000418450200051332", bic: "BWAFESMMXXX" },
        { country: "IT", iban: "IT60X0542811101000000123456", bic: "BCITITMM" },
        { country: "SE", iban: "SE4550000000058398257466", bic: "NDEASESS" },
      ];

      for (const { country, iban, bic } of ibans) {
        const debtor: DebtorAccount = {
          name: `Debtor ${country}`,
          iban,
          bic,
          currency: "EUR",
        };
        const result = generateISO20022PaymentFile(
          makeRun([makeItem({ supplierIBAN: iban, supplierBIC: bic })]),
          debtor,
        );
        expect(result.content).toContain(iban);
        expect(result.content).toContain(country);
      }
    });

    it("amount conservation across currency types", () => {
      const testCases = [
        { currency: "USD", amount: 123456n }, // $1,234.56
        { currency: "EUR", amount: 987654n }, // €9,876.54
        { currency: "JPY", amount: 100000000n }, // ¥1,000,000
        { currency: "GBP", amount: 50000n }, // £500.00
      ];

      for (const { currency, amount } of testCases) {
        const debtor: DebtorAccount = {
          ...DEBTOR,
          currency,
        };
        const result = generateISO20022PaymentFile(
          makeRun([makeItem({ amountMinor: amount, currencyCode: currency })], {
            currencyCode: currency,
          }),
          debtor,
        );
        expect(result.totalAmountMinor).toBe(amount);
      }
    });
  });
});
