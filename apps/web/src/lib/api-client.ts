/**
 * API client for Next.js - works in both Server and Client Components.
 *
 * Uses the internal rewrite proxy so the API URL doesn't leak to clients.
 * All functions throw on non-OK responses — callers should catch and
 * render error states.
 *
 * Auth:
 * - Server Components: Reads transition session token cookie, sends Authorization: Bearer
 * - Client Components: Browser automatically sends cookies, no manual auth needed
 * - Dev mode (no session): Sends x-dev-user-email for API bypass
 */

import type { AuthContextResponse, CapabilityResult, PortalType } from "@afenda/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Default org slug for API requests. TODO: from org context when available. */
const DEFAULT_ORG = "demo";

/**
 * Get auth headers for API requests.
 * - In Server Components: Reads session token from cookies, sends Authorization: Bearer
 * - In Client Components: Returns minimal headers (browser sends cookies automatically)
 * - In dev mode without session: Sends x-dev-user-email for API bypass
 */
export async function getApiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "x-org-id": DEFAULT_ORG,
  };

  const isServer = typeof window === "undefined";
  const isDev = process.env.NODE_ENV !== "production";

  if (isServer) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get("neon-auth.session")?.value ??
      cookieStore.get("__Secure-neon-auth.session")?.value;

    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
      return headers;
    }

    if (isDev) {
      headers["x-dev-user-email"] = "admin@demo.afenda";
    }
  }

  return headers;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  correlationId?: string;
}

export interface InvoiceListResponse {
  data: InvoiceRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}

export interface InvoiceRow {
  id: string;
  orgId: string;
  supplierId: string;
  invoiceNumber: string;
  amountMinor: string;
  currencyCode: string;
  status: string;
  dueDate: string | null;
  submittedByPrincipalId: string | null;
  submittedAt: string | null;
  poReference: string | null;
  paidAt: string | null;
  paidByPrincipalId: string | null;
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch with standard headers for internal API calls.
 * Uses getApiHeaders() for Bearer token (or dev bypass).
 */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getApiHeaders();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...init?.headers,
    },
    // Next.js 15+ — opt out of aggressive caching for API calls
    cache: "no-store",
  });
}

/**
 * Get auth context for progressive UI (SSO discovery, org disambiguation, MFA gating).
 * Unauthenticated — no Bearer token required.
 */
