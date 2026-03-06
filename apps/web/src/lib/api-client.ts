/**
 * Server-side API client for Next.js server components.
 *
 * Uses the internal rewrite proxy so the API URL doesn't leak to clients.
 * All functions throw on non-OK responses — callers should catch and
 * render error states.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
 * Sprint 0: uses a dev-mode org and principal header.
 */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Org-Id": "00000000-0000-0000-0000-000000000001",
      "X-Dev-Principal": "admin@demo.afenda",
      ...init?.headers,
    },
    // Next.js 15+ — opt out of aggressive caching for API calls
    cache: "no-store",
  });
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

/** Resolve capabilities for an entity/principal. */
export async function fetchCapabilities(
  entityKey: string,
  params?: { submittedByPrincipalId?: string },
): Promise<ApiSuccess<import("@afenda/contracts").CapabilityResult>> {
  const query = new URLSearchParams();
  if (params?.submittedByPrincipalId)
    query.set("submittedByPrincipalId", params.submittedByPrincipalId);

  const qs = query.toString();
  const res = await apiFetch(
    `/v1/capabilities/${entityKey}${qs ? `?${qs}` : ""}`,
  );
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}
