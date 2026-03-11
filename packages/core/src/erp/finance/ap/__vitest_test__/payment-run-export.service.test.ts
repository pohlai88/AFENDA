/**
 * Unit tests for payment-run-export service.
 *
 * getPaymentRunForExport issues two sequential DB queries with distinct
 * chain shapes, so each test wires mockDbSelect independently:
 *   query 1 - db.select().from(paymentRun).where().limit(1)
 *   query 2 - db.select({...}).from(items).innerJoin().leftJoin().where()
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId } from "@afenda/contracts";

// ── Mock DB ───────────────────────────────────────────────────────────────────

const mockDbSelect = vi.fn();
const mockDb = { select: mockDbSelect } as any;

vi.mock("@afenda/db", () => ({
  paymentRun: {
    id: "id", orgId: "org_id", paymentDate: "payment_date",
    currencyCode: "currency_code", runNumber: "run_number",
  },
  paymentRunItem: {
    id: "id", orgId: "org_id", invoiceId: "invoice_id",
    invoiceNumber: "invoice_number", amountPaidMinor: "amount_paid_minor",
    supplierId: "supplier_id", paymentRunId: "payment_run_id",
  },
  supplier: { id: "id", name: "name" },
  supplierBankAccount: {
    id: "id", supplierId: "supplier_id", orgId: "org_id",
    isPrimary: "is_primary", status: "status", iban: "iban",
    bicSwift: "bic_swift", accountNumber: "account_number",
    routingNumber: "routing_number",
  },
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, _val: unknown) => ({})),
    and: vi.fn((..._args: unknown[]) => ({})),
  };
});

import { exportPaymentRunISO20022, exportPaymentRunNACHA } from "../payment-run-export.service";

// ── Fixed test data ───────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const RUN_ID = "rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr";

const DEBTOR_ACCOUNT = {
  name: "ACME Corp",
  iban: "DE89370400440532013000",
  bic: "COBADEFFXXX",
  currency: "USD",
};

const ORIGINATOR_INFO = {
  immediateDest: "021000021",
  immediateOrigin: "1234567890",
  companyName: "ACME CORP",
  companyId: "1234567890",
  companyEntryDescription: "SUPPLIER",
};

const PAYMENT_RUN_ROW = {
  id: RUN_ID,
  runNumber: "PR-2026-0001",
  paymentDate: "2026-03-15",
  currencyCode: "USD",
  status: "APPROVED",
};

const ITEM_WITH_IBAN = {
  itemId: "item-1",
  invoiceId: "iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii",
  invoiceNumber: "INV-2026-001",
  amountPaidMinor: 500000n,
  supplierId: "sup-1",
  supplierName: "Widgets LLC",
  iban: "DE89370400440532013000",
  bicSwift: "COBADEFFXXX",
  accountNumber: null,
  routingNumber: null,
};

const ITEM_WITH_ACH = {
  ...ITEM_WITH_IBAN,
  iban: null,
  bicSwift: null,
  accountNumber: "123456789012345",
  routingNumber: "021000021",
};

// No IBAN and no ACH routing — triggers AP_SUPPLIER_BANK_ACCOUNT_MISSING
const ITEM_MISSING_BANK = {
  ...ITEM_WITH_IBAN,
  iban: null,
  bicSwift: null,
  accountNumber: null,
  routingNumber: null,
};

// ── Mock helpers ──────────────────────────────────────────────────────────────

function mockRunSelect(rows: unknown[]): void {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

function mockItemsSelect(rows: unknown[]): void {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rows),
        }),
      }),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── exportPaymentRunISO20022 ──────────────────────────────────────────────────

describe("exportPaymentRunISO20022", () => {
  it("returns not-found error when payment run does not exist", async () => {
    mockRunSelect([]);

    const result = await exportPaymentRunISO20022(mockDb, ORG_ID, {
      paymentRunId: RUN_ID,
      debtorAccount: DEBTOR_ACCOUNT,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PAYMENT_RUN_NOT_FOUND");
      expect(result.error.meta?.paymentRunId).toBe(RUN_ID);
    }
  });

  it("returns missing-bank-account error when supplier has no IBAN", async () => {
    mockRunSelect([PAYMENT_RUN_ROW]);
    mockItemsSelect([ITEM_MISSING_BANK]);

    const result = await exportPaymentRunISO20022(mockDb, ORG_ID, {
      paymentRunId: RUN_ID,
      debtorAccount: DEBTOR_ACCOUNT,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_SUPPLIER_BANK_ACCOUNT_MISSING");
    }
  });

  it("returns ISO 20022 file on success", async () => {
    mockRunSelect([PAYMENT_RUN_ROW]);
    mockItemsSelect([ITEM_WITH_IBAN]);

    const result = await exportPaymentRunISO20022(mockDb, ORG_ID, {
      paymentRunId: RUN_ID,
      debtorAccount: DEBTOR_ACCOUNT,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.format).toBe("ISO20022_PAIN_001");
      expect(result.data.content).toContain("<?xml");
      expect(result.data.transactionCount).toBe(1);
    }
  });
});

// ── exportPaymentRunNACHA ─────────────────────────────────────────────────────

describe("exportPaymentRunNACHA", () => {
  it("returns not-found error when payment run does not exist", async () => {
    mockRunSelect([]);

    const result = await exportPaymentRunNACHA(mockDb, ORG_ID, {
      paymentRunId: RUN_ID,
      originatorInfo: ORIGINATOR_INFO,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_PAYMENT_RUN_NOT_FOUND");
    }
  });

  it("returns missing-bank-account error when supplier lacks ACH routing", async () => {
    mockRunSelect([PAYMENT_RUN_ROW]);
    mockItemsSelect([ITEM_MISSING_BANK]);

    const result = await exportPaymentRunNACHA(mockDb, ORG_ID, {
      paymentRunId: RUN_ID,
      originatorInfo: ORIGINATOR_INFO,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AP_SUPPLIER_BANK_ACCOUNT_MISSING");
    }
  });

  it("returns NACHA file on success", async () => {
    mockRunSelect([PAYMENT_RUN_ROW]);
    mockItemsSelect([ITEM_WITH_ACH]);

    const result = await exportPaymentRunNACHA(mockDb, ORG_ID, {
      paymentRunId: RUN_ID,
      originatorInfo: ORIGINATOR_INFO,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.format).toBe("NACHA_ACH");
      expect(result.data.transactionCount).toBe(1);
      expect(result.data.totalAmountMinor).toBe(500000n);
    }
  });
});
