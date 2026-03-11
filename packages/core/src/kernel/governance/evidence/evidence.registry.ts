/**
 * Evidence registry — document metadata persistence.
 *
 * Persists document row after successful object-store upload.
 * Emits a canonical AUDIT PAYLOAD (caller persists it).
 *
 * Guarantees:
 *  - Policy-gated (evidence:register permission required)
 *  - Idempotent on (orgId, objectKey) via UNIQUE + ON CONFLICT DO NOTHING
 *  - Optional dedup on (orgId, sha256) to reuse existing document rows
 *  - operationId required for audit correlation + idempotency
 *
 * DB requirements:
 *  - UNIQUE (org_id, object_key)
 *  - INDEX  (org_id, sha256)   // for dedup lookups (or UNIQUE if strict)
 *  - evidence_operation table  // operation-level idempotency ledger
 */

import type { DbClient } from "@afenda/db";
import { document, evidenceOperation } from "@afenda/db";
import type { OrgId, PrincipalId } from "@afenda/contracts";
import { and, eq } from "drizzle-orm";

import type {
  EvidencePolicyContext,
  EvidencePolicyProof,
  EvidenceOperationId,
  WorkspaceId,
  EvidenceId,
} from "./evidence.policy";
import {
  assertEvidenceRegisterAllowed,
  buildEvidenceRegisterAuditEvent,
  EvidencePolicyError,
} from "./evidence.policy";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegisterDocumentParams {
  orgId: OrgId;
  objectKey: string;
  /** Lowercase hex SHA-256 of the uploaded file — exactly 64 hex chars. */
  sha256: string;
  /** MIME type string, e.g. "application/pdf". */
  mime: string;
  /** File size in bytes — non-negative safe integer. */
  sizeBytes: number;
  uploadedByPrincipalId?: PrincipalId;
}

export interface RegisterDocumentOptions {
  /**
   * If true, registry will attempt to reuse an existing document in the same org
   * with the same sha256 (and optionally also same mime/size).
   *
   * Recommended: true (but ensure caller deletes orphaned upload if deduped).
   */
  dedupBySha256?: boolean;

  /**
   * Stricter dedup: require mime + size to match too.
   * (Helps protect against bad sha claims / mismatched metadata.)
   */
  dedupAlsoMatchMimeAndSize?: boolean;
}

export interface RegisterDocumentAuth {
  /** Required for evidence.register policy + audit correlation. */
  operationId: EvidenceOperationId;

  /** Policy context: permissions + principal. */
  policyCtx: EvidencePolicyContext;

  /** Timestamp (UTC ISO, must end in Z). */
  nowUtc: string;

  /** Optional extras (justification, MFA, etc.) */
  justificationText?: string;
  mfaVerified?: boolean;
  approvalGrantId?: string;
}

export interface RegisterDocumentResult {
  id: string;
  created: boolean;
  deduped: boolean;
  /** True when the result was resolved from a prior operation with the same operationId. */
  idempotentHit: boolean;
}

export interface RegisterDocumentWithAudit {
  result: RegisterDocumentResult;
  auditEvent: ReturnType<typeof buildEvidenceRegisterAuditEvent>;
}

export type RegisterDocumentErrorCode =
  | "INVALID_INPUT"
  | "DB_READ_FAILED"
  | "DB_WRITE_FAILED"
  | "DB_READ_AFTER_CONFLICT_FAILED";

