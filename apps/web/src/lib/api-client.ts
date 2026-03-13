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

const ACTIVE_ORG_COOKIE_NAME = "active_org";

let hasReportedMissingActiveOrg = false;

function readBrowserCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookiePair = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));
  if (!cookiePair) return undefined;
  return decodeURIComponent(cookiePair.slice(encodedName.length));
}

async function reportMissingActiveOrgContext(details: {
  location: "server" | "client";
}): Promise<void> {
  if (details.location === "client") {
    if (hasReportedMissingActiveOrg) return;
    hasReportedMissingActiveOrg = true;
  }

  try {
    await fetch("/api/private/auth/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metric: "api_missing_org_header",
        details,
      }),
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // Best-effort telemetry only.
  }
}

/**
 * Get auth headers for API requests.
 * - In Server Components: Reads session token from cookies, sends Authorization: Bearer
 * - In Client Components: Returns minimal headers (browser sends cookies automatically)
 * - In dev mode without session: Sends x-dev-user-email for API bypass
 */
export async function getApiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  const isServer = typeof window === "undefined";
  const isDev = process.env.NODE_ENV !== "production";
  let activeOrgId: string | undefined;

  if (isServer) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value;
    const sessionToken =
      cookieStore.get("neon-auth.session")?.value ??
      cookieStore.get("__Secure-neon-auth.session")?.value;

    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
    } else if (isDev) {
      headers["x-dev-user-email"] = "admin@demo.afenda";
    }
  } else {
    activeOrgId = readBrowserCookie(ACTIVE_ORG_COOKIE_NAME);
  }

  if (!activeOrgId) {
    await reportMissingActiveOrgContext({
      location: isServer ? "server" : "client",
    });
    throw new Error("Missing active organization context. Select an organization and retry.");
  }

  headers["x-org-id"] = activeOrgId;

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
  if (!res.ok)
    throw new Error(`Treasury bank accounts API error ${res.status}: ${await res.text()}`);
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

