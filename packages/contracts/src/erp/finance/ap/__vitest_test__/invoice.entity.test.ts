/**
 * Invoice entity schema tests.
 *
 * Validates:
 * - Entity schema with bigint amounts (minor units)
 * - Status enum values (breaking change detector)
 * - Required vs nullable fields
 * - Field refinements (min/max, trim, UUID format)
 *
 * Coverage target: 90%+
 */
import { describe, it, expect } from "vitest";
import {
  InvoiceSchema,
  InvoiceStatusValues,
  InvoiceStatusSchema,
  type Invoice,
} from "../invoice.entity.js";

describe("InvoiceSchema", () => {
  const validInvoice = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    orgId: "550e8400-e29b-41d4-a716-446655440001",
    supplierId: "550e8400-e29b-41d4-a716-446655440002",
    invoiceNumber: "INV-2026-001",
    amountMinor: 10000n,
    currencyCode: "USD",
    status: "draft" as const,
    dueDate: "2026-04-15",
    submittedByPrincipalId: null,
    submittedAt: null,
    poReference: null,
    paidAt: null,
    paidByPrincipalId: null,
    paymentReference: null,
    createdAt: "2026-03-14T12:00:00.000Z",
    updatedAt: "2026-03-14T12:00:00.000Z",
  };

  it("should validate a complete invoice with all fields", () => {
    const result = InvoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceNumber).toBe("INV-2026-001");
      expect(result.data.amountMinor).toBe(10000n);
      expect(result.data.status).toBe("draft");
    }
  });

  it("should validate minimal invoice with required fields only", () => {
    const minimal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      orgId: "550e8400-e29b-41d4-a716-446655440001",
      supplierId: "550e8400-e29b-41d4-a716-446655440002",
      invoiceNumber: "INV-2026-002",
      amountMinor: 5000n,
      currencyCode: "EUR",
      status: "draft" as const,
      dueDate: null,
      submittedByPrincipalId: null,
      submittedAt: null,
      poReference: null,
      paidAt: null,
      paidByPrincipalId: null,
      paymentReference: null,
      createdAt: "2026-03-14T12:00:00.000Z",
      updatedAt: "2026-03-14T12:00:00.000Z",
    };

    const result = InvoiceSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("should accept bigint for amountMinor", () => {
    const withBigInt = { ...validInvoice, amountMinor: 999999999999n };
    const result = InvoiceSchema.safeParse(withBigInt);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountMinor).toBe(999999999999n);
    }
  });

  it("should coerce numeric string to bigint for amountMinor", () => {
    const withString = { ...validInvoice, amountMinor: "12345" };
    const result = InvoiceSchema.safeParse(withString);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountMinor).toBe(12345n);
    }
  });

  it("should accept negative amountMinor (credit notes)", () => {
    const creditNote = { ...validInvoice, amountMinor: -5000n };
    const result = InvoiceSchema.safeParse(creditNote);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountMinor).toBe(-5000n);
    }
  });

  it("should reject invalid UUID for id", () => {
    const invalid = { ...validInvoice, id: "not-a-uuid" };
    const result = InvoiceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject invalid UUID for orgId", () => {
    const invalid = { ...validInvoice, orgId: "invalid" };
    const result = InvoiceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject empty invoiceNumber", () => {
    const invalid = { ...validInvoice, invoiceNumber: "" };
    const result = InvoiceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should trim whitespace from invoiceNumber", () => {
    const withWhitespace = { ...validInvoice, invoiceNumber: "  INV-123  " };
    const result = InvoiceSchema.safeParse(withWhitespace);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invoiceNumber).toBe("INV-123");
    }
  });

  it("should reject invoiceNumber exceeding 64 characters", () => {
    const tooLong = { ...validInvoice, invoiceNumber: "A".repeat(65) };
    const result = InvoiceSchema.safeParse(tooLong);
    expect(result.success).toBe(false);
  });

  it("should reject invalid currency code", () => {
    const invalid = { ...validInvoice, currencyCode: "INVALID" };
    const result = InvoiceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject invalid ISO-8601 datetime for createdAt", () => {
    const invalid = { ...validInvoice, createdAt: "not-a-date" };
    const result = InvoiceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should accept null for nullable fields", () => {
    const withNulls = {
      ...validInvoice,
      dueDate: null,
      submittedByPrincipalId: null,
      submittedAt: null,
      poReference: null,
      paidAt: null,
      paidByPrincipalId: null,
      paymentReference: null,
    };
    const result = InvoiceSchema.safeParse(withNulls);
    expect(result.success).toBe(true);
  });

  it("should validate submitted invoice with submittedByPrincipalId", () => {
    const submitted = {
      ...validInvoice,
      status: "submitted" as const,
      submittedByPrincipalId: "550e8400-e29b-41d4-a716-446655440003",
      submittedAt: "2026-03-14T13:00:00.000Z",
    };
    const result = InvoiceSchema.safeParse(submitted);
    expect(result.success).toBe(true);
  });

  it("should validate paid invoice with payment fields", () => {
    const paid = {
      ...validInvoice,
      status: "paid" as const,
      paidAt: "2026-04-15T10:00:00.000Z",
      paidByPrincipalId: "550e8400-e29b-41d4-a716-446655440004",
      paymentReference: "PMT-2026-001",
    };
    const result = InvoiceSchema.safeParse(paid);
    expect(result.success).toBe(true);
  });
});

describe("InvoiceStatusValues", () => {
  it("should be immutable and stable (breaking change detector)", () => {
    expect(InvoiceStatusValues).toEqual([
      "draft",
      "submitted",
      "approved",
      "posted",
      "paid",
      "rejected",
      "voided",
    ]);
  });

  it("should have exactly 7 status values", () => {
    expect(InvoiceStatusValues).toHaveLength(7);
  });
});

describe("InvoiceStatusSchema", () => {
  it("should accept valid status values", () => {
    for (const status of InvoiceStatusValues) {
      const result = InvoiceStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid status", () => {
    const invalid = InvoiceStatusSchema.safeParse("invalid_status");
    expect(invalid.success).toBe(false);
  });

  it("should reject null", () => {
    const invalid = InvoiceStatusSchema.safeParse(null);
    expect(invalid.success).toBe(false);
  });

  it("should reject undefined", () => {
    const invalid = InvoiceStatusSchema.safeParse(undefined);
    expect(invalid.success).toBe(false);
  });
});