export class RegisterDocumentError extends Error {
  readonly code: RegisterDocumentErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: RegisterDocumentErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "RegisterDocumentError";
    this.code = code;
    this.details = details;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register document metadata. Policy-gated + idempotent on (orgId, objectKey).
 *
 * Returns `{ result, auditEvent }` — caller persists the audit event.
 *
 * If options.dedupBySha256 is enabled, may return an existing doc id
 * (created=false, deduped=true).
 */
export async function registerDocument(
  db: DbClient,
  params: RegisterDocumentParams,
  options: RegisterDocumentOptions,
  auth: RegisterDocumentAuth,
): Promise<RegisterDocumentWithAudit> {
  assertRegisterDocumentParams(params);
  assertUtcZ(auth.nowUtc);

  // Build proof and enforce policy BEFORE writing.
  const proof: EvidencePolicyProof = {
    operationId: auth.operationId,
    justificationText: auth.justificationText,
    mfaVerified: auth.mfaVerified,
    approvalGrantId: auth.approvalGrantId,
  };

  const decision = assertEvidenceRegisterAllowed(auth.policyCtx, auth.nowUtc, proof);

  const dedupBySha256 = options.dedupBySha256 ?? false;
  const strictDedup = options.dedupAlsoMatchMimeAndSize ?? true;

  const result = await db.transaction(async (tx) => {
    // 0) Operation-level idempotency: same operationId → same documentId, always.
    const priorOp = await tx
      .select({ documentId: evidenceOperation.documentId })
      .from(evidenceOperation)
      .where(eq(evidenceOperation.operationId, auth.operationId as unknown as string))
      .limit(1);

    if (priorOp[0]) {
      return { id: priorOp[0].documentId, created: false, deduped: false, idempotentHit: true };
    }

    // 1) Optional dedup-by-content
    if (dedupBySha256) {
      const existing = await findBySha256(tx as unknown as DbClient, params, {
        strict: strictDedup,
      });
      if (existing) {
        await recordOperation(tx, auth.operationId, params.orgId, existing.id);
        return { id: existing.id, created: false, deduped: true, idempotentHit: false };
      }
    }

    // 2) Insert idempotently by (orgId, objectKey)
    const inserted = await tx
      .insert(document)
      .values({
        orgId: params.orgId,
        objectKey: params.objectKey,
        sha256: params.sha256,
        mime: params.mime,
        sizeBytes: params.sizeBytes,
        uploadedByPrincipalId: params.uploadedByPrincipalId ?? null,
      })
      .onConflictDoNothing({
        target: [document.orgId, document.objectKey],
      })
      .returning({ id: document.id });

    const row = inserted[0];
    if (row) {
      await recordOperation(tx, auth.operationId, params.orgId, row.id);
      return { id: row.id, created: true, deduped: false, idempotentHit: false };
    }

    // 3) Conflict: read back existing id (org-scoped)
    const existingByKey = await tx
      .select({ id: document.id })
      .from(document)
      .where(and(eq(document.orgId, params.orgId), eq(document.objectKey, params.objectKey)))
      .limit(1);

    const ex = existingByKey[0];
    if (!ex) {
      throw new RegisterDocumentError(
        "DB_READ_AFTER_CONFLICT_FAILED",
        "Document exists by unique key but could not be read back",
        { orgId: params.orgId, objectKey: params.objectKey },
      );
    }
    await recordOperation(tx, auth.operationId, params.orgId, ex.id);
    return { id: ex.id, created: false, deduped: false, idempotentHit: false };
  });

  // Treat orgId as workspaceId for policy/audit (until naming unification)
  const workspaceId = params.orgId as unknown as WorkspaceId;
  const evidenceId = result.id as unknown as EvidenceId;

  const auditEvent = buildEvidenceRegisterAuditEvent(decision, auth.policyCtx, auth.nowUtc, proof, {
    evidenceId,
    workspaceId,
    objectKey: params.objectKey,
    sha256: params.sha256,
    mime: params.mime,
    sizeBytes: params.sizeBytes,
    created: result.created,
    deduped: result.deduped,
    idempotentHit: result.idempotentHit,
    uploadedByPrincipalId: (params.uploadedByPrincipalId ?? null) as unknown as string | null,
  });

  return { result, auditEvent };
}

/**
 * Lookup helper — useful for "pre-flight dedup" BEFORE uploading.
 * (Best practice: compute sha256 client/server, call this; if found, skip upload.)
 */
export async function getDocumentIdBySha256(
  db: DbClient,
  orgId: OrgId,
  sha256: string,
): Promise<string | null> {
  if (!SHA256_LOWER_HEX_64.test(sha256)) {
    throw new RegisterDocumentError(
      "INVALID_INPUT",
      "sha256 must be lowercase hex SHA-256 (64 chars)",
    );
  }

  const rows = await db
    .select({ id: document.id })
    .from(document)
    .where(and(eq(document.orgId, orgId), eq(document.sha256, sha256)))
    .limit(1);

  return rows[0]?.id ?? null;
}

// Re-export policy error for callers that catch it
export { EvidencePolicyError };

// ── Internals ────────────────────────────────────────────────────────────────

/**
 * Record the operationId → documentId binding in the idempotency ledger.
 * Uses ON CONFLICT DO NOTHING to handle concurrent retries safely:
 * if two transactions race, one wins the insert and the other is a no-op
 * (the caller already has the correct documentId from the main flow).
 */
async function recordOperation(
  tx: Parameters<Parameters<DbClient["transaction"]>[0]>[0],
  operationId: EvidenceOperationId,
  orgId: OrgId,
  documentId: string,
): Promise<void> {
  await tx
    .insert(evidenceOperation)
    .values({
      operationId: operationId as unknown as string,
      orgId,
      documentId,
    })
    .onConflictDoNothing({ target: evidenceOperation.operationId });
}

async function findBySha256(
  db: DbClient,
  p: RegisterDocumentParams,
  opts: { strict: boolean },
): Promise<{ id: string } | null> {
  try {
    if (!opts.strict) {
      const rows = await db
        .select({ id: document.id })
        .from(document)
        .where(and(eq(document.orgId, p.orgId), eq(document.sha256, p.sha256)))
        .limit(1);
      return rows[0] ?? null;
    }

    const rows = await db
      .select({ id: document.id })
      .from(document)
      .where(
        and(
          eq(document.orgId, p.orgId),
          eq(document.sha256, p.sha256),
          eq(document.mime, p.mime),
          eq(document.sizeBytes, p.sizeBytes),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  } catch (e) {
    throw new RegisterDocumentError("DB_READ_FAILED", "Failed to dedup lookup by sha256", {
      orgId: p.orgId,
      sha256: p.sha256,
      cause: e instanceof Error ? e.message : String(e),
    });
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

const SHA256_LOWER_HEX_64 = /^[0-9a-f]{64}$/;
const MIME_BASIC = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;

function assertRegisterDocumentParams(p: RegisterDocumentParams): void {
  if (typeof p.objectKey !== "string" || p.objectKey.trim().length === 0) {
    throw new RegisterDocumentError("INVALID_INPUT", "objectKey must be a non-empty string");
  }
  if (p.objectKey.startsWith("/") || p.objectKey.includes("..")) {
    throw new RegisterDocumentError(
      "INVALID_INPUT",
      "objectKey is invalid (path traversal / absolute path)",
    );
  }

  if (!SHA256_LOWER_HEX_64.test(p.sha256)) {
    throw new RegisterDocumentError(
      "INVALID_INPUT",
      "sha256 must be lowercase hex SHA-256 (64 chars)",
      {
        sha256: p.sha256,
      },
    );
  }

  if (typeof p.mime !== "string" || p.mime.trim().length === 0) {
    throw new RegisterDocumentError("INVALID_INPUT", "mime must be a non-empty string");
  }
  if (!MIME_BASIC.test(p.mime)) {
    throw new RegisterDocumentError("INVALID_INPUT", "mime is not a valid MIME type", {
      mime: p.mime,
    });
  }

  if (!Number.isSafeInteger(p.sizeBytes) || p.sizeBytes < 0) {
    throw new RegisterDocumentError(
      "INVALID_INPUT",
      "sizeBytes must be a non-negative safe integer",
      {
        sizeBytes: p.sizeBytes,
      },
    );
  }
}

function assertUtcZ(utcIso: string): void {
  if (typeof utcIso !== "string" || !utcIso.endsWith("Z")) {
    throw new RegisterDocumentError(
      "INVALID_INPUT",
      `nowUtc must be UTC ISO ending in 'Z': ${utcIso}`,
    );
  }
  const ms = Date.parse(utcIso);
  if (!Number.isFinite(ms)) {
    throw new RegisterDocumentError("INVALID_INPUT", `nowUtc is not parseable ISO: ${utcIso}`);
  }
}