export async function deactivateTreasuryBankAccount(
  id: string,
): Promise<ApiSuccess<{ id: string }>> {
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
  if (!res.ok)
    throw new Error(`Treasury bank statements API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchTreasuryBankStatement(
  id: string,
): Promise<ApiSuccess<TreasuryBankStatementRow>> {
  const res = await apiFetch(`/v1/treasury/bank-statements/${id}`);
  if (!res.ok)
    throw new Error(`Treasury bank statement API error ${res.status}: ${await res.text()}`);
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
  if (!res.ok)
    throw new Error(`Treasury bank statement lines API error ${res.status}: ${await res.text()}`);
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

// ── Treasury Wave 4-6: In-house Banking, Governance, Integrations ───────────

function extractTreasuryRows<T>(json: unknown): T[] {
  if (!json || typeof json !== "object") return [];

  const outer = json as { data?: unknown };
  if (!outer.data || typeof outer.data !== "object") return [];

  const inner = outer.data as { data?: unknown };
  if (!Array.isArray(inner.data)) return [];
  return inner.data as T[];
}

export async function fetchTreasuryInternalBankAccounts(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/internal-bank-accounts");
  if (!res.ok) {
    throw new Error(`Treasury internal bank accounts API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryIntercompanyTransfers(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/intercompany-transfers");
  if (!res.ok) {
    throw new Error(`Treasury intercompany transfers API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryNettingSessions(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/netting-sessions");
  if (!res.ok) {
    throw new Error(`Treasury netting sessions API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryInternalInterestRates(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/internal-interest-rates");
  if (!res.ok) {
    throw new Error(
      `Treasury internal interest rates API error ${res.status}: ${await res.text()}`,
    );
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryPolicies(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/policies");
  if (!res.ok) {
    throw new Error(`Treasury policies API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryLimits(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/limits");
  if (!res.ok) {
    throw new Error(`Treasury limits API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryLimitBreaches(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/limit-breaches");
  if (!res.ok) {
    throw new Error(`Treasury limit breaches API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryBankConnectors(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/bank-connectors");
  if (!res.ok) {
    throw new Error(`Treasury bank connectors API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryBankConnectorExecutions(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/bank-connector-executions");
  if (!res.ok) {
    throw new Error(
      `Treasury bank connector executions API error ${res.status}: ${await res.text()}`,
    );
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryMarketDataFeeds(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/market-data-feeds");
  if (!res.ok) {
    throw new Error(`Treasury market data feeds API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryMarketDataObservations(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/market-data-observations");
  if (!res.ok) {
    throw new Error(
      `Treasury market data observations API error ${res.status}: ${await res.text()}`,
    );
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryAccountingPolicies(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/accounting-policies");
  if (!res.ok) {
    throw new Error(`Treasury accounting policies API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function fetchTreasuryPostingBridges(): Promise<any[]> {
  const res = await apiFetch("/v1/treasury/posting-bridges");
  if (!res.ok) {
    throw new Error(`Treasury posting bridges API error ${res.status}: ${await res.text()}`);
  }
  return extractTreasuryRows(await res.json());
}

export async function createTreasuryPolicy(command: {
  code: string;
  name: string;
  scopeType: string;
  legalEntityId?: string;
  currencyCode?: string;
  allowOverride?: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-treasury-policy", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok)
    throw new Error(`Create treasury policy failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function activateTreasuryPolicy(
  treasuryPolicyId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/activate-treasury-policy", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), treasuryPolicyId }),
  });
  if (!res.ok) {
    throw new Error(`Activate treasury policy failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function createTreasuryLimit(command: {
  policyId: string;
  code: string;
  scopeType: string;
  legalEntityId?: string;
  currencyCode?: string;
  metric: string;
  thresholdMinor: string;
  hardBlock: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-treasury-limit", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) throw new Error(`Create treasury limit failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function activateTreasuryLimit(
  treasuryLimitId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/activate-treasury-limit", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), treasuryLimitId }),
  });
  if (!res.ok) {
    throw new Error(`Activate treasury limit failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function createBankConnector(command: {
  code: string;
  connectorType: string;
  bankName: string;
  legalEntityId?: string;
  endpointRef?: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-bank-connector", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) throw new Error(`Create bank connector failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function activateBankConnector(
  bankConnectorId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/activate-bank-connector", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), bankConnectorId }),
  });
  if (!res.ok)
    throw new Error(`Activate bank connector failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function requestBankConnectorSync(command: {
  bankConnectorId: string;
  executionType: string;
  requestPayloadRef?: string;
}): Promise<ApiSuccess<{ id: string; executionId: string }>> {
  const res = await apiFetch("/v1/commands/request-bank-connector-sync", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    throw new Error(`Request bank connector sync failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function createMarketDataFeed(command: {
  code: string;
  providerCode: string;
  feedType: string;
  baseCurrencyCode?: string;
  quoteCurrencyCode?: string;
  freshnessMinutes: number;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-market-data-feed", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok)
    throw new Error(`Create market data feed failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function activateMarketDataFeed(
  marketDataFeedId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/activate-market-data-feed", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), marketDataFeedId }),
  });
  if (!res.ok) {
    throw new Error(`Activate market data feed failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function requestMarketDataRefresh(
  marketDataFeedId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/request-market-data-refresh", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), marketDataFeedId }),
  });
  if (!res.ok) {
    throw new Error(`Request market data refresh failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export async function createTreasuryAccountingPolicy(command: {
  policyCode: string;
  name: string;
  scopeType: string;
  debitAccountCode: string;
  creditAccountCode: string;
  effectiveFrom: string;
  effectiveTo?: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-treasury-accounting-policy", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    throw new Error(
      `Create treasury accounting policy failed (${res.status}): ${await res.text()}`,
    );
  }
  return res.json();
}

export async function activateTreasuryAccountingPolicy(
  treasuryAccountingPolicyId: string,
): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/activate-treasury-accounting-policy", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), treasuryAccountingPolicyId }),
  });
  if (!res.ok) {
    throw new Error(
      `Activate treasury accounting policy failed (${res.status}): ${await res.text()}`,
    );
  }
  return res.json();
}

export async function requestTreasuryPosting(command: {
  sourceType: string;
  sourceId: string;
  treasuryAccountingPolicyId: string;
  amountMinor: string;
  currencyCode: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/request-treasury-posting", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok)
    throw new Error(`Request treasury posting failed (${res.status}): ${await res.text()}`);
  return res.json();
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

// ── COMM Workflows ───────────────────────────────────────────────────────────

import type {
  WorkflowStatus,
  WorkflowRunStatus,
  WorkflowTriggerType,
  WorkflowActionType,
  ConditionOperator,
} from "@afenda/contracts";

export interface WorkflowTriggerCondition {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface WorkflowTriggerInput {
  type: WorkflowTriggerType;
  conditions?: WorkflowTriggerCondition[];
}

export interface WorkflowActionInput {
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface WorkflowRow {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  trigger: WorkflowTriggerInput;
  actions: WorkflowActionInput[];
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt: string | null;
  runCount: number;
}

export interface WorkflowRunActionResult {
  actionType: string;
  status: string;
  result?: unknown;
  error?: string;
}

export interface WorkflowRunRow {
  id: string;
  orgId: string;
  workflowId: string;
  status: WorkflowRunStatus;
  triggerEventId: string | null;
  triggerPayload: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  executedActions: WorkflowRunActionResult[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowListResponse {
  data: WorkflowRow[];
  correlationId: string;
}

export interface WorkflowDetailResponse {
  data: WorkflowRow;
  correlationId: string;
}

export interface WorkflowRunListResponse {
  data: WorkflowRunRow[];
  correlationId: string;
}

export interface WorkflowRunDetailResponse {
  data: WorkflowRunRow;
  correlationId: string;
}

export async function fetchWorkflows(params?: {
  status?: WorkflowStatus;
}): Promise<WorkflowListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/workflows${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Workflow API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchWorkflow(id: string): Promise<WorkflowDetailResponse> {
  const res = await apiFetch(`/v1/workflows/${id}`);
  if (!res.ok) throw new Error(`Workflow API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchWorkflowRuns(
  workflowId: string,
  params?: { status?: WorkflowRunStatus },
): Promise<WorkflowRunListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  const qs = query.toString();
  const res = await apiFetch(`/v1/workflows/${workflowId}/runs${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Workflow run API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchWorkflowRun(runId: string): Promise<WorkflowRunDetailResponse> {
  const res = await apiFetch(`/v1/workflow-runs/${runId}`);
  if (!res.ok) throw new Error(`Workflow run API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function createWorkflow(command: {
  idempotencyKey: string;
  name: string;
  description?: string;
  trigger: WorkflowTriggerInput;
  actions: WorkflowActionInput[];
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-workflow", {
    method: "POST",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create workflow failed (${res.status})`);
  }
  return res.json();
}

export async function updateWorkflow(command: {
  idempotencyKey: string;
  workflowId: string;
  name?: string;
  description?: string;
  trigger?: WorkflowTriggerInput;
  actions?: WorkflowActionInput[];
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/update-workflow", {
    method: "POST",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Update workflow failed (${res.status})`);
  }
  return res.json();
}

export async function changeWorkflowStatus(command: {
  idempotencyKey: string;
  workflowId: string;
  status: WorkflowStatus;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/change-workflow-status", {
    method: "POST",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Change workflow status failed (${res.status})`);
  }
  return res.json();
}

export async function deleteWorkflow(command: {
  idempotencyKey: string;
  workflowId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/delete-workflow", {
    method: "POST",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Delete workflow failed (${res.status})`);
  }
  return res.json();
}

export async function executeWorkflow(command: {
  idempotencyKey: string;
  workflowId: string;
  triggerEventId?: string;
  triggerPayload: Record<string, unknown>;
}): Promise<ApiSuccess<{ runId: string }>> {
  const res = await apiFetch("/v1/commands/execute-workflow", {
    method: "POST",
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Execute workflow failed (${res.status})`);
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
  if (!res.ok)
    throw new Error(`Reconciliation sessions API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryReconciliationSession(
  id: string,
): Promise<ApiSuccess<TreasuryReconciliationSessionRow>> {
  const res = await apiFetch(`/v1/treasury/reconciliation-sessions/${id}`);
  if (!res.ok)
    throw new Error(`Reconciliation session API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchTreasuryReconciliationMatches(
  sessionId: string,
): Promise<{ data: TreasuryReconciliationMatchRow[] }> {
  const res = await apiFetch(`/v1/treasury/reconciliation-sessions/${sessionId}/matches`);
  if (!res.ok)
    throw new Error(`Reconciliation matches API error ${res.status}: ${await res.text()}`);
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
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      paymentInstructionId,
      rejectionReason,
    }),
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
  nativeCurrencyCode: string;
  bucketType:
    | "book_balance"
    | "available_balance"
    | "pending_inflow"
    | "pending_outflow"
    | "projected_available_balance";
  amountMinor: string;
  nativeAmountMinor: string;
  normalizedAmountMinor: string;
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
  if (!res.ok)
    throw new Error(`Cash position snapshots API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryCashPositionSnapshot(
  id: string,
): Promise<ApiSuccess<TreasuryCashPositionSnapshotRow>> {
  const res = await apiFetch(`/v1/treasury/cash-position-snapshots/${id}`);
  if (!res.ok)
    throw new Error(`Cash position snapshot API error ${res.status}: ${await res.text()}`);
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
  if (!res.ok)
    throw new Error(`Cash position lineage API error ${res.status}: ${await res.text()}`);
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
    throw new Error(
      body?.error?.message ?? `Request cash position snapshot failed (${res.status})`,
    );
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
  nativeExpectedInflowsMinor: string;
  nativeExpectedOutflowsMinor: string;
  normalizedExpectedInflowsMinor: string;
  normalizedExpectedOutflowsMinor: string;
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

export interface TreasuryFxRateSnapshotRow {
  id: string;
  orgId: string;
  rateDate: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rateScaled: string;
  scale: number;
  providerCode: string;
  sourceVersion: string;
  createdAt: string;
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

export async function fetchTreasuryLiquidityScenarios(): Promise<{
  data: TreasuryLiquidityScenarioRow[];
}> {
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
  if (!res.ok)
    throw new Error(`Liquidity source feeds API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function upsertTreasuryFxRateSnapshot(command: {
  rateDate: string;
  fromCurrencyCode: string;
  toCurrencyCode: string;
  rateScaled: string;
  scale: number;
  providerCode: string;
  sourceVersion: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/upsert-fx-rate-snapshot", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Upsert FX rate snapshot failed (${res.status})`);
  }
  return res.json();
}

export async function fetchTreasuryFxRateSnapshots(params?: {
  rateDate?: string;
  fromCurrencyCode?: string;
  toCurrencyCode?: string;
  sourceVersion?: string;
}): Promise<{ data: TreasuryFxRateSnapshotRow[] }> {
  const query = new URLSearchParams();
  if (params?.rateDate) query.set("rateDate", params.rateDate);
  if (params?.fromCurrencyCode) query.set("fromCurrencyCode", params.fromCurrencyCode);
  if (params?.toCurrencyCode) query.set("toCurrencyCode", params.toCurrencyCode);
  if (params?.sourceVersion) query.set("sourceVersion", params.sourceVersion);
  const qs = query.toString();
  const res = await apiFetch(`/v1/treasury/fx-rate-snapshots${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`FX rate snapshots API error ${res.status}: ${await res.text()}`);
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
  if (!res.ok)
    throw new Error(`Liquidity forecast buckets API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

export async function fetchTreasuryLiquidityForecastLineage(
  forecastId: string,
): Promise<{ data: TreasuryLiquidityForecastBucketLineageRow[] }> {
  const res = await apiFetch(`/v1/treasury/liquidity-forecasts/${forecastId}/lineage`);
  if (!res.ok)
    throw new Error(`Liquidity forecast lineage API error ${res.status}: ${await res.text()}`);
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

// ── COMM: Tasks ────────────────────────────────────────────────────────────

export interface TaskRow {
  id: string;
  orgId: string;
  projectId: string | null;
  parentTaskId: string | null;
  taskNumber: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  taskType: string;
  assigneeId: string | null;
  reporterId: string;
  dueDate: string | null;
  startDate: string | null;
  estimateMinutes: number | null;
  actualMinutes: number | null;
  completedAt: string | null;
  completedByPrincipalId: string | null;
  sortOrder: number;
  contextEntityType: string | null;
  contextEntityId: string | null;
  slaBreachAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResponse {
  data: TaskRow[];
  cursor?: string | null;
  hasMore?: boolean;
  correlationId: string;
}

export interface TaskChecklistItemRow {
  id: string;
  orgId: string;
  taskId: string;
  text: string;
  isChecked: boolean;
  checkedAt: string | null;
  checkedByPrincipalId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTimeEntryRow {
  id: string;
  orgId: string;
  taskId: string;
  principalId: string;
  minutes: number;
  entryDate: string;
  description: string | null;
  createdAt: string;
}

export interface CommCommentRow {
  id: string;
  orgId: string;
  entityType:
    | "task"
    | "project"
    | "approval_request"
    | "document"
    | "board_meeting"
    | "announcement";
  entityId: string;
  parentCommentId: string | null;
  authorPrincipalId: string;
  body: string;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommChatterMessageRow {
  id: string;
  orgId: string;
  entityType: "task" | "project" | "document";
  entityId: string;
  parentMessageId: string | null;
  authorPrincipalId: string;
  body: string;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommLabelRow {
  id: string;
  orgId: string;
  name: string;
  color: string;
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommSavedViewRow {
  id: string;
  orgId: string;
  principalId: string | null;
  entityType:
    | "task"
    | "project"
    | "approval_request"
    | "board_meeting"
    | "announcement"
    | "document"
    | "inbox_item";
  name: string;
  filters: Record<string, unknown>;
  sortBy: unknown[];
  columns: unknown[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommSubscriptionRow {
  id: string;
  orgId: string;
  principalId: string;
  entityType:
    | "task"
    | "project"
    | "approval_request"
    | "document"
    | "board_meeting"
    | "announcement";
  entityId: string;
  createdAt: string;
}

export interface CommInboxItemRow {
  id: string;
  orgId: string;
  principalId: string;
  eventType: string;
  entityType:
    | "task"
    | "project"
    | "approval_request"
    | "document"
    | "board_meeting"
    | "announcement";
  entityId: string;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface CommNotificationPreferenceRow {
  id: string;
  orgId: string;
  principalId: string;
  eventType: string;
  channel: "in_app" | "email";
  enabled: boolean;
  mutedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

/** List tasks with cursor pagination. */
export async function fetchTasks(params?: {
  cursor?: string;
  limit?: number;
  status?: string | string[];
  assigneeId?: string;
  projectId?: string;
}): Promise<TaskListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));

  // Handle status as array or string
  if (params?.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((s) => query.append("status", s));
  }

  if (params?.assigneeId) query.set("assigneeId", params.assigneeId);
  if (params?.projectId) query.set("projectId", params.projectId);

  const qs = query.toString();
  const res = await apiFetch(`/v1/tasks${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Tasks API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get a single task by ID. */
export async function fetchTask(id: string): Promise<ApiSuccess<TaskRow>> {
  const res = await apiFetch(`/v1/tasks/${id}`);
  if (!res.ok) throw new Error(`Task API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get checklist items for a task. */
export async function fetchTaskChecklist(id: string): Promise<ApiSuccess<TaskChecklistItemRow[]>> {
  const res = await apiFetch(`/v1/tasks/${id}/checklist`);
  if (!res.ok) throw new Error(`Task checklist API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get time entries for a task. */
export async function fetchTaskTimeEntries(id: string): Promise<ApiSuccess<TaskTimeEntryRow[]>> {
  const res = await apiFetch(`/v1/tasks/${id}/time-entries`);
  if (!res.ok) throw new Error(`Task time entries API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List comments for an entity. */
export async function fetchComments(params: {
  entityType: CommCommentRow["entityType"];
  entityId: string;
  limit?: number;
}): Promise<ApiSuccess<CommCommentRow[]>> {
  const query = new URLSearchParams({
    entityType: params.entityType,
    entityId: params.entityId,
  });
  if (params.limit) query.set("limit", String(params.limit));

  const res = await apiFetch(`/v1/comments?${query.toString()}`);
  if (!res.ok) throw new Error(`Comments API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Add a comment to an entity. */
export async function addComment(command: {
  entityType: CommCommentRow["entityType"];
  entityId: string;
  body: string;
  parentCommentId?: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/add-comment", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Add comment failed (${res.status})`);
  }
  return res.json();
}

/** List chatter messages for a supported entity context. */
export async function fetchChatterMessages(params: {
  entityType: CommChatterMessageRow["entityType"];
  entityId: string;
  limit?: number;
}): Promise<ApiSuccess<CommChatterMessageRow[]>> {
  const query = new URLSearchParams({
    entityType: params.entityType,
    entityId: params.entityId,
  });
  if (params.limit) query.set("limit", String(params.limit));

  const res = await apiFetch(`/v1/chatter/messages?${query.toString()}`);
  if (!res.ok) throw new Error(`Chatter messages API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Post a chatter message into an entity context thread. */
export async function postChatterMessage(command: {
  entityType: CommChatterMessageRow["entityType"];
  entityId: string;
  body: string;
  parentMessageId?: string;
}): Promise<ApiSuccess<{ messageId: string }>> {
  const res = await apiFetch("/v1/commands/chatter/post-message", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Post chatter message failed (${res.status})`);
  }
  return res.json();
}

/** Edit an existing comment. */
export async function editComment(command: {
  commentId: string;
  body: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/edit-comment", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Edit comment failed (${res.status})`);
  }
  return res.json();
}

/** Delete a comment. */
export async function deleteComment(command: {
  commentId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/delete-comment", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Delete comment failed (${res.status})`);
  }
  return res.json();
}

/** List org labels or labels assigned to an entity. */
export async function fetchLabels(params?: {
  entityType?: CommCommentRow["entityType"];
  entityId?: string;
}): Promise<ApiSuccess<CommLabelRow[]>> {
  const path =
    params?.entityType && params?.entityId
      ? `/v1/labels/entity?entityType=${encodeURIComponent(params.entityType)}&entityId=${encodeURIComponent(params.entityId)}`
      : "/v1/labels";

  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`Labels API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Create a new label. */
export async function createLabel(command: {
  name: string;
  color: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-label", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create label failed (${res.status})`);
  }
  return res.json();
}

/** Update an existing label. */
export async function updateLabel(command: {
  labelId: string;
  name?: string;
  color?: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/update-label", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Update label failed (${res.status})`);
  }
  return res.json();
}

/** Delete a label. */
export async function deleteLabel(command: {
  labelId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/delete-label", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Delete label failed (${res.status})`);
  }
  return res.json();
}

/** Assign a label to an entity. */
export async function assignLabel(command: {
  labelId: string;
  entityType: CommCommentRow["entityType"];
  entityId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/assign-label", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Assign label failed (${res.status})`);
  }
  return res.json();
}

/** Unassign a label from an entity. */
export async function unassignLabel(command: {
  labelId: string;
  entityType: CommCommentRow["entityType"];
  entityId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/unassign-label", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Unassign label failed (${res.status})`);
  }
  return res.json();
}

/** List saved views visible to the current principal for an entity type. */
export async function fetchSavedViews(params: {
  entityType: CommSavedViewRow["entityType"];
}): Promise<ApiSuccess<CommSavedViewRow[]>> {
  const query = new URLSearchParams({ entityType: params.entityType });
  const res = await apiFetch(`/v1/saved-views?${query.toString()}`);
  if (!res.ok) throw new Error(`Saved views API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Save a new view (principal scoped by default, org shared when isOrgShared=true). */
export async function saveView(command: {
  entityType: CommSavedViewRow["entityType"];
  name: string;
  filters: Record<string, unknown>;
  sortBy: unknown[];
  columns: unknown[];
  isDefault?: boolean;
  isOrgShared?: boolean;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/save-view", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Save view failed (${res.status})`);
  }
  return res.json();
}

/** Update an existing saved view. */
export async function updateSavedView(command: {
  viewId: string;
  name?: string;
  filters?: Record<string, unknown>;
  sortBy?: unknown[];
  columns?: unknown[];
  isDefault?: boolean;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/update-saved-view", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Update saved view failed (${res.status})`);
  }
  return res.json();
}

/** Delete a saved view. */
export async function deleteSavedView(command: {
  viewId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/delete-saved-view", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Delete saved view failed (${res.status})`);
  }
  return res.json();
}

/** List subscriptions for an entity. */
export async function fetchSubscriptions(params: {
  entityType: CommSubscriptionRow["entityType"];
  entityId: string;
}): Promise<ApiSuccess<CommSubscriptionRow[]>> {
  const query = new URLSearchParams({ entityType: params.entityType, entityId: params.entityId });
  const res = await apiFetch(`/v1/subscriptions?${query.toString()}`);
  if (!res.ok) throw new Error(`Subscriptions API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Subscribe current principal to entity updates. */
export async function subscribeEntity(command: {
  entityType: CommSubscriptionRow["entityType"];
  entityId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/subscribe-entity", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Subscribe failed (${res.status})`);
  }
  return res.json();
}

/** Unsubscribe current principal from entity updates. */
export async function unsubscribeEntity(command: {
  entityType: CommSubscriptionRow["entityType"];
  entityId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/unsubscribe-entity", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Unsubscribe failed (${res.status})`);
  }
  return res.json();
}

/** List inbox items for current principal. */
export async function fetchInboxItems(params?: {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}): Promise<ApiSuccess<CommInboxItemRow[]>> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.cursor) query.set("cursor", params.cursor);
  if (typeof params?.unreadOnly === "boolean") query.set("unreadOnly", String(params.unreadOnly));

  const qs = query.toString();
  const res = await apiFetch(`/v1/inbox${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Inbox API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get unread inbox count for current principal. */
export async function fetchInboxUnreadCount(): Promise<ApiSuccess<{ count: number }>> {
  const res = await apiFetch("/v1/inbox/unread");
  if (!res.ok) throw new Error(`Inbox unread API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Mark one inbox item as read. */
export async function markInboxItemRead(command: {
  itemId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/mark-inbox-item-read", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Mark inbox item read failed (${res.status})`);
  }
  return res.json();
}

/** Mark all inbox items as read for current principal. */
export async function markAllInboxRead(): Promise<ApiSuccess<{ count: number }>> {
  const res = await apiFetch("/v1/commands/mark-all-inbox-read", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Mark all inbox read failed (${res.status})`);
  }
  return res.json();
}

/** List notification preferences for current principal. */
export async function fetchNotificationPreferences(): Promise<
  ApiSuccess<CommNotificationPreferenceRow[]>
> {
  const res = await apiFetch("/v1/inbox/preferences");
  if (!res.ok)
    throw new Error(`Notification preferences API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Upsert a notification preference row. */
export async function upsertNotificationPreference(command: {
  eventType: string;
  channel: "in_app" | "email";
  enabled: boolean;
  mutedUntil?: string | null;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/upsert-notification-preference", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(
      body?.error?.message ?? `Upsert notification preference failed (${res.status})`,
    );
  }
  return res.json();
}

/** Add checklist items to a task. */
export async function addTaskChecklist(command: {
  taskId: string;
  items: string[];
}): Promise<ApiSuccess<{ taskId?: string; addedCount?: number }>> {
  const res = await apiFetch("/v1/commands/add-task-checklist", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Add task checklist failed (${res.status})`);
  }
  return res.json();
}

/** Toggle a checklist item on a task. */
export async function toggleTaskChecklistItem(command: {
  taskId: string;
  checklistItemId: string;
  checked: boolean;
}): Promise<ApiSuccess<{ checklistItemId?: string; checked?: boolean }>> {
  const res = await apiFetch("/v1/commands/toggle-task-checklist-item", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Toggle checklist item failed (${res.status})`);
  }
  return res.json();
}

/** Log a time entry for a task. */
export async function logTaskTimeEntry(command: {
  taskId: string;
  minutes: number;
  entryDate: string;
  description?: string;
}): Promise<ApiSuccess<{ timeEntryId: string }>> {
  const res = await apiFetch("/v1/commands/log-task-time-entry", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Log task time entry failed (${res.status})`);
  }
  return res.json();
}

export interface ProjectRow {
  id: string;
  orgId: string;
  projectNumber: string;
  name: string;
  description: string | null;
  status: string;
  visibility: string;
  ownerId: string;
  startDate: string | null;
  targetDate: string | null;
  completedAt: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListResponse {
  data: ProjectRow[];
  correlationId: string;
}

export interface ProjectMemberRow {
  id: string;
  orgId: string;
  projectId: string;
  principalId: string;
  role: string;
  joinedAt: string;
}

export interface ProjectMilestoneRow {
  id: string;
  orgId: string;
  projectId: string;
  milestoneNumber: string;
  name: string;
  description: string | null;
  status: string;
  targetDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPhaseRow {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  description: string | null;
  sequenceOrder: number;
  startDate: string | null;
  targetEndDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** List projects. */
export async function fetchProjects(params?: {
  limit?: number;
  status?: string | string[];
  ownerId?: string;
  visibility?: string;
}): Promise<ProjectListResponse> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));

  if (params?.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((status) => query.append("status", status));
  }

  if (params?.ownerId) query.set("ownerId", params.ownerId);
  if (params?.visibility) query.set("visibility", params.visibility);

  const qs = query.toString();
  const res = await apiFetch(`/v1/projects${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Projects API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get a single project by ID. */
export async function fetchProject(id: string): Promise<ApiSuccess<ProjectRow>> {
  const res = await apiFetch(`/v1/projects/${id}`);
  if (!res.ok) throw new Error(`Project API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List tasks for a single project. */
export async function fetchProjectTasks(
  id: string,
  params?: {
    limit?: number;
    status?: string | string[];
    assigneeId?: string;
  },
): Promise<ApiSuccess<TaskRow[]>> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));

  if (params?.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    statuses.forEach((status) => query.append("status", status));
  }

  if (params?.assigneeId) query.set("assigneeId", params.assigneeId);

  const qs = query.toString();
  const res = await apiFetch(`/v1/projects/${id}/tasks${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Project tasks API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List project members. */
export async function fetchProjectMembers(id: string): Promise<ApiSuccess<ProjectMemberRow[]>> {
  const res = await apiFetch(`/v1/projects/${id}/members`);
  if (!res.ok) throw new Error(`Project members API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List project milestones. */
export async function fetchProjectMilestones(
  id: string,
): Promise<ApiSuccess<ProjectMilestoneRow[]>> {
  const res = await apiFetch(`/v1/projects/${id}/milestones`);
  if (!res.ok) throw new Error(`Project milestones API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List project phases. */
export async function fetchProjectPhases(id: string): Promise<ApiSuccess<ProjectPhaseRow[]>> {
  const res = await apiFetch(`/v1/projects/${id}/phases`);
  if (!res.ok) throw new Error(`Project phases API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Create a new project. */
export async function createProject(command: {
  name: string;
  description?: string | null;
  visibility?: string;
  startDate?: string | null;
  targetDate?: string | null;
  color?: string | null;
}): Promise<ApiSuccess<{ id: string; projectNumber: string }>> {
  const res = await apiFetch("/v1/commands/create-project", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create project failed (${res.status})`);
  }
  return res.json();
}

/** Update project details. */
export async function updateProject(command: {
  projectId: string;
  name?: string;
  description?: string | null;
  visibility?: string;
  startDate?: string | null;
  targetDate?: string | null;
  color?: string | null;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/update-project", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Update project failed (${res.status})`);
  }
  return res.json();
}

/** Transition a project status. */
export async function transitionProjectStatus(command: {
  projectId: string;
  toStatus: string;
  reason?: string;
}): Promise<ApiSuccess<{ id: string; status: string }>> {
  const res = await apiFetch("/v1/commands/transition-project-status", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Transition project status failed (${res.status})`);
  }
  return res.json();
}

/** Archive a project. */
export async function archiveProject(command: {
  projectId: string;
  reason?: string;
}): Promise<ApiSuccess<{ id: string; status: string }>> {
  const res = await apiFetch("/v1/commands/archive-project", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Archive project failed (${res.status})`);
  }
  return res.json();
}

/** Add a member to a project. */
export async function addProjectMember(command: {
  projectId: string;
  principalId: string;
  role: string;
}): Promise<ApiSuccess<{ id: string; principalId: string }>> {
  const res = await apiFetch("/v1/commands/add-project-member", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Add project member failed (${res.status})`);
  }
  return res.json();
}

/** Remove a member from a project. */
export async function removeProjectMember(command: {
  projectId: string;
  principalId: string;
}): Promise<ApiSuccess<{ id: string; principalId: string }>> {
  const res = await apiFetch("/v1/commands/remove-project-member", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Remove project member failed (${res.status})`);
  }
  return res.json();
}

/** Create a project milestone. */
export async function createProjectMilestone(command: {
  projectId: string;
  name: string;
  description?: string;
  targetDate: string;
}): Promise<ApiSuccess<{ id: string; milestoneNumber: string }>> {
  const res = await apiFetch("/v1/commands/create-project-milestone", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create project milestone failed (${res.status})`);
  }
  return res.json();
}

/** Mark a milestone complete. */
export async function completeProjectMilestone(
  milestoneId: string,
): Promise<ApiSuccess<{ id: string; status: string }>> {
  const res = await apiFetch("/v1/commands/complete-project-milestone", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), milestoneId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Complete project milestone failed (${res.status})`);
  }
  return res.json();
}

/** Create a new task. */
export async function createTask(command: {
  title: string;
  description?: string | null;
  priority?: string;
  projectId?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-task", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create task failed (${res.status})`);
  }
  return res.json();
}

/** Assign a task to a user. */
export async function assignTask(command: {
  taskId: string;
  assigneeId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/assign-task", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Assign task failed (${res.status})`);
  }
  return res.json();
}

/** Transition task status. */
export async function transitionTaskStatus(command: {
  taskId: string;
  toStatus: string;
  reason?: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/transition-task-status", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Transition task status failed (${res.status})`);
  }
  return res.json();
}

/** Bulk assign multiple tasks. */
export async function bulkAssignTasks(command: {
  taskIds: string[];
  assigneeId: string;
}): Promise<ApiSuccess<{ processedCount: number }>> {
  const res = await apiFetch("/v1/commands/bulk-assign-tasks", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Bulk assign failed (${res.status})`);
  }
  return res.json();
}

/** Bulk transition multiple tasks to new status. */
export async function bulkTransitionTaskStatus(command: {
  taskIds: string[];
  toStatus: string;
  reason?: string;
}): Promise<ApiSuccess<{ processedCount: number }>> {
  const res = await apiFetch("/v1/commands/bulk-transition-task-status", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Bulk transition failed (${res.status})`);
  }
  return res.json();
}

// ── Treasury: Wave 3.5 — AP Due Payment Projections ──────────────────────────

export interface ApDuePaymentProjectionRow {
  id: string;
  orgId: string;
  sourcePayableId: string;
  supplierId: string;
  supplierName: string;
  paymentTermCode: string | null;
  dueDate: string;
  expectedPaymentDate: string;
  currencyCode: string;
  grossAmountMinor: string;
  openAmountMinor: string;
  paymentMethod: string | null;
  status: string;
  sourceVersion: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchApDuePaymentProjections(params?: {
  status?: string;
  dueDateLte?: string;
  supplierId?: string;
}): Promise<{ data: ApDuePaymentProjectionRow[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.dueDateLte) query.set("dueDateLte", params.dueDateLte);
  if (params?.supplierId) query.set("supplierId", params.supplierId);
  const qs = query.toString();
  const res = await apiFetch(`/v1/treasury/ap-due-payment-projections${qs ? `?${qs}` : ""}`);
  if (!res.ok)
    throw new Error(`AP due payment projections API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
}

// ── Treasury: Wave 3.5 — AR Expected Receipt Projections ─────────────────────

export interface ArExpectedReceiptProjectionRow {
  id: string;
  orgId: string;
  sourceReceivableId: string;
  customerId: string;
  customerName: string;
  dueDate: string;
  expectedReceiptDate: string;
  currencyCode: string;
  grossAmountMinor: string;
  openAmountMinor: string;
  receiptMethod: string | null;
  status: string;
  sourceVersion: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchArExpectedReceiptProjections(params?: {
  status?: string;
  dueDateLte?: string;
  customerId?: string;
}): Promise<{ data: ArExpectedReceiptProjectionRow[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.dueDateLte) query.set("dueDateLte", params.dueDateLte);
  if (params?.customerId) query.set("customerId", params.customerId);
  const qs = query.toString();
  const res = await apiFetch(`/v1/treasury/ar-expected-receipt-projections${qs ? `?${qs}` : ""}`);
  if (!res.ok)
    throw new Error(`AR expected receipt projections API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data;
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

// ── COMM: Approvals ──────────────────────────────────────────────────────────

export interface ApprovalRequestRow {
  id: string;
  orgId: string;
  approvalNumber: string;
  title: string;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  requestedByPrincipalId: string;
  status: string;
  urgency: string;
  currentStepIndex: number;
  dueDate: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStepRow {
  id: string;
  approvalRequestId: string;
  stepIndex: number;
  assigneeId: string;
  delegatedToId: string | null;
  status: string;
  comment: string | null;
  actedAt: string | null;
  createdAt: string;
}

export interface ApprovalPolicyRow {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  entityType: string;
  conditions: unknown;
  steps: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStatusHistoryRow {
  id: string;
  approvalRequestId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByPrincipalId: string | null;
  comment: string | null;
  occurredAt: string;
}

export interface ApprovalListResponse {
  data: ApprovalRequestRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}

export interface ApprovalPoliciesListResponse {
  data: ApprovalPolicyRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}

/** List approval requests (all) with optional filters. */
export async function fetchApprovals(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
  requestedByMe?: boolean;
  sourceEntityType?: string;
}): Promise<ApprovalListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  if (params?.requestedByMe) query.set("requestedByMe", "true");
  if (params?.sourceEntityType) query.set("sourceEntityType", params.sourceEntityType);
  const qs = query.toString();
  const res = await apiFetch(`/v1/approvals${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Approvals API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get a single approval request by ID (includes steps + history). */
export async function fetchApproval(id: string): Promise<
  ApiSuccess<{
    request: ApprovalRequestRow;
    steps: ApprovalStepRow[];
    history: ApprovalStatusHistoryRow[];
  }>
> {
  const res = await apiFetch(`/v1/approvals/${id}`);
  if (!res.ok) throw new Error(`Approval API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List approvals pending the current principal's action. */
export async function fetchPendingApprovals(params?: {
  cursor?: string;
  limit?: number;
}): Promise<ApprovalListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  const res = await apiFetch(`/v1/approvals/pending${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Pending approvals API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List approval policies. */
export async function fetchApprovalPolicies(params?: {
  cursor?: string;
  limit?: number;
}): Promise<ApprovalPoliciesListResponse> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  const res = await apiFetch(`/v1/approvals/policies${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Approval policies API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Create a new approval request. */
export async function createApprovalRequest(command: {
  title: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  urgency?: string;
  dueDate?: string;
  steps: { assigneeId: string }[];
}): Promise<ApiSuccess<{ id: string; approvalNumber: string }>> {
  const res = await apiFetch("/v1/commands/create-approval-request", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create approval request failed (${res.status})`);
  }
  return res.json();
}

/** Approve a step. */
export async function approveStep(command: {
  approvalRequestId: string;
  stepId: string;
  comment?: string;
}): Promise<ApiSuccess<{ approvalRequestId: string }>> {
  const res = await apiFetch("/v1/commands/approve-step", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Approve step failed (${res.status})`);
  }
  return res.json();
}

/** Reject a step. */
export async function rejectStep(command: {
  approvalRequestId: string;
  stepId: string;
  comment: string;
}): Promise<ApiSuccess<{ approvalRequestId: string }>> {
  const res = await apiFetch("/v1/commands/reject-step", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Reject step failed (${res.status})`);
  }
  return res.json();
}

/** Delegate a step to another principal. */
export async function delegateStep(command: {
  approvalRequestId: string;
  stepId: string;
  delegateToPrincipalId: string;
  comment?: string;
}): Promise<ApiSuccess<{ approvalRequestId: string }>> {
  const res = await apiFetch("/v1/commands/delegate-step", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Delegate step failed (${res.status})`);
  }
  return res.json();
}

/** Escalate an approval. */
export async function escalateApproval(command: {
  approvalRequestId: string;
  comment?: string;
}): Promise<ApiSuccess<{ approvalRequestId: string }>> {
  const res = await apiFetch("/v1/commands/escalate-approval", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Escalate approval failed (${res.status})`);
  }
  return res.json();
}

/** Withdraw an approval. */
export async function withdrawApproval(command: {
  approvalRequestId: string;
  comment?: string;
}): Promise<ApiSuccess<{ approvalRequestId: string }>> {
  const res = await apiFetch("/v1/commands/withdraw-approval", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Withdraw approval failed (${res.status})`);
  }
  return res.json();
}

/** Create an approval policy. */
export async function createApprovalPolicy(command: {
  name: string;
  description?: string;
  entityType: string;
  conditions: Record<string, unknown>;
  steps: { assigneeId: string }[];
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/create-approval-policy", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create approval policy failed (${res.status})`);
  }
  return res.json();
}

// ── Announcements ─────────────────────────────────────────────────────────────

export interface AnnouncementRow {
  id: string;
  orgId: string;
  announcementNumber: string;
  title: string;
  body: string;
  status: string;
  audienceType: string;
  audienceIds: string[];
  scheduledAt: string | null;
  publishedAt: string | null;
  publishedByPrincipalId: string | null;
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementReadRow {
  id: string;
  orgId: string;
  announcementId: string;
  principalId: string;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface AnnouncementAudienceOptions {
  teams: Array<{ id: string; label: string }>;
  roles: Array<{ id: string; label: string }>;
}

export interface AnnouncementAckSummary {
  announcementId: string;
  targetedCount: number;
  acknowledgedCount: number;
  pendingCount: number;
  progressPercent: number;
}

export interface AnnouncementMyRead {
  acknowledged: boolean;
  readAt: string | null;
  readId: string | null;
}

/** List announcements with cursor pagination. */
export async function fetchAnnouncements(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
  myAnnouncements?: boolean;
}): Promise<{
  data: AnnouncementRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  if (params?.myAnnouncements) query.set("myAnnouncements", String(params.myAnnouncements));

  const qs = query.toString();
  const res = await apiFetch(`/v1/announcements${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get a single announcement by ID. */
export async function fetchAnnouncement(id: string): Promise<ApiSuccess<AnnouncementRow>> {
  const res = await apiFetch(`/v1/announcements/${id}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List reads for an announcement. */
export async function fetchAnnouncementReads(
  announcementId: string,
): Promise<ApiSuccess<{ data: AnnouncementReadRow[] }>> {
  const res = await apiFetch(`/v1/announcements/${announcementId}/reads`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get acknowledgement summary for an announcement. */
export async function fetchAnnouncementAckSummary(
  announcementId: string,
): Promise<ApiSuccess<AnnouncementAckSummary>> {
  const res = await apiFetch(`/v1/announcements/${announcementId}/ack-summary`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Get acknowledgement state for the current principal. */
export async function fetchAnnouncementMyRead(
  announcementId: string,
): Promise<ApiSuccess<AnnouncementMyRead>> {
  const res = await apiFetch(`/v1/announcements/${announcementId}/my-read`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** List available announcement audience targets for team/role selection. */
export async function fetchAnnouncementAudienceOptions(): Promise<
  ApiSuccess<AnnouncementAudienceOptions>
> {
  const res = await apiFetch("/v1/announcement-audience-options");
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Create a new announcement. */
export async function createAnnouncement(command: {
  title: string;
  body: string;
  audienceType: string;
  audienceIds?: string[];
  scheduledAt?: string;
}): Promise<ApiSuccess<{ id: string; announcementNumber: string }>> {
  const res = await apiFetch("/v1/commands/create-announcement", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create announcement failed (${res.status})`);
  }
  return res.json();
}

/** Publish an announcement. */
export async function publishAnnouncement(command: {
  announcementId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/publish-announcement", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Publish announcement failed (${res.status})`);
  }
  return res.json();
}

/** Schedule an announcement. */
export async function scheduleAnnouncement(command: {
  announcementId: string;
  scheduledAt: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/schedule-announcement", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Schedule announcement failed (${res.status})`);
  }
  return res.json();
}

/** Archive an announcement. */
export async function archiveAnnouncement(command: {
  announcementId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/archive-announcement", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Archive announcement failed (${res.status})`);
  }
  return res.json();
}

/** Acknowledge an announcement. */
export async function acknowledgeAnnouncement(command: {
  announcementId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/acknowledge-announcement", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Acknowledge announcement failed (${res.status})`);
  }
  return res.json();
}

// ── Docs ──────────────────────────────────────────────────────────────────────

export interface CommDocumentRow {
  id: string;
  orgId: string;
  documentNumber: string;
  title: string;
  body: string;
  status: string;
  documentType: "page" | "wiki" | "sop" | "template" | "policy";
  visibility: "org" | "team" | "private";
  slug: string | null;
  parentDocId: string | null;
  publishedAt: string | null;
  publishedByPrincipalId: string | null;
  createdByPrincipalId: string;
  lastEditedByPrincipalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommDocumentVersionRow {
  id: string;
  orgId: string;
  documentId: string;
  versionNumber: number;
  title: string;
  body: string;
  createdByPrincipalId: string;
  createdAt: string;
}

export async function fetchCommDocuments(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
  documentType?: "page" | "wiki" | "sop" | "template" | "policy";
}): Promise<{
  data: CommDocumentRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);
  if (params?.documentType) query.set("documentType", params.documentType);

  const qs = query.toString();
  const res = await apiFetch(`/v1/comm-documents${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    data: { data: CommDocumentRow[]; cursor: string | null; hasMore: boolean };
    correlationId: string;
  };
  return {
    data: json.data.data,
    cursor: json.data.cursor,
    hasMore: json.data.hasMore,
    correlationId: json.correlationId,
  };
}

export async function fetchCommDocument(id: string): Promise<ApiSuccess<CommDocumentRow>> {
  const res = await apiFetch(`/v1/comm-documents/${id}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchCommDocumentBySlug(slug: string): Promise<ApiSuccess<CommDocumentRow>> {
  const res = await apiFetch(`/v1/comm-documents/by-slug/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchCommDocumentChildren(
  id: string,
): Promise<ApiSuccess<{ data: CommDocumentRow[] }>> {
  const res = await apiFetch(`/v1/comm-documents/${id}/children`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchCommDocumentBreadcrumb(
  id: string,
): Promise<ApiSuccess<{ data: CommDocumentRow[] }>> {
  const res = await apiFetch(`/v1/comm-documents/${id}/breadcrumb`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchCommDocumentHistory(
  id: string,
): Promise<ApiSuccess<{ data: CommDocumentVersionRow[] }>> {
  const res = await apiFetch(`/v1/comm-documents/${id}/history`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function createCommDocument(command: {
  title: string;
  body: string;
  documentType?: "page" | "wiki" | "sop" | "template" | "policy";
  visibility?: "org" | "team" | "private";
  slug?: string;
  parentDocId?: string;
}): Promise<ApiSuccess<{ id: string; documentNumber?: string }>> {
  const res = await apiFetch("/v1/commands/comm-documents/create", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create document failed (${res.status})`);
  }
  return res.json();
}

export async function updateCommDocument(command: {
  documentId: string;
  title: string;
  body: string;
  documentType?: "page" | "wiki" | "sop" | "template" | "policy";
  visibility?: "org" | "team" | "private";
  slug?: string;
  parentDocId?: string | null;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-documents/update", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Update document failed (${res.status})`);
  }
  return res.json();
}

export async function publishCommDocument(command: {
  documentId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-documents/publish", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Publish document failed (${res.status})`);
  }
  return res.json();
}

export async function archiveCommDocument(command: {
  documentId: string;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-documents/archive", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Archive document failed (${res.status})`);
  }
  return res.json();
}

// ─── Boardroom ────────────────────────────────────────────────────────────────

export interface BoardMeetingRow {
  id: string;
  orgId: string;
  meetingNumber: string;
  title: string;
  description: string | null;
  status: string;
  scheduledAt: string | null;
  duration: number;
  location: string | null;
  chairId: string;
  secretaryId: string | null;
  quorumRequired: number;
  startedAt: string | null;
  adjournedAt: string | null;
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchBoardMeetings(params?: {
  cursor?: string;
  limit?: number;
  status?: string;
}): Promise<{
  data: BoardMeetingRow[];
  cursor: string | null;
  hasMore: boolean;
  correlationId: string;
}> {
  const query = new URLSearchParams();
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.status) query.set("status", params.status);

  const qs = query.toString();
  const res = await apiFetch(`/v1/comm-board-meetings${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    data: { data: BoardMeetingRow[]; cursor: string | null; hasMore: boolean };
    correlationId: string;
  };
  return {
    data: json.data.data,
    cursor: json.data.cursor,
    hasMore: json.data.hasMore,
    correlationId: json.correlationId,
  };
}

export async function fetchBoardMeeting(id: string): Promise<ApiSuccess<BoardMeetingRow>> {
  const res = await apiFetch(`/v1/comm-board-meetings/${id}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function createBoardMeeting(command: {
  title: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  chairId: string;
  secretaryId?: string;
  quorumRequired?: number;
}): Promise<ApiSuccess<{ id: string; meetingNumber?: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/create", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create meeting failed (${res.status})`);
  }
  return res.json();
}

export async function updateBoardMeeting(command: {
  meetingId: string;
  title?: string;
  description?: string | null;
  scheduledAt?: string | null;
  duration?: number;
  location?: string | null;
  chairId?: string;
  secretaryId?: string | null;
  quorumRequired?: number;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/update", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Update meeting failed (${res.status})`);
  }
  return res.json();
}

export interface BoardAgendaItemRow {
  id: string;
  orgId: string;
  meetingId: string;
  sortOrder: number;
  title: string;
  description: string | null;
  presenterId: string | null;
  durationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchBoardMeetingAgendaItems(
  meetingId: string,
): Promise<ApiSuccess<BoardAgendaItemRow[]>> {
  const res = await apiFetch(`/v1/comm-board-meetings/${meetingId}/agenda-items`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function addBoardAgendaItem(command: {
  meetingId: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
  presenterId?: string | null;
  durationMinutes?: number | null;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/agenda-items/add", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Add agenda item failed (${res.status})`);
  }
  return res.json();
}

export interface BoardMeetingAttendeeRow {
  id: string;
  orgId: string;
  meetingId: string;
  principalId: string;
  status: string;
  role: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchBoardMeetingAttendees(
  meetingId: string,
): Promise<ApiSuccess<BoardMeetingAttendeeRow[]>> {
  const res = await apiFetch(`/v1/comm-board-meetings/${meetingId}/attendees`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function addBoardAttendee(command: {
  meetingId: string;
  principalId: string;
  role?: string | null;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/attendees/add", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Add attendee failed (${res.status})`);
  }
  return res.json();
}

export async function updateBoardAttendeeStatus(command: {
  attendeeId: string;
  status: "invited" | "confirmed" | "attended" | "absent";
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/attendees/update-status", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Update attendee status failed (${res.status})`);
  }
  return res.json();
}

export interface BoardResolutionRow {
  id: string;
  orgId: string;
  meetingId: string;
  title: string;
  description: string | null;
  status: string;
  proposedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardResolutionVoteRow {
  id: string;
  orgId: string;
  resolutionId: string;
  principalId: string;
  vote: string;
  createdAt: string;
}

export async function fetchBoardMeetingResolutions(
  meetingId: string,
): Promise<ApiSuccess<BoardResolutionRow[]>> {
  const res = await apiFetch(`/v1/comm-board-meetings/${meetingId}/resolutions`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchResolutionVotes(
  meetingId: string,
  resolutionId: string,
): Promise<ApiSuccess<BoardResolutionVoteRow[]>> {
  const res = await apiFetch(
    `/v1/comm-board-meetings/${meetingId}/resolutions/${resolutionId}/votes`,
  );
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function proposeBoardResolution(command: {
  meetingId: string;
  title: string;
  description?: string | null;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/resolutions/propose", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Propose resolution failed (${res.status})`);
  }
  return res.json();
}

export async function castBoardVote(command: {
  resolutionId: string;
  vote: "for" | "against" | "abstain";
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/resolutions/cast-vote", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Cast vote failed (${res.status})`);
  }
  return res.json();
}

export interface BoardMinuteRow {
  id: string;
  orgId: string;
  meetingId: string;
  resolutionId: string | null;
  createdByPrincipalId: string;
  recordedAt: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BoardActionItemRow {
  id: string;
  orgId: string;
  minuteId: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  createdByPrincipalId: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export async function fetchBoardMeetingMinutes(
  meetingId: string,
): Promise<ApiSuccess<BoardMinuteRow[]>> {
  const res = await apiFetch(`/v1/comm-board-meetings/${meetingId}/minutes`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function recordBoardMinutes(command: {
  meetingId: string;
  resolutionId?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/minutes/record", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Record minutes failed (${res.status})`);
  }
  return res.json();
}

export async function fetchActionItemsByMinute(
  meetingId: string,
  minuteId: string,
): Promise<ApiSuccess<BoardActionItemRow[]>> {
  const res = await apiFetch(
    `/v1/comm-board-meetings/${meetingId}/minutes/${minuteId}/action-items`,
  );
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function createBoardActionItem(command: {
  minuteId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/action-items/create", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Create action item failed (${res.status})`);
  }
  return res.json();
}

export async function updateBoardActionItem(command: {
  id: string;
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  status?: "open" | "in_progress" | "done" | "cancelled";
}): Promise<ApiSuccess<{ id: string }>> {
  const res = await apiFetch("/v1/commands/comm-board-meetings/action-items/update", {
    method: "POST",
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...command }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Update action item failed (${res.status})`);
  }
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
