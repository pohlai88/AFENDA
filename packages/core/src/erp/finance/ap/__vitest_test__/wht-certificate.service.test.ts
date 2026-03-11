/**
 * Unit tests for WHT Certificate service — createWhtCertificate.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId, PrincipalId, CorrelationId } from "@afenda/contracts";

// ── Mock DB setup ─────────────────────────────────────────────────────────────

const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn(() => ({ limit: mockSelectLimit }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
} as any;

vi.mock("@afenda/db", () => ({
  whtCertificate: {},
  supplier: { id: "id", orgId: "org_id" },
  outboxEvent: {},
  auditLog: {},
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn(() => ({})),
    and: vi.fn(() => ({})),
    sql: Object.assign(vi.fn(() => ({})), { raw: vi.fn(() => ({})) }),
  };
});

vi.mock("../../../../kernel/governance/audit/audit", () => ({
  withAudit: vi.fn(async (_db: any, _ctx: any, _entry: any, fn: any) => fn(mockDb)),
}));

import { createWhtCertificate } from "../wht-certificate.service";

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_ID = "11111111-1111-1111-1111-111111111111" as OrgId;
const PRINCIPAL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc" as CorrelationId;
const SUPPLIER_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const CERT_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff";

const CTX = { activeContext: { orgId: ORG_ID } };
const POLICY_CTX = { principalId: PRINCIPAL_A };

const BASE_PARAMS = {
  supplierId: SUPPLIER_ID,
  certificateNumber: "WHT-2026-001",
  whtType: "SERVICES" as const,
  jurisdictionCode: "US",
  currencyCode: "USD",
  grossAmountMinor: 1000000n,
  whtRatePercent: 15,
  whtAmountMinor: 150000n,
  netAmountMinor: 850000n,
  taxPeriod: "2026-Q1",
  certificateDate: "2026-03-15",
  paymentRunId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── createWhtCertificate ──────────────────────────────────────────────────────

describe("createWhtCertificate", () => {
  it("returns ok with certificate id when supplier exists", async () => {
    // Two sequential selects: (1) check supplier exists, (2) check cert uniqueness
    mockSelectLimit
      .mockResolvedValueOnce([{ id: SUPPLIER_ID }]) // supplier found
      .mockResolvedValueOnce([]); // no existing certificate
    mockInsertReturning.mockResolvedValue([{ id: CERT_ID }]);

    const result = await createWhtCertificate(mockDb, CTX, POLICY_CTX, CORRELATION_ID, BASE_PARAMS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(CERT_ID);
    }

    const insertedRows = mockInsertValues.mock.calls.map((call) => call[0]);
    expect(insertedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "AP.WHT_CERTIFICATE_CREATED",
          payload: expect.objectContaining({
            whtCertificateId: CERT_ID,
            supplierId: SUPPLIER_ID,
            certificateNumber: BASE_PARAMS.certificateNumber,
          }),
        }),
      ]),
    );
  });

  it("returns SUP_SUPPLIER_NOT_FOUND when supplier does not exist", async () => {
    mockSelectLimit.mockResolvedValue([]); // supplier not found

    const result = await createWhtCertificate(mockDb, CTX, POLICY_CTX, CORRELATION_ID, BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SUP_SUPPLIER_NOT_FOUND");
    }
  });

  it("stores the correct WHT type", async () => {
    mockSelectLimit
      .mockResolvedValueOnce([{ id: SUPPLIER_ID }]) // supplier found
      .mockResolvedValueOnce([]); // no existing certificate
    mockInsertReturning.mockResolvedValue([{ id: CERT_ID }]);

    await createWhtCertificate(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      ...BASE_PARAMS,
      whtType: "RENT",
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ whtType: "RENT" })
    );
  });

  it("stores gross, wht, and net amounts", async () => {
    mockSelectLimit
      .mockResolvedValueOnce([{ id: SUPPLIER_ID }]) // supplier found
      .mockResolvedValueOnce([]); // no existing certificate
    mockInsertReturning.mockResolvedValue([{ id: CERT_ID }]);

    await createWhtCertificate(mockDb, CTX, POLICY_CTX, CORRELATION_ID, BASE_PARAMS);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        grossAmountMinor: 1000000n,
        whtAmountMinor: 150000n,
        netAmountMinor: 850000n,
      })
    );
  });

  it("stores paymentRunId when provided", async () => {
    mockSelectLimit
      .mockResolvedValueOnce([{ id: SUPPLIER_ID }]) // supplier found
      .mockResolvedValueOnce([]); // no existing certificate
    mockInsertReturning.mockResolvedValue([{ id: CERT_ID }]);

    const PAYMENT_RUN_ID = "prprprpr-prpr-prpr-prpr-prprprprprpr";
    await createWhtCertificate(mockDb, CTX, POLICY_CTX, CORRELATION_ID, {
      ...BASE_PARAMS,
      paymentRunId: PAYMENT_RUN_ID,
    });

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ paymentRunId: PAYMENT_RUN_ID })
    );
  });

  it("stores orgId from context", async () => {
    mockSelectLimit
      .mockResolvedValueOnce([{ id: SUPPLIER_ID }]) // supplier found
      .mockResolvedValueOnce([]); // no existing certificate
    mockInsertReturning.mockResolvedValue([{ id: CERT_ID }]);

    await createWhtCertificate(mockDb, CTX, POLICY_CTX, CORRELATION_ID, BASE_PARAMS);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: ORG_ID })
    );
  });

  it("includes error meta with supplierId when supplier not found", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const result = await createWhtCertificate(mockDb, CTX, POLICY_CTX, CORRELATION_ID, BASE_PARAMS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.meta?.supplierId).toBe(SUPPLIER_ID);
    }
  });
});
