/**
 * Invoice commands schema tests.
 *
 * Validates:
 * - All command schemas have idempotencyKey
 * - Required vs optional fields
 * - Field refinements (min/max, trim)
 * - Bulk operation limits (1-100 items)
 *
 * Coverage target: 90%+
 */
import { describe, it, expect } from "vitest";
import {
  CreateInvoiceCommandSchema,
  SubmitDraftInvoiceCommandSchema,
  SubmitInvoiceCommandSchema,
  ApproveInvoiceCommandSchema,
  RejectInvoiceCommandSchema,
  VoidInvoiceCommandSchema,
  BulkApproveInvoiceCommandSchema,
  BulkRejectInvoiceCommandSchema,
  BulkVoidInvoiceCommandSchema,
} from "../invoice.commands.js";

describe("CreateInvoiceCommandSchema", () => {
  const validCommand = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    supplierId: "550e8400-e29b-41d4-a716-446655440001",
    amountMinor: 10000n,
    currencyCode: "USD",
  };

  it("should validate complete command with all fields", () => {
    const complete = {
      ...validCommand,
      dueDate: "2026-04-15",
      poReference: "PO-2026-001",
    };
    const result = CreateInvoiceCommandSchema.safeParse(complete);
    expect(result.success).toBe(true);
  });

  it("should validate minimal command with required fields only", () => {
    const result = CreateInvoiceCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it("should require idempotencyKey", () => {
    const { idempotencyKey, ...without } = validCommand;
    const result = CreateInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("should require supplierId", () => {
    const { supplierId, ...without } = validCommand;
    const result = CreateInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("should require amountMinor", () => {
    const { amountMinor, ...without } = validCommand;
    const result = CreateInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("should require currencyCode", () => {
    const { currencyCode, ...without } = validCommand;
    const result = CreateInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("should accept bigint for amountMinor", () => {
    const withBigInt = { ...validCommand, amountMinor: 999999999999n };
    const result = CreateInvoiceCommandSchema.safeParse(withBigInt);
    expect(result.success).toBe(true);
  });

  it("should coerce numeric string to bigint for amountMinor", () => {
    const withString = { ...validCommand, amountMinor: "12345" };
    const result = CreateInvoiceCommandSchema.safeParse(withString);
    expect(result.success).toBe(true);
  });

  it("should accept negative amountMinor (credit notes)", () => {
    const creditNote = { ...validCommand, amountMinor: -5000n };
    const result = CreateInvoiceCommandSchema.safeParse(creditNote);
    expect(result.success).toBe(true);
  });

  it("should trim and validate poReference", () => {
    const withWhitespace = { ...validCommand, poReference: "  PO-123  " };
    const result = CreateInvoiceCommandSchema.safeParse(withWhitespace);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.poReference).toBe("PO-123");
    }
  });

  it("should reject empty poReference", () => {
    const invalid = { ...validCommand, poReference: "" };
    const result = CreateInvoiceCommandSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject poReference exceeding 64 characters", () => {
    const tooLong = { ...validCommand, poReference: "A".repeat(65) };
    const result = CreateInvoiceCommandSchema.safeParse(tooLong);
    expect(result.success).toBe(false);
  });
});

describe("SubmitDraftInvoiceCommandSchema", () => {
  const validCommand = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    invoiceId: "550e8400-e29b-41d4-a716-446655440001",
  };

  it("should validate complete command", () => {
    const result = SubmitDraftInvoiceCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it("should require idempotencyKey", () => {
    const { idempotencyKey, ...without } = validCommand;
    const result = SubmitDraftInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("should require invoiceId", () => {
    const { invoiceId, ...without } = validCommand;
    const result = SubmitDraftInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });
});

describe("SubmitInvoiceCommandSchema", () => {
  const validCommand = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    supplierId: "550e8400-e29b-41d4-a716-446655440001",
    amountMinor: 10000n,
    currencyCode: "USD",
  };

  it("should validate complete command", () => {
    const complete = {
      ...validCommand,
      dueDate: "2026-04-15",
      poReference: "PO-2026-001",
    };
    const result = SubmitInvoiceCommandSchema.safeParse(complete);
    expect(result.success).toBe(true);
  });

  it("should validate minimal command", () => {
    const result = SubmitInvoiceCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });
});

describe("ApproveInvoiceCommandSchema", () => {
  const validCommand = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    invoiceId: "550e8400-e29b-41d4-a716-446655440001",
  };

  it("should validate command without reason", () => {
    const result = ApproveInvoiceCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it("should validate command with reason", () => {
    const withReason = { ...validCommand, reason: "Approved by manager" };
    const result = ApproveInvoiceCommandSchema.safeParse(withReason);
    expect(result.success).toBe(true);
  });

  it("should trim whitespace from reason", () => {
    const withWhitespace = { ...validCommand, reason: "  Approved  " };
    const result = ApproveInvoiceCommandSchema.safeParse(withWhitespace);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Approved");
    }
  });

  it("should reject reason exceeding 500 characters", () => {
    const tooLong = { ...validCommand, reason: "A".repeat(501) };
    const result = ApproveInvoiceCommandSchema.safeParse(tooLong);
    expect(result.success).toBe(false);
  });
});

describe("RejectInvoiceCommandSchema", () => {
  const validCommand = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    invoiceId: "550e8400-e29b-41d4-a716-446655440001",
    reason: "Incorrect amount",
  };

  it("should validate complete command", () => {
    const result = RejectInvoiceCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it("should require reason", () => {
    const { reason, ...without } = validCommand;
    const result = RejectInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("should reject empty reason", () => {
    const invalid = { ...validCommand, reason: "" };
    const result = RejectInvoiceCommandSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should trim whitespace from reason", () => {
    const withWhitespace = { ...validCommand, reason: "  Rejected  " };
    const result = RejectInvoiceCommandSchema.safeParse(withWhitespace);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Rejected");
    }
  });

  it("should reject reason exceeding 500 characters", () => {
    const tooLong = { ...validCommand, reason: "A".repeat(501) };
    const result = RejectInvoiceCommandSchema.safeParse(tooLong);
    expect(result.success).toBe(false);
  });
});

describe("VoidInvoiceCommandSchema", () => {
  const validCommand = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    invoiceId: "550e8400-e29b-41d4-a716-446655440001",
    reason: "Duplicate entry",
  };

  it("should validate complete command", () => {
    const result = VoidInvoiceCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it("should require reason", () => {
    const { reason, ...without } = validCommand;
    const result = VoidInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("should reject empty reason", () => {
    const invalid = { ...validCommand, reason: "" };
    const result = VoidInvoiceCommandSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("BulkApproveInvoiceCommandSchema", () => {
  const validCommand = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    invoiceIds: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"],
  };

  it("should validate command with multiple invoices", () => {
    const result = BulkApproveInvoiceCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it("should require at least 1 invoiceId", () => {
    const empty = { ...validCommand, invoiceIds: [] };
    const result = BulkApproveInvoiceCommandSchema.safeParse(empty);
    expect(result.success).toBe(false);
  });

  it("should reject more than 100 invoiceIds", () => {
    const tooMany = {
      ...validCommand,
      invoiceIds: Array(101).fill("550e8400-e29b-41d4-a716-446655440001"),
    };
    const result = BulkApproveInvoiceCommandSchema.safeParse(tooMany);
    expect(result.success).toBe(false);
  });

  it("should accept exactly 100 invoiceIds", () => {
    const max = {
      ...validCommand,
      invoiceIds: Array(100).fill("550e8400-e29b-41d4-a716-446655440001"),
    };
    const result = BulkApproveInvoiceCommandSchema.safeParse(max);
    expect(result.success).toBe(true);
  });

  it("should accept optional reason", () => {
    const withReason = { ...validCommand, reason: "Batch approval" };
    const result = BulkApproveInvoiceCommandSchema.safeParse(withReason);
    expect(result.success).toBe(true);
  });
});

describe("BulkRejectInvoiceCommandSchema", () => {
  const validCommand = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    invoiceIds: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"],
    reason: "Batch rejection",
  };

  it("should validate complete command", () => {
    const result = BulkRejectInvoiceCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it("should require reason", () => {
    const { reason, ...without } = validCommand;
    const result = BulkRejectInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("should require at least 1 invoiceId", () => {
    const empty = { ...validCommand, invoiceIds: [] };
    const result = BulkRejectInvoiceCommandSchema.safeParse(empty);
    expect(result.success).toBe(false);
  });

  it("should reject more than 100 invoiceIds", () => {
    const tooMany = {
      ...validCommand,
      invoiceIds: Array(101).fill("550e8400-e29b-41d4-a716-446655440001"),
    };
    const result = BulkRejectInvoiceCommandSchema.safeParse(tooMany);
    expect(result.success).toBe(false);
  });
});

describe("BulkVoidInvoiceCommandSchema", () => {
  const validCommand = {
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    invoiceIds: ["550e8400-e29b-41d4-a716-446655440001", "550e8400-e29b-41d4-a716-446655440002"],
    reason: "Batch void",
  };

  it("should validate complete command", () => {
    const result = BulkVoidInvoiceCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it("should require reason", () => {
    const { reason, ...without } = validCommand;
    const result = BulkVoidInvoiceCommandSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("should require at least 1 invoiceId", () => {
    const empty = { ...validCommand, invoiceIds: [] };
    const result = BulkVoidInvoiceCommandSchema.safeParse(empty);
    expect(result.success).toBe(false);
  });

  it("should reject more than 100 invoiceIds", () => {
    const tooMany = {
      ...validCommand,
      invoiceIds: Array(101).fill("550e8400-e29b-41d4-a716-446655440001"),
    };
    const result = BulkVoidInvoiceCommandSchema.safeParse(tooMany);
    expect(result.success).toBe(false);
  });
});
