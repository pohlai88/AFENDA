import type { InvoiceFingerprint } from "../calculators/detect-duplicates";
import type {
  DebtorAccount,
  PaymentRunForExport,
} from "../calculators/payment-file-iso20022";
import type {
  NACHAOriginatorInfo,
  NACHAPaymentItem,
} from "../calculators/payment-file-nacha";
import type { InvoiceForAging } from "../calculators/aging";

export const AP_TEST_BASE_DATE = new Date("2026-03-01T00:00:00.000Z");
export const AP_TEST_AS_OF_DATE = new Date("2026-03-15T00:00:00.000Z");
export const AP_TEST_RUN_DATE = new Date("2026-03-15T00:00:00.000Z");
export const AP_TEST_EFFECTIVE_DATE = new Date("2026-03-15T10:00:00.000Z");

export const AP_TEST_DEBTOR: DebtorAccount = {
  name: "ACME Corp",
  iban: "GB29NWBK60161331926819",
  bic: "NWBKGB2L",
  currency: "USD",
};

export const AP_TEST_ORIGINATOR: NACHAOriginatorInfo = {
  immediateDest: "021000021",
  immediateOrigin: "1234567890",
  companyName: "ACME CORP",
  companyId: "1234567890",
  companyEntryDescription: "SUPPLIER",
};

export function createAgingInvoice(
  overrides: Partial<InvoiceForAging> = {},
): InvoiceForAging {
  return {
    id: crypto.randomUUID(),
    supplierId: "sup-A",
    supplierName: "Supplier Alpha",
    dueDate: AP_TEST_AS_OF_DATE,
    balanceMinor: 10000n,
    ...overrides,
  };
}

export function createDuplicateFingerprint(
  overrides: Partial<InvoiceFingerprint> = {},
): InvoiceFingerprint {
  return {
    invoiceId: crypto.randomUUID(),
    supplierId: "supplier-aaa",
    supplierRef: "INV-001",
    totalAmount: 10000n,
    invoiceDate: AP_TEST_BASE_DATE,
    ...overrides,
  };
}

export function createIsoPaymentItem(
  overrides: Partial<PaymentRunForExport["items"][number]> = {},
): PaymentRunForExport["items"][number] {
  return {
    id: "item-001",
    invoiceId: "inv-001",
    invoiceNumber: "INV-2026-001",
    supplierName: "Widgets Ltd",
    supplierIBAN: "DE89370400440532013000",
    supplierBIC: "COBADEFFXXX",
    amountMinor: 500000n,
    currencyCode: "USD",
    remittanceInfo: "INV-2026-001",
    ...overrides,
  };
}

export function createIsoPaymentRun(
  items: PaymentRunForExport["items"] = [],
  overrides: Partial<PaymentRunForExport> = {},
): PaymentRunForExport {
  return {
    id: "run-001",
    runNumber: "001",
    runDate: AP_TEST_RUN_DATE,
    currencyCode: "USD",
    items,
    ...overrides,
  };
}

export function createNachaPaymentItem(
  overrides: Partial<NACHAPaymentItem> = {},
): NACHAPaymentItem {
  return {
    invoiceNumber: "INV-2026-001",
    supplierName: "Widgets LLC",
    supplierAccountNumber: "123456789012345",
    supplierRoutingNumber: "021000021",
    amountMinor: 500000n,
    accountType: "checking",
    ...overrides,
  };
}