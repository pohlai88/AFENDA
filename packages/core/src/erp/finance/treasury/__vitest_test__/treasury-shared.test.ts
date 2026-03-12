import { describe, it, expect } from "vitest";
import {
  BankAccountStatusValues,
  BankAccountStatusSchema,
  BankStatementStatusValues,
  StatementLineStatusValues,
  ReconciliationSessionStatusValues,
  PaymentBatchStatusValues,
  PaymentInstructionStatusValues,
  CashMovementDirectionValues,
  CurrencyCodeSchema,
    MoneySchema,
  TreasuryBaseCommandSchema,
} from "@afenda/contracts";
import { buildTreasuryBaseCommand } from "./treasury-test-builders";

describe("Treasury shared primitives", () => {
  describe("BankAccountStatusSchema", () => {
    it("accepts all valid statuses", () => {
      for (const status of BankAccountStatusValues) {
        expect(BankAccountStatusSchema.parse(status)).toBe(status);
      }
    });

    it("rejects unknown status", () => {
      expect(() => BankAccountStatusSchema.parse("unknown")).toThrow();
    });
  });

  describe("CurrencyCodeSchema", () => {
    it("accepts valid ISO 4217 codes", () => {
      expect(CurrencyCodeSchema.parse("USD")).toBe("USD");
      expect(CurrencyCodeSchema.parse("EUR")).toBe("EUR");
      expect(CurrencyCodeSchema.parse("GBP")).toBe("GBP");
      expect(CurrencyCodeSchema.parse("SGD")).toBe("SGD");
    });

    it("rejects lowercase codes", () => {
      expect(() => CurrencyCodeSchema.parse("usd")).toThrow();
    });

    it("rejects codes with wrong length", () => {
      expect(() => CurrencyCodeSchema.parse("US")).toThrow();
      expect(() => CurrencyCodeSchema.parse("USDT")).toThrow();
    });

    it("rejects empty string", () => {
      expect(() => CurrencyCodeSchema.parse("")).toThrow();
    });
  });

  describe("MoneySchema (shared money primitive)", () => {
    it("accepts valid money with positive amount", () => {
      const result = MoneySchema.parse({ amountMinor: 10050n, currencyCode: "USD" });
      expect(result.amountMinor).toBe(10050n);
      expect(result.currencyCode).toBe("USD");
    });

    it("rejects invalid currency code", () => {
      expect(() => MoneySchema.parse({ amountMinor: 100n, currencyCode: "usd" })).toThrow();
    });
  });

  describe("TreasuryBaseCommandSchema", () => {
    it("validates a properly formed base command", () => {
      const cmd = buildTreasuryBaseCommand();
      const parsed = TreasuryBaseCommandSchema.parse(cmd);
      expect(parsed.idempotencyKey).toBe(cmd.idempotencyKey);
      expect(parsed.orgId).toBe(cmd.orgId);
    });

    it("rejects a non-UUID idempotencyKey", () => {
      expect(() =>
        TreasuryBaseCommandSchema.parse({
          idempotencyKey: "not-a-uuid",
          orgId: crypto.randomUUID(),
        }),
      ).toThrow();
    });

    it("rejects missing orgId", () => {
      expect(() =>
        TreasuryBaseCommandSchema.parse({
          idempotencyKey: crypto.randomUUID(),
        }),
      ).toThrow();
    });

    it("rejects missing idempotencyKey", () => {
      expect(() =>
        TreasuryBaseCommandSchema.parse({
          orgId: crypto.randomUUID(),
        }),
      ).toThrow();
    });
  });

  it("all status value arrays are non-empty and contain only strings", () => {
    const allStatusArrays = [
      BankAccountStatusValues,
      BankStatementStatusValues,
      StatementLineStatusValues,
      ReconciliationSessionStatusValues,
      PaymentBatchStatusValues,
      PaymentInstructionStatusValues,
      CashMovementDirectionValues,
    ];
    for (const arr of allStatusArrays) {
      expect(arr.length).toBeGreaterThan(0);
      for (const v of arr) {
        expect(typeof v).toBe("string");
      }
    }
  });

  it("PaymentBatchStatusValues includes all workflow states", () => {
    expect(PaymentBatchStatusValues).toContain("draft");
    expect(PaymentBatchStatusValues).toContain("pending_approval");
    expect(PaymentBatchStatusValues).toContain("approved");
    expect(PaymentBatchStatusValues).toContain("released");
    expect(PaymentBatchStatusValues).toContain("cancelled");
  });
});