export async function fetchAuthContext(
  email: string,
  portal: PortalType,
): Promise<ApiSuccess<AuthContextResponse>> {
  const res = await fetch(`${API_BASE}/v1/auth/context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, portal }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Auth context API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List invoices with cursor pagination. */
export async function fetchInvoices(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}): Promise<InvoiceListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);

  const qs = query.toString();
  const res = await apiFetch(`/v1/invoices${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get a single invoice by ID. */
export async function fetchInvoice(id: string): Promise<ApiSuccess<InvoiceRow>> {
  const res = await apiFetch(`/v1/invoices/${id}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List payment runs with cursor pagination. */
export async function fetchPaymentRuns(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}): Promise<{
  data: Array<{
    id: string;
    runNumber: string;
    description: string | null;
    paymentMethod: string;
    currencyCode: string;
    paymentDate: string;
    totalAmountMinor: string;
    totalDiscountMinor: string;
    itemCount: number;
    status: string;
    createdAt: string;
  }>;
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/payment-runs${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Payment runs API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List prepayments with cursor pagination. */
export async function fetchPrepayments(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}): Promise<{
  data: Array<{
    id: string;
    supplierId: string;
    prepaymentNumber: string;
    description: string | null;
    currencyCode: string;
    originalAmountMinor: string;
    balanceMinor: string;
    paymentDate: string;
    paymentReference: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/prepayments${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Prepayments API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List payment terms with cursor pagination. */
export async function fetchPaymentTerms(params?: { cursor?: string; limit?: number }): Promise<{
  data: Array<{
    id: string;
    code: string;
    description: string;
    netDays: number;
    discountPercent: string | null;
    discountDays: number | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  const res = await apiFetch(`/v1/payment-terms${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Payment terms API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List WHT certificates with cursor pagination. */
export async function fetchWhtCertificates(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}): Promise<{
  data: Array<{
    id: string;
    supplierId: string;
    certificateNumber: string;
    whtType: string;
    jurisdictionCode: string;
    currencyCode: string;
    grossAmountMinor: string;
    whtRatePercent: string;
    whtAmountMinor: string;
    netAmountMinor: string;
    taxPeriod: string;
    certificateDate: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/wht-certificates${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`WHT certificates API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Treasury: Bank Accounts ─────────────────────────────────────────────────

export interface TreasuryBankAccountRow {
  id: string;
  orgId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currencyCode: string;
  bankIdentifierCode: string | null;
  externalBankRef: string | null;
  status: "active" | "inactive" | "suspended";
  isPrimary: boolean;
  activatedAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryBankAccountListResponse {
  data: TreasuryBankAccountRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}

export async function fetchTreasuryBankAccounts(params?: {
  cursor?: string;
  limit?: number;
  status?: "active" | "inactive" | "suspended";
}): Promise<TreasuryBankAccountListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();

  const res = await apiFetch(`/v1/treasury/bank-accounts${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Treasury bank accounts API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function createTreasuryBankAccount(command: {
  accountName: string;
  bankName: string;
  accountNumber: string;
  currencyCode: string;
  bankIdentifierCode?: string;
  externalBankRef?: string;
  isPrimary?: boolean;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-bank-account", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create bank account failed (${res.status})`);
  }
  return res.json();
}

export async function updateTreasuryBankAccount(command: {
  id: string;
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  currencyCode?: string;
  bankIdentifierCode?: string | null;
  externalBankRef?: string | null;
  isPrimary?: boolean;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/update-bank-account", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Update bank account failed (${res.status})`);
  }
  return res.json();
}

export async function activateTreasuryBankAccount(id: string): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/activate-bank-account", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), id }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Activate bank account failed (${res.status})`);
  }
  return res.json();
}

export async function deactivateTreasuryBankAccount(id: string): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/deactivate-bank-account", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), id }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Deactivate bank account failed (${res.status})`);
  }
  return res.json();
}

// ── Treasury: Bank Statements ──────────────────────────────────────────────────

export interface TreasuryBankStatementRow {
  id: string;
  orgId: string;
  bankAccountId: string;
  sourceRef: string;
  statementDate: string;
  openingBalance: string;
  closingBalance: string;
  currencyCode: string;
  status: "pending" | "processing" | "processed" | "failed";
  lineCount: number;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryBankStatementLineRow {
  id: string;
  orgId: string;
  statementId: string;
  lineNumber: number;
  transactionDate: string;
  valueDate: string;
  amount: string;
  direction: "inflow" | "outflow";
  description: string;
  reference: string | null;
  status: "unmatched" | "matched" | "excluded";
  createdAt: string;
}

export interface TreasuryBankStatementListResponse {
  data: TreasuryBankStatementRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}

export interface TreasuryBankStatementLineListResponse {
  data: TreasuryBankStatementLineRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}

export async function fetchTreasuryBankStatements(params?: {
  cursor?: string;
  limit?: number;
  status?: "pending" | "processing" | "processed" | "failed";
  bankAccountId?: string;
}): Promise<TreasuryBankStatementListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  if (params?.bankAccountId) query.set("bankAccountId", params.bankAccountId);
  const qs = query.toString();

  const res = await apiFetch(`/v1/treasury/bank-statements${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Treasury bank statements API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchTreasuryBankStatement(id: string): Promise<ApiSuccess<TreasuryBankStatementRow>> {
  const res = await apiFetch(`/v1/treasury/bank-statements/${id}`);
  if (!res.ok) throw new Error(`Treasury bank statement API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchTreasuryBankStatementLines(
  statementId: string,
  params?: {
    cursor?: string;
    limit?: number;
  },
): Promise<TreasuryBankStatementLineListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();

  const res = await apiFetch(
    `/v1/treasury/bank-statements/${statementId}/lines${qs ? `?${qs}` : ""}`,
  );
  if (!res.ok) throw new Error(`Treasury bank statement lines API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function ingestTreasuryBankStatement(command: {
  bankAccountId: string;
  sourceRef: string;
  statementDate: string;
  openingBalance: string;
  closingBalance: string;
  currencyCode: string;
  lines: Array<{
    lineNumber: number;
    transactionDate: string;
    valueDate?: string | null;
    amount: string;
    direction: "inflow" | "outflow";
    description: string;
    reference?: string;
  }>;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/ingest-bank-statement", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Ingest bank statement failed (${res.status})`);
  }
  return res.json();
}

export async function markTreasuryBankStatementFailed(command: {
  statementId: string;
  failureReason: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/mark-statement-failed", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Mark statement failed failed (${res.status})`);
  }
  return res.json();
}

/** Create a new payment run (DRAFT status). */
export async function createPaymentRun(command: {
  description?: string;
  paymentMethod: string;
  currencyCode: string;
  paymentDate: string;
}): Promise<ApiSuccess<{ id: string; runNumber: string }>> {
  const res = await apiFetch("/v1/commands/create-payment-run", {
    method: "POST",
    body: JSON.stringify({
      ...command,
      idempotencyKey: crypto.randomUUID(),
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create payment run failed (${res.status})`);
  }
  return res.json();
}

/** Fetch AP aging report. */
export async function fetchAgingReport(params?: {
  asOfDate?: string;
  supplierId?: string;
}): Promise<
  ApiSuccess<{
    asOfDate: string;
    suppliers: Array<{
      supplierId: string;
      supplierName: string;
      totalOutstandingMinor: string;
      invoiceCount: number;
      buckets: Array<{
        bucket: string;
        minDays: number;
        maxDays: number | null;
        totalAmountMinor: string;
        invoiceCount: number;
        invoices: string[];
      }>;
    }>;
    summary: {
      totalOutstandingMinor: string;
      totalInvoiceCount: number;
      byBucket: Array<{
        bucket: string;
        minDays: number;
        maxDays: number | null;
        totalAmountMinor: string;
        invoiceCount: number;
        invoices: string[];
      }>;
    };
  }>
> {
  const query = new URLSearchParams();
  if (params?.asOfDate) query.set("asOfDate", params.asOfDate);
  if (params?.supplierId) query.set("supplierId", params.supplierId);
  const qs = query.toString();
  const res = await apiFetch(`/api/v1/ap/aging${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Aging API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Fetch invoices in a specific aging bucket. */
export async function fetchInvoicesByAgingBucket(
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+",
  params?: { asOfDate?: string },
): Promise<
  ApiSuccess<{
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      supplierId: string;
      invoiceDate: string;
      dueDate: string;
      amountMinor: string;
      balanceMinor: string;
      daysOverdue: number;
      status: string;
    }>;
  }>
> {
  const query = new URLSearchParams();
  if (params?.asOfDate) query.set("asOfDate", params.asOfDate);
  const qs = query.toString();
  const res = await apiFetch(`/api/v1/ap/aging/${bucket}/invoices${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Aging bucket API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Export payment run as ISO 20022 or NACHA file. Returns blob and filename for download. */
export async function exportPaymentRunFile(
  paymentRunId: string,
  params:
    | {
        format: "ISO20022";
        debtorName: string;
        debtorIban: string;
        debtorBic?: string;
        debtorCurrency: string;
      }
    | {
        format: "NACHA";
        immediateDest: string;
        immediateOrigin: string;
        companyName: string;
        companyId: string;
        companyEntryDescription?: string;
      },
): Promise<{ blob: Blob; fileName: string }> {
  const q = new URLSearchParams();
  q.set("format", params.format);
  if (params.format === "ISO20022") {
    q.set("debtorName", params.debtorName);
    q.set("debtorIban", params.debtorIban);
    if (params.debtorBic) q.set("debtorBic", params.debtorBic);
    q.set("debtorCurrency", params.debtorCurrency);
  } else {
    q.set("immediateDest", params.immediateDest);
    q.set("immediateOrigin", params.immediateOrigin);
    q.set("companyName", params.companyName);
    q.set("companyId", params.companyId);
    if (params.companyEntryDescription)
      q.set("companyEntryDescription", params.companyEntryDescription);
  }
  const headers = await getApiHeaders();
  const res = await fetch(`${API_BASE}/v1/payment-runs/${paymentRunId}/export?${q}`, {
    headers: { ...headers },
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(err?.error?.message ?? `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const contentDisp = res.headers.get("Content-Disposition");
  const fileName =
    contentDisp?.match(/filename="?([^"]+)"?/)?.[1] ??
    `payment-${params.format.toLowerCase()}.${params.format === "ISO20022" ? "xml" : "ach"}`;
  return { blob, fileName };
}

/** Apply prepayment to an invoice. */
export async function applyPrepayment(command: {
  idempotencyKey: string;
  prepaymentId: string;
  invoiceId: string;
  amountMinor: bigint | string;
}): Promise<ApiSuccess<{ applicationId: string }>> {
  const res = await apiFetch("/v1/commands/apply-prepayment", {
    method: "POST",
    body: JSON.stringify({
      ...command,
      amountMinor: String(command.amountMinor),
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? `Apply prepayment failed (${res.status})`);
  }
  return res.json();
}

/** Void an unused prepayment. */
export async function voidPrepayment(command: {
  idempotencyKey: string;
  prepaymentId: string;
  reason: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/void-prepayment", {
    method: "POST",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? `Void prepayment failed (${res.status})`);
  }
  return res.json();
}

/** Create a draft invoice. */
export async function createInvoice(command: {
  idempotencyKey: string;
  supplierId: string;
  amountMinor: bigint | string;
  currencyCode: string;
  dueDate?: string | null;
  poReference?: string | null;
}): Promise<ApiSuccess<{ id: string; invoiceNumber: string }>> {
  const res = await apiFetch("/v1/commands/create-invoice", {
    method: "POST",
    body: JSON.stringify({
      ...command,
      amountMinor: String(command.amountMinor),
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create invoice failed (${res.status})`);
  }
  return res.json();
}

/** Execute an invoice workflow transition command. */
export async function transitionInvoice(command: {
  transitionKey:
    | "invoice.submit"
    | "invoice.approve"
    | "invoice.reject"
    | "invoice.void"
    | "invoice.post"
    | "invoice.markPaid";
  invoiceId: string;
}): Promise<void> {
  const endpointByTransition: Record<typeof command.transitionKey, string> = {
    "invoice.submit": "/v1/commands/submit-invoice",
    "invoice.approve": "/v1/commands/approve-invoice",
    "invoice.reject": "/v1/commands/reject-invoice",
    "invoice.void": "/v1/commands/void-invoice",
    "invoice.post": "/v1/commands/post-to-gl",
    "invoice.markPaid": "/v1/commands/mark-paid",
  };

  const res = await apiFetch(endpointByTransition[command.transitionKey], {
    method: "POST",
    body: JSON.stringify({ invoiceId: command.invoiceId }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Invoice transition failed (${res.status})`);
  }
}

/** Execute AP invoice bulk actions. */
export async function bulkInvoiceAction(command: {
  actionKey: "bulk-approve" | "bulk-reject" | "bulk-void";
  invoiceIds: string[];
  reason?: string;
}): Promise<{ ok: number; failed: number }> {
  const endpointByAction: Record<typeof command.actionKey, string> = {
    "bulk-approve": "/v1/invoices/bulk-approve",
    "bulk-reject": "/v1/invoices/bulk-reject",
    "bulk-void": "/v1/invoices/bulk-void",
  };

  const res = await apiFetch(endpointByAction[command.actionKey], {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      invoiceIds: command.invoiceIds,
      ...(command.reason ? { reason: command.reason } : {}),
    }),
  });

  const json = (await res.json().catch(() => null)) as {
    data?: { ok: number; failed: number };
  } | null;
  if (!res.ok || !json?.data) {
    return { ok: 0, failed: command.invoiceIds.length };
  }

  return { ok: json.data.ok, failed: json.data.failed };
}

// ── Settings ──────────────────────────────────────────────────────────────────

import type { SettingsResponse, SettingKey } from "@afenda/contracts";

export interface SettingsFetchResponse {
  data: SettingsResponse;
  correlationId: string;
}

/**
 * Get effective settings for the org (system defaults merged with overrides).
 * @param keys — optional subset of keys; omit to return all Phase 1 keys.
 */
export async function fetchSettings(keys?: SettingKey[]): Promise<SettingsFetchResponse> {
  const qs = keys && keys.length > 0 ? `?keys=${keys.join(",")}` : "";
  const res = await apiFetch(`/v1/settings${qs}`);
  if (!res.ok) throw new Error(`Settings API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface SettingUpdateInput {
  key: SettingKey;
  // Accepts string, number (fiscal/payment terms), boolean (feature flags), or
  // null (clear org override and fall back to system default).
  value: string | number | boolean | null;
}

/**
 * Atomically update one or more settings.
 * value: null clears the org override and falls back to system default.
 */
export async function updateSettings(
  updates: SettingUpdateInput[],
  idempotencyKey: string,
): Promise<SettingsFetchResponse> {
  const res = await apiFetch("/v1/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ idempotencyKey, updates }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.error?.message ?? `Settings API error ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// ── Custom Fields ─────────────────────────────────────────────────────────────

import type {
  CustomFieldDefResponse,
  CustomFieldValuesResponse,
  CreateCustomFieldDefCommand,
  UpdateCustomFieldDefCommand,
  UpsertCustomFieldValuesCommand,
  CustomFieldEntityType,
} from "@afenda/contracts";

export interface CustomFieldsListResponse {
  data: CustomFieldDefResponse[];
  correlationId: string;
}

export interface CustomFieldDefSingleResponse {
  data: CustomFieldDefResponse;
  correlationId: string;
}

export interface CustomFieldValuesFetchResponse {
  data: CustomFieldValuesResponse;
  correlationId: string;
}

/** List custom field definitions for the org, optionally filtered by entityType. */
export async function fetchCustomFieldDefs(
  entityType?: CustomFieldEntityType,
  includeInactive?: boolean,
): Promise<CustomFieldsListResponse> {
  const params = new URLSearchParams();
  if (entityType) params.set("entityType", entityType);
  if (includeInactive) params.set("includeInactive", "true");
  const qs = params.toString();
  const res = await apiFetch(`/v1/custom-fields${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Custom fields API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Create a new custom field definition. */
export async function createCustomFieldDef(
  command: CreateCustomFieldDefCommand,
): Promise<CustomFieldDefSingleResponse> {
  const res = await apiFetch("/v1/custom-fields", {
    method: "POST",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Custom fields API error ${res.status}`);
  }
  return res.json();
}

/** Update a custom field definition (api_key and entity_type are immutable). */
export async function updateCustomFieldDef(
  id: string,
  command: UpdateCustomFieldDefCommand,
): Promise<CustomFieldDefSingleResponse> {
  const res = await apiFetch(`/v1/custom-fields/${id}`, {
    method: "PATCH",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Custom fields API error ${res.status}`);
  }
  return res.json();
}

/** Delete or deactivate a custom field definition. */
export async function deleteCustomFieldDef(id: string): Promise<void> {
  const res = await apiFetch(`/v1/custom-fields/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Custom fields API error ${res.status}`);
  }
}

/** Upsert custom field values for a supplier. */
export async function upsertSupplierCustomFieldValues(
  supplierId: string,
  command: UpsertCustomFieldValuesCommand,
): Promise<CustomFieldValuesFetchResponse> {
  const res = await apiFetch(`/v1/suppliers/${supplierId}/custom-fields`, {
    method: "PATCH",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Custom fields API error ${res.status}`);
  }
  return res.json();
}

// ── Organization ──────────────────────────────────────────────────────────────

import type {
  OrgProfileResponse,
  OrgMembersResponse,
  UpdateOrganizationCommand,
} from "@afenda/contracts";

export interface OrgProfileFetchResponse {
  data: OrgProfileResponse;
  correlationId: string;
}

export interface OrgMembersFetchResponse {
  data: OrgMembersResponse;
  correlationId: string;
}

/** Get current org profile (name, slug, currency). */
export async function fetchOrganization(): Promise<OrgProfileFetchResponse> {
  const res = await apiFetch("/v1/organization");
  if (!res.ok) throw new Error(`Organization API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Update org display name and/or base currency. */
export async function updateOrganization(
  command: UpdateOrganizationCommand,
): Promise<OrgProfileFetchResponse> {
  const res = await apiFetch("/v1/organization", {
    method: "PATCH",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Organization API error ${res.status}`);
  }
  return res.json();
}

/** List org members for the Access settings page. */
export async function fetchOrgMembers(): Promise<OrgMembersFetchResponse> {
  const res = await apiFetch("/v1/organization/members");
  if (!res.ok) throw new Error(`Organization API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Password ─────────────────────────────────────────────────────────────────

/**
 * Change the authenticated user's password. Requires current password.
 * Used by the Security settings page.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await apiFetch("/v1/me/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Password change failed (${res.status})`);
  }
}

// ── MFA (TOTP) ────────────────────────────────────────────────────────────────

export interface MfaStatusResponse {
  enabled: boolean;
}

export interface MfaSetupData {
  secret: string;
  otpauthUri: string;
}

/** Returns whether TOTP MFA is currently enabled for the authenticated user. */
export async function fetchMfaStatus(): Promise<MfaStatusResponse> {
  const res = await apiFetch("/v1/me/mfa");
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `MFA status fetch failed (${res.status})`);
  }
  const json = (await res.json()) as { data: MfaStatusResponse };
  return json.data;
}

/**
 * Generate a new TOTP secret and otpauth:// URI for enrollment.
 * Does NOT enable MFA — caller must confirm with confirmTotpSetup().
 */
export async function generateTotpSetup(): Promise<MfaSetupData> {
  const res = await apiFetch("/v1/me/mfa/setup", { method: "POST" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `MFA setup generation failed (${res.status})`);
  }
  const json = (await res.json()) as { data: MfaSetupData };
  return json.data;
}

/**
 * Verify a trial TOTP code against the given secret, then persist the enrollment.
 * Throws if the code is invalid.
 */
export async function confirmTotpSetup(secret: string, code: string): Promise<void> {
  const res = await apiFetch("/v1/me/mfa/setup/confirm", {
    method: "POST",
    body: JSON.stringify({ secret, code }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `MFA confirmation failed (${res.status})`);
  }
}

/** Disable MFA for the authenticated user by removing the TOTP enrollment. */
export async function disableMfa(): Promise<void> {
  const res = await apiFetch("/v1/me/mfa", { method: "DELETE" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `MFA disable failed (${res.status})`);
  }
}

// ── Numbering ─────────────────────────────────────────────────────────────────

import type { NumberingConfigResponse, UpdateNumberingConfigCommand } from "@afenda/contracts";

export interface NumberingConfigFetchResponse {
  data: NumberingConfigResponse;
  correlationId: string;
}

/** List all document numbering configurations for the org. */
export async function fetchNumberingConfig(): Promise<NumberingConfigFetchResponse> {
  const res = await apiFetch("/v1/settings/numbering");
  if (!res.ok) throw new Error(`Numbering API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Update a document numbering sequence config (prefix, pad width, or seed). */
export async function updateNumberingConfig(
  command: UpdateNumberingConfigCommand,
): Promise<NumberingConfigFetchResponse> {
  const res = await apiFetch("/v1/settings/numbering", {
    method: "PATCH",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Numbering API error ${res.status}`);
  }
  return res.json();
}

// ── Audit ────────────────────────────────────────────────────────────────────

// ── Treasury Wave 2: Reconciliation Sessions ─────────────────────────────────

export interface TreasuryReconciliationSessionRow {
  id: string;
  orgId: string;
  bankAccountId: string;
  bankStatementId: string;
  status: "open" | "matching" | "closed" | "voided";
  toleranceMinor: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryReconciliationMatchRow {
  id: string;
  orgId: string;
  reconciliationSessionId: string;
  statementLineId: string;
  targetType: string;
  targetId: string;
  matchedAmountMinor: string;
  status: "matched" | "unmatched";
  matchedAt: string;
  unmatchedAt: string | null;
  createdAt: string;
}

export async function fetchTreasuryReconciliationSessions(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}): Promise<{ data: TreasuryReconciliationSessionRow[]; cursor: string | null; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/treasury/reconciliation-sessions${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Reconciliation sessions API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryReconciliationSession(
  id: string,
): Promise<ApiSuccess<TreasuryReconciliationSessionRow>> {
  const res = await apiFetch(`/v1/treasury/reconciliation-sessions/${id}`);
  if (!res.ok) throw new Error(`Reconciliation session API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchTreasuryReconciliationMatches(
  sessionId: string,
): Promise<{ data: TreasuryReconciliationMatchRow[] }> {
  const res = await apiFetch(`/v1/treasury/reconciliation-sessions/${sessionId}/matches`);
  if (!res.ok) throw new Error(`Reconciliation matches API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function openTreasuryReconciliationSession(command: {
  bankAccountId: string;
  bankStatementId: string;
  toleranceMinor?: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/open-reconciliation-session", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Open reconciliation session failed (${res.status})`);
  }
  return res.json();
}

export async function closeReconciliationSession(
  reconciliationSessionId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/close-reconciliation-session", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), reconciliationSessionId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Close reconciliation session failed (${res.status})`);
  }
  return res.json();
}

// ── Treasury Wave 2: Payment Instructions ────────────────────────────────────

export interface TreasuryPaymentInstructionRow {
  id: string;
  orgId: string;
  sourceBankAccountId: string;
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  beneficiaryBankCode: string | null;
  amountMinor: string;
  currencyCode: string;
  paymentMethod: "bank_transfer" | "internal_transfer" | "check" | "direct_debit" | "manual";
  reference: string | null;
  requestedExecutionDate: string;
  status: "pending" | "processing" | "approved" | "rejected" | "cancelled";
  createdByPrincipalId: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchTreasuryPaymentInstructions(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}): Promise<{ data: TreasuryPaymentInstructionRow[]; cursor: string | null; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/treasury/payment-instructions${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Payment instructions API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryPaymentInstruction(
  id: string,
): Promise<ApiSuccess<TreasuryPaymentInstructionRow>> {
  const res = await apiFetch(`/v1/treasury/payment-instructions/${id}`);
  if (!res.ok) throw new Error(`Payment instruction API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function createTreasuryPaymentInstruction(command: {
  sourceBankAccountId: string;
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  beneficiaryBankCode?: string;
  amountMinor: string;
  currencyCode: string;
  paymentMethod: "bank_transfer" | "internal_transfer" | "check" | "direct_debit" | "manual";
  reference?: string;
  requestedExecutionDate: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-payment-instruction", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create payment instruction failed (${res.status})`);
  }
  return res.json();
}

export async function submitTreasuryPaymentInstruction(
  paymentInstructionId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/submit-payment-instruction", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), paymentInstructionId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Submit payment instruction failed (${res.status})`);
  }
  return res.json();
}

export async function approveTreasuryPaymentInstruction(
  paymentInstructionId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/approve-payment-instruction", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), paymentInstructionId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Approve payment instruction failed (${res.status})`);
  }
  return res.json();
}

export async function rejectTreasuryPaymentInstruction(
  paymentInstructionId: string,
  rejectionReason: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/reject-payment-instruction", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), paymentInstructionId, rejectionReason }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Reject payment instruction failed (${res.status})`);
  }
  return res.json();
}

// ── Treasury Wave 2: Payment Batches ─────────────────────────────────────────

export interface TreasuryPaymentBatchRow {
  id: string;
  orgId: string;
  sourceBankAccountId: string;
  description: string | null;
  status: "draft" | "pending_approval" | "approved" | "released" | "failed" | "cancelled";
  totalAmountMinor: string;
  itemCount: number;
  requestedReleaseAt: string | null;
  approvedAt: string | null;
  releasedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchTreasuryPaymentBatches(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}): Promise<{ data: TreasuryPaymentBatchRow[]; cursor: string | null; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/treasury/payment-batches${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Payment batches API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function createTreasuryPaymentBatch(command: {
  sourceBankAccountId: string;
  description?: string;
  paymentInstructionIds: string[];
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-payment-batch", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create payment batch failed (${res.status})`);
  }
  return res.json();
}

export async function requestTreasuryPaymentBatchRelease(
  batchId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/request-payment-batch-release", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), batchId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Request payment batch release failed (${res.status})`);
  }
  return res.json();
}

export async function releaseTreasuryPaymentBatch(
  batchId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/release-payment-batch", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), batchId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Release payment batch failed (${res.status})`);
  }
  return res.json();
}

// ── Treasury Wave 3: Cash Position Snapshot ─────────────────────────────────

export interface TreasuryCashPositionSnapshotRow {
  id: string;
  orgId: string;
  snapshotDate: string;
  asOfAt: string;
  baseCurrencyCode: string;
  status: "draft" | "calculated" | "superseded";
  sourceVersion: string;
  totalBookBalanceMinor: string;
  totalAvailableBalanceMinor: string;
  totalPendingInflowMinor: string;
  totalPendingOutflowMinor: string;
  totalProjectedAvailableMinor: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryCashPositionSnapshotLineRow {
  id: string;
  orgId: string;
  snapshotId: string;
  bankAccountId: string | null;
  currencyCode: string;
  bucketType:
    | "book_balance"
    | "available_balance"
    | "pending_inflow"
    | "pending_outflow"
    | "projected_available_balance";
  amountMinor: string;
  sourceType:
    | "bank_statement"
    | "payment_instruction"
    | "manual_adjustment"
    | "ap_projection"
    | "ar_projection";
  sourceId: string | null;
  lineDescription: string | null;
  createdAt: string;
}

export interface TreasuryCashPositionSnapshotLineageRow {
  id: string;
  orgId: string;
  snapshotId: string;
  snapshotLineId: string;
  liquiditySourceFeedId: string;
  createdAt: string;
}

export async function fetchTreasuryCashPositionSnapshots(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}): Promise<{ data: TreasuryCashPositionSnapshotRow[]; cursor: string | null; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/treasury/cash-position-snapshots${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Cash position snapshots API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryCashPositionSnapshot(
  id: string,
): Promise<ApiSuccess<TreasuryCashPositionSnapshotRow>> {
  const res = await apiFetch(`/v1/treasury/cash-position-snapshots/${id}`);
  if (!res.ok) throw new Error(`Cash position snapshot API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchTreasuryCashPositionSnapshotLines(
  snapshotId: string,
): Promise<{ data: TreasuryCashPositionSnapshotLineRow[] }> {
  const res = await apiFetch(`/v1/treasury/cash-position-snapshots/${snapshotId}/lines`);
  if (!res.ok) throw new Error(`Cash position lines API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryCashPositionSnapshotLineage(
  snapshotId: string,
): Promise<{ data: TreasuryCashPositionSnapshotLineageRow[] }> {
  const res = await apiFetch(`/v1/treasury/cash-position-snapshots/${snapshotId}/lineage`);
  if (!res.ok) throw new Error(`Cash position lineage API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function requestTreasuryCashPositionSnapshot(command: {
  snapshotDate: string;
  asOfAt: string;
  baseCurrencyCode: string;
  sourceVersion: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/request-cash-position-snapshot", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Request cash position snapshot failed (${res.status})`);
  }
  return res.json();
}

// ── Treasury Wave 3.2: Liquidity Forecast ──────────────────────────────────

export interface TreasuryLiquidityScenarioRow {
  id: string;
  orgId: string;
  code: string;
  name: string;
  scenarioType: "base_case" | "optimistic" | "stress" | "custom";
  status: "draft" | "active" | "inactive";
  horizonDays: number;
  assumptionSetVersion: string;
  assumptionsJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryLiquidityForecastRow {
  id: string;
  orgId: string;
  liquidityScenarioId: string;
  cashPositionSnapshotId: string;
  forecastDate: string;
  startDate: string;
  endDate: string;
  bucketGranularity: "daily" | "weekly";
  baseCurrencyCode: string;
  status: "draft" | "calculated" | "superseded";
  sourceVersion: string;
  assumptionSetVersion: string;
  openingLiquidityMinor: string;
  closingLiquidityMinor: string;
  totalExpectedInflowsMinor: string;
  totalExpectedOutflowsMinor: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryLiquidityForecastBucketRow {
  id: string;
  orgId: string;
  liquidityForecastId: string;
  bucketIndex: number;
  bucketStartDate: string;
  bucketEndDate: string;
  expectedInflowsMinor: string;
  expectedOutflowsMinor: string;
  openingBalanceMinor: string;
  closingBalanceMinor: string;
  varianceMinor: string | null;
  createdAt: string;
}

export interface TreasuryLiquidityForecastBucketLineageRow {
  id: string;
  orgId: string;
  liquidityForecastId: string;
  bucketId: string;
  liquiditySourceFeedId: string;
  createdAt: string;
}

export interface TreasuryLiquiditySourceFeedRow {
  id: string;
  orgId: string;
  sourceType: "ap_due_payment" | "ar_expected_receipt" | "manual_adjustment";
  sourceId: string;
  sourceDocumentNumber: string | null;
  bankAccountId: string | null;
  currencyCode: string;
  amountMinor: string;
  dueDate: string;
  direction: "inflow" | "outflow";
  confidenceScore: number | null;
  status: "open" | "consumed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export async function createTreasuryLiquidityScenario(command: {
  code: string;
  name: string;
  scenarioType: "base_case" | "optimistic" | "stress" | "custom";
  horizonDays: number;
  assumptionSetVersion: string;
  assumptionsJson: Record<string, unknown>;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-liquidity-scenario", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create liquidity scenario failed (${res.status})`);
  }
  return res.json();
}

export async function activateTreasuryLiquidityScenario(
  liquidityScenarioId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/activate-liquidity-scenario", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), liquidityScenarioId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Activate liquidity scenario failed (${res.status})`);
  }
  return res.json();
}

export async function fetchTreasuryLiquidityScenarios(): Promise<{ data: TreasuryLiquidityScenarioRow[] }> {
  const res = await apiFetch("/v1/treasury/liquidity-scenarios");
  if (!res.ok) throw new Error(`Liquidity scenarios API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function requestTreasuryLiquidityForecast(command: {
  liquidityScenarioId: string;
  cashPositionSnapshotId: string;
  forecastDate: string;
  startDate: string;
  endDate: string;
  bucketGranularity: "daily" | "weekly";
  baseCurrencyCode: string;
  sourceVersion: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/request-liquidity-forecast", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Request liquidity forecast failed (${res.status})`);
  }
  return res.json();
}

export async function upsertTreasuryLiquiditySourceFeed(command: {
  sourceType: "ap_due_payment" | "ar_expected_receipt" | "manual_adjustment";
  sourceId: string;
  sourceDocumentNumber?: string | null;
  bankAccountId?: string | null;
  currencyCode: string;
  amountMinor: string;
  dueDate: string;
  direction: "inflow" | "outflow";
  confidenceScore?: number | null;
  status?: "open" | "consumed" | "cancelled";
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/upsert-liquidity-source-feed", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Upsert liquidity source feed failed (${res.status})`);
  }
  return res.json();
}

export async function fetchTreasuryLiquiditySourceFeeds(params?: {
  status?: "open" | "consumed" | "cancelled";
  dueDateLte?: string;
}): Promise<{ data: TreasuryLiquiditySourceFeedRow[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.dueDateLte) query.set("dueDateLte", params.dueDateLte);
  const qs = query.toString();
  const res = await apiFetch(`/v1/treasury/liquidity-source-feeds${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Liquidity source feeds API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryLiquidityForecasts(params?: {
  cursor?: string;
  limit?: number;
  status?: "draft" | "calculated" | "superseded";
}): Promise<{ data: TreasuryLiquidityForecastRow[]; cursor: string | null; hasMore: boolean }> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/treasury/liquidity-forecasts${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Liquidity forecasts API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryLiquidityForecast(
  id: string,
): Promise<ApiSuccess<TreasuryLiquidityForecastRow>> {
  const res = await apiFetch(`/v1/treasury/liquidity-forecasts/${id}`);
  if (!res.ok) throw new Error(`Liquidity forecast API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchTreasuryLiquidityForecastBuckets(
  forecastId: string,
): Promise<{ data: TreasuryLiquidityForecastBucketRow[] }> {
  const res = await apiFetch(`/v1/treasury/liquidity-forecasts/${forecastId}/buckets`);
  if (!res.ok) throw new Error(`Liquidity forecast buckets API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryLiquidityForecastLineage(
  forecastId: string,
): Promise<{ data: TreasuryLiquidityForecastBucketLineageRow[] }> {
  const res = await apiFetch(`/v1/treasury/liquidity-forecasts/${forecastId}/lineage`);
  if (!res.ok) throw new Error(`Liquidity forecast lineage API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export interface TreasuryForecastVarianceRow {
  id: string;
  orgId: string;
  liquidityForecastId: string;
  bucketId: string;
  actualInflowsMinor: string;
  actualOutflowsMinor: string;
  actualClosingBalanceMinor: string;
  inflowVarianceMinor: string;
  outflowVarianceMinor: string;
  closingBalanceVarianceMinor: string;
  measuredAt: string;
  createdAt: string;
}

export async function recordTreasuryForecastVariance(command: {
  liquidityForecastId: string;
  bucketId: string;
  actualInflowsMinor: string;
  actualOutflowsMinor: string;
  actualClosingBalanceMinor: string;
  measuredAt: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/record-forecast-variance", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Record forecast variance failed (${res.status})`);
  }
  return res.json();
}

export async function fetchTreasuryForecastVarianceByForecast(
  liquidityForecastId: string,
): Promise<{ data: TreasuryForecastVarianceRow[] }> {
  const res = await apiFetch(`/v1/treasury/liquidity-forecasts/${liquidityForecastId}/variance`);
  if (!res.ok) throw new Error(`Forecast variance API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryForecastVariance(
  id: string,
): Promise<ApiSuccess<TreasuryForecastVarianceRow>> {
  const res = await apiFetch(`/v1/treasury/forecast-variance/${id}`);
  if (!res.ok) throw new Error(`Forecast variance API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export interface AuditLogRow {
  id: string;
  orgId: string;
  actorPrincipalId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  correlationId: string;
  occurredAt: string;
  details: Record<string, unknown> | null;
}

export interface AuditLogListResponse {
  data: AuditLogRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}

/** List audit logs with cursor pagination and optional filters. */
export async function fetchAuditLogs(params?: {
  cursor?: string;
  limit?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  actorPrincipalId?: string;
  from?: string;
  to?: string;
}): Promise<AuditLogListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.entityType) query.set("entityType", params.entityType);
  if (params?.entityId) query.set("entityId", params.entityId);
  if (params?.action) query.set("action", params.action);
  if (params?.actorPrincipalId) query.set("actorPrincipalId", params.actorPrincipalId);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const qs = query.toString();
  const res = await apiFetch(`/v1/audit-logs${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Audit API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Documents (Evidence) ─────────────────────────────────────────────────────

export interface DocumentRow {
  id: string;
  orgId: string;
  objectKey: string;
  mime: string;
  sizeBytes: number;
  originalFileName: string | null;
  uploadedAt: string;
}

export interface DocumentListResponse {
  data: DocumentRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}

/** List documents with cursor pagination. */
export async function fetchDocuments(params?: {
  cursor?: string;
  limit?: number;
}): Promise<DocumentListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  const res = await apiFetch(`/v1/documents${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Documents API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────

/** Resolve capabilities for an entity/principal. */
export async function fetchCapabilities(
  entityKey: string,
  params?: { submittedByPrincipalId?: string },
): Promise<ApiSuccess<CapabilityResult>> {
  const query = new URLSearchParams();
  if (params?.submittedByPrincipalId)
    query.set("submittedByPrincipalId", params.submittedByPrincipalId);

  const qs = query.toString();
  const res = await apiFetch(`/v1/capabilities/${entityKey}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}
