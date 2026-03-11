/**
 * Payment Run Export — generate ISO 20022 or NACHA payment files.
 *
 * Fetches payment run + items with supplier bank accounts, then delegates
 * to calculators for file generation.
 *
 * RULES:
 *   - Read-only — no mutations.
 *   - Requires debtor/originator account info via params.
 */

import type { DbClient } from "@afenda/db";
import {
  paymentRun,
  paymentRunItem,
  supplier,
  supplierBankAccount,
} from "@afenda/db";
import { eq, and } from "drizzle-orm";
import type { OrgId } from "@afenda/contracts";
import type {
  PaymentRunForExport,
  PaymentRunItemForExport,
  DebtorAccount,
  ISO20022PaymentFile,
} from "./calculators/payment-file-iso20022";
import type {
  NACHAOriginatorInfo,
  NACHAPaymentItem,
  NACHAPaymentFile,
} from "./calculators/payment-file-nacha";
import { generateISO20022PaymentFile } from "./calculators/payment-file-iso20022";
import { generateNACHAFile } from "./calculators/payment-file-nacha";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PaymentRunExportError = {
  code: string;
  message: string;
  meta?: Record<string, string>;
};

export type PaymentRunExportResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PaymentRunExportError };

export interface ExportPaymentRunISO20022Params {
  paymentRunId: string;
  debtorAccount: DebtorAccount;
}

export interface ExportPaymentRunNACHAParams {
  paymentRunId: string;
  originatorInfo: NACHAOriginatorInfo;
}

// ── Export ISO 20022 ───────────────────────────────────────────────────────────

export async function exportPaymentRunISO20022(
  db: DbClient,
  orgId: OrgId,
  params: ExportPaymentRunISO20022Params,
): Promise<PaymentRunExportResult<ISO20022PaymentFile>> {
  const runForExport = await getPaymentRunForExport(db, orgId, params.paymentRunId);
  if (!runForExport) {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_NOT_FOUND",
        message: "Payment run not found",
        meta: { paymentRunId: params.paymentRunId },
      },
    };
  }

  const missingBank = runForExport.items.find(
    (i) => !i.supplierIBAN || i.supplierIBAN === "",
  );
  if (missingBank) {
    return {
      ok: false,
      error: {
        code: "AP_SUPPLIER_BANK_ACCOUNT_MISSING",
        message: "One or more suppliers lack a primary bank account with IBAN",
        meta: { invoiceNumber: missingBank.invoiceNumber },
      },
    };
  }

  const file = generateISO20022PaymentFile(runForExport, params.debtorAccount);
  return { ok: true, data: file };
}

// ── Export NACHA ─────────────────────────────────────────────────────────────

export async function exportPaymentRunNACHA(
  db: DbClient,
  orgId: OrgId,
  params: ExportPaymentRunNACHAParams,
): Promise<PaymentRunExportResult<NACHAPaymentFile>> {
  const runForExport = await getPaymentRunForExport(db, orgId, params.paymentRunId);
  if (!runForExport) {
    return {
      ok: false,
      error: {
        code: "AP_PAYMENT_RUN_NOT_FOUND",
        message: "Payment run not found",
        meta: { paymentRunId: params.paymentRunId },
      },
    };
  }

  const nachaItems: NACHAPaymentItem[] = [];
  for (const item of runForExport.items) {
    const routing = (item as PaymentRunItemForExport & { supplierRoutingNumber?: string })
      .supplierRoutingNumber;
    const account = (item as PaymentRunItemForExport & { supplierAccountNumber?: string })
      .supplierAccountNumber;
    if (!routing || !account) {
      return {
        ok: false,
        error: {
          code: "AP_SUPPLIER_BANK_ACCOUNT_MISSING",
          message: "One or more suppliers lack a primary bank account with routing/account number",
          meta: { invoiceNumber: item.invoiceNumber },
        },
      };
    }
    nachaItems.push({
      invoiceNumber: item.invoiceNumber,
      supplierName: item.supplierName,
      supplierAccountNumber: account,
      supplierRoutingNumber: routing,
      amountMinor: item.amountMinor,
      accountType: "checking",
      individualId: item.invoiceId.slice(0, 15),
    });
  }

  // gate:allow-js-date — runDate is from DB (YYYY-MM-DD); generateNACHAFile expects Date for effective date
  const paymentDate = new Date(runForExport.runDate);
  const file = generateNACHAFile(
    nachaItems,
    params.originatorInfo,
    paymentDate,
  );
  return { ok: true, data: file };
}

// ── Fetch payment run for export ───────────────────────────────────────────────

async function getPaymentRunForExport(
  db: DbClient,
  orgId: OrgId,
  paymentRunId: string,
): Promise<PaymentRunForExport | null> {
  const [runRow] = await db
    .select()
    .from(paymentRun)
    .where(and(eq(paymentRun.orgId, orgId), eq(paymentRun.id, paymentRunId)))
    .limit(1);

  if (!runRow) return null;

  const itemRows = await db
    .select({
      itemId: paymentRunItem.id,
      invoiceId: paymentRunItem.invoiceId,
      invoiceNumber: paymentRunItem.invoiceNumber,
      amountPaidMinor: paymentRunItem.amountPaidMinor,
      supplierId: paymentRunItem.supplierId,
      supplierName: supplier.name,
      iban: supplierBankAccount.iban,
      bicSwift: supplierBankAccount.bicSwift,
      accountNumber: supplierBankAccount.accountNumber,
      routingNumber: supplierBankAccount.routingNumber,
    })
    .from(paymentRunItem)
    .innerJoin(supplier, eq(paymentRunItem.supplierId, supplier.id))
    .leftJoin(
      supplierBankAccount,
      and(
        eq(supplierBankAccount.supplierId, supplier.id),
        eq(supplierBankAccount.orgId, orgId),
        eq(supplierBankAccount.isPrimary, true),
        eq(supplierBankAccount.status, "active"),
      ),
    )
    .where(
      and(
        eq(paymentRunItem.orgId, orgId),
        eq(paymentRunItem.paymentRunId, paymentRunId),
      ),
    );

  const items: (PaymentRunItemForExport & {
    supplierRoutingNumber?: string;
    supplierAccountNumber?: string;
  })[] = itemRows.map((r) => ({
    id: r.itemId,
    invoiceId: r.invoiceId,
    invoiceNumber: r.invoiceNumber,
    supplierName: r.supplierName,
    supplierIBAN: r.iban ?? "",
    supplierBIC: r.bicSwift ?? undefined,
    amountMinor: r.amountPaidMinor,
    currencyCode: runRow.currencyCode,
    remittanceInfo: r.invoiceNumber,
    supplierRoutingNumber: r.routingNumber ?? undefined,
    supplierAccountNumber: r.accountNumber ?? undefined,
  }));

  return {
    id: runRow.id,
    runNumber: runRow.runNumber,
    // gate:allow-js-date — paymentDate from DB (YYYY-MM-DD string); PaymentRunForExport expects Date for calculators
    runDate: new Date(runRow.paymentDate),
    currencyCode: runRow.currencyCode,
    items,
  };
}
