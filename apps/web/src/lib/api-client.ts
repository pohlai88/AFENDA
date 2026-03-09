/**
 * API client for Next.js - works in both Server and Client Components.
 *
 * Uses the internal rewrite proxy so the API URL doesn't leak to clients.
 * All functions throw on non-OK responses — callers should catch and
 * render error states.
 *
 * Auth:
 * - Server Components: Reads session token from cookies, sends Authorization: Bearer
 * - Client Components: Browser automatically sends cookies, no manual auth needed
 * - Dev mode (no session): Sends x-dev-user-email for API bypass
 */

import type { CapabilityResult } from "@afenda/contracts";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Default org slug for API requests. TODO: from org context when available. */
const DEFAULT_ORG = "demo";

/**
 * Get auth headers for API requests.
 * - In Server Components: Reads token from cookies
 * - In Client Components: Returns minimal headers (browser sends cookies automatically)
 * - In dev mode without session: Returns x-dev-user-email for API bypass
 */
export async function getApiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "x-org-id": DEFAULT_ORG,
  };

  // Check if we're in a server context (cookies is available)
  const isServer = typeof window === "undefined";
  
  if (isServer) {
    try {
      // Dynamic import to avoid bundling server-only code in client
      const { getSessionToken } = await import("./auth-token");
      const token = await getSessionToken();
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        return headers;
      }
    } catch (err) {
      // If auth-token import fails (shouldn't happen), continue without token
      console.warn("Failed to get session token:", err);
    }
  }

  // Dev mode fallback
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && isServer) {
    headers["x-dev-user-email"] = "admin@demo.afenda";
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
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await apiFetch("/v1/me/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? `Password change failed (${res.status})`);
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
  const res = await apiFetch(
    `/v1/capabilities/${entityKey}${qs ? `?${qs}` : ""}`,
  );
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}
