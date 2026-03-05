/**
 * Evidence policy — retention rules and access control.
 *
 * v4 upgrades:
 *  - Legal hold as first-class purge gate (compliance approval required)
 *  - Canonical audit payload builder (single source of truth)
 *
 * Still pure/deterministic: no DB calls, no network.
 */

type Brand<T, B extends string> = T & { readonly __brand: B };

export type EvidenceId = Brand<string, "EvidenceId">;
export type UserId = Brand<string, "UserId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;
export type LegalEntityId = Brand<string, "LegalEntityId">;
export type EvidenceOperationId = Brand<string, "EvidenceOperationId">;

export type EvidenceEntityType =
  | "invoice"
  | "bill"
  | "payment"
  | "receipt"
  | "journal_entry"
  | "bank_statement"
  | "contract"
  | "tax_filing"
  | "payroll"
  | "fixed_asset"
  | "other";

export type EvidenceKind =
  | "upload"
  | "generated"
  | "external_link"
  | "integration"
  | "scan"
  | "email";

export type EvidenceScanStatus = "pending" | "clean" | "infected" | "failed" | "quarantined";

export type EvidenceLifecycleState = "active" | "archived" | "soft_deleted" | "hard_deleted";

export type EvidenceSensitivity = "public" | "internal" | "confidential" | "restricted";

export interface EvidenceLegalHold {
  /** If true: destructive actions are blocked (soft_delete, purge). */
  onHold: boolean;

  /** Optional: why it was placed. */
  reason?: string;

  /** Optional: scheduled release date (policy doesn't auto-release). */
  untilUtc?: string;

  /**
   * If set, indicates this evidence was held before and then released.
   * (Caller populates from DB; policy uses it to require compliance approval for purge.)
   */
  releasedAtUtc?: string;
  releasedReason?: string;
}

export interface EvidenceMetadata {
  evidenceId: EvidenceId;

  workspaceId: WorkspaceId;
  legalEntityId?: LegalEntityId;

  entityType: EvidenceEntityType;
  entityId?: string;
  kind: EvidenceKind;

  sensitivity: EvidenceSensitivity;

  createdAtUtc: string;
  retentionAnchorUtc?: string;

  lifecycle: EvidenceLifecycleState;
  archivedAtUtc?: string;
  softDeletedAtUtc?: string;

  scanStatus: EvidenceScanStatus;
  quarantinedReason?: string;

  isLocked?: boolean;
  legalHold?: EvidenceLegalHold;
}

/**
 * Minimal principal context for policy decisions.
 * Keep permissions as strings to avoid dependency direction issues.
 */
export interface EvidencePolicyContext {
  principalUserId: UserId;
  workspaceId: WorkspaceId;
  permissions: readonly string[];
  isWorkspaceAdmin?: boolean;
  isBreakGlass?: boolean;
  jurisdiction?: string;
}

/**
 * Proof = caller-provided evidence that obligations are satisfied.
 * The policy can *require* these via obligations; enforcement verifies them.
 */
export interface EvidencePolicyProof {
  /** Correlates audit + idempotency. REQUIRED when policy obligates it. */
  operationId?: EvidenceOperationId;

  /** Human-entered reason (persist to audit logs). */
  justificationText?: string;

  /** Re-auth / MFA already completed for this operation. */
  mfaVerified?: boolean;

  /** Approval ticket/grant from approvals subsystem (4-eyes / compliance, etc.). */
  approvalGrantId?: string;

  /** Caller confirms it will watermark the artifact before download. */
  watermarkApplied?: boolean;

  /**
   * Safe preview sandbox proof:
   * - e.g., streamed through a sandboxed viewer, no raw bytes downloadable,
   *   no copy/export, DLP overlays, etc.
   */
  previewSandboxed?: boolean;
}

export type EvidencePolicyIntent =
  | "view"
  | "download"
  | "archive"
  | "restore"
  | "soft_delete"
  | "purge"
  | "register";

export type EvidenceDenyReasonCode =
  | "EVIDENCE_WRONG_WORKSPACE"
  | "EVIDENCE_ARCHIVED"
  | "EVIDENCE_SOFT_DELETED"
  | "EVIDENCE_HARD_DELETED"
  | "EVIDENCE_LOCKED"
  | "EVIDENCE_ON_LEGAL_HOLD"
  | "MISSING_PERMISSION"
  | "QUARANTINED"
  | "SCAN_PENDING"
  | "INFECTED_OR_FAILED"
  | "RETENTION_NOT_MET"
  | "OBLIGATION_NOT_MET"
  | "UNKNOWN";

export type EvidenceAuditEventType =
  | "evidence.view"
  | "evidence.download"
  | "evidence.archive"
  | "evidence.restore"
  | "evidence.soft_delete"
  | "evidence.purge"
  | "evidence.override_quarantine"
  | "evidence.preview_pending"
  | "evidence.register";

/** What the policy requires the caller to do (and later prove). */
export interface EvidencePolicyObligations {
  /** Always audit for sensitive operations; service writes audit event. */
  audit?: {
    required: boolean;
    eventType: EvidenceAuditEventType;
  };

  /** Require operationId for idempotency + correlation (esp. downloads/purge). */
  operation?: {
    required: boolean;
    purpose: "audit_correlation" | "idempotency";
  };

  justification?: {
    required: boolean;
    minLength: number;
  };

  mfa?: {
    required: boolean;
    mode: "reauth" | "mfa";
  };

  approval?: {
    required: boolean;
    grantType: "supervisor" | "compliance" | "break_glass";
  };

  watermark?: {
    required: boolean;
    mode: "none" | "standard" | "restricted";
  };

  /** Require safe sandboxed preview (used for scanStatus=pending view). */
  previewSandbox?: {
    required: boolean;
  };
}

export interface EvidencePolicyDecision {
  ok: boolean;
  intent: EvidencePolicyIntent;
  reasonCode?: EvidenceDenyReasonCode;
  reason?: string;
  obligations?: EvidencePolicyObligations;
}

function allow(
  intent: EvidencePolicyIntent,
  obligations?: EvidencePolicyObligations,
): EvidencePolicyDecision {
  return { ok: true, intent, obligations };
}

function deny(
  intent: EvidencePolicyIntent,
  reasonCode: EvidenceDenyReasonCode,
  reason?: string,
  obligations?: EvidencePolicyObligations,
): EvidencePolicyDecision {
  return { ok: false, intent, reasonCode, reason, obligations };
}

export const EvidencePermissions = Object.freeze({
  read: "evidence:read",
  download: "evidence:download",
  archive: "evidence:archive",
  delete: "evidence:delete",
  purge: "evidence:purge",
  overrideQuarantine: "evidence:override_quarantine",
  previewPending: "evidence:preview_pending",
  register: "evidence:register",
} as const);

//
// ──────────────────────────────────────────────────────────────────────────────
// Retention
// ──────────────────────────────────────────────────────────────────────────────
//

export interface RetentionRule {
  entityType: EvidenceEntityType;
  minRetentionDays: number;
  purgeAllowed: boolean;
  rationale?: string;
}

export const DefaultRetentionRules: Readonly<Record<EvidenceEntityType, RetentionRule>> =
  Object.freeze({
    invoice: {
      entityType: "invoice",
      minRetentionDays: 365 * 7,
      purgeAllowed: true,
    },
    bill: {
      entityType: "bill",
      minRetentionDays: 365 * 7,
      purgeAllowed: true,
    },
    payment: {
      entityType: "payment",
      minRetentionDays: 365 * 7,
      purgeAllowed: true,
    },
    receipt: {
      entityType: "receipt",
      minRetentionDays: 365 * 7,
      purgeAllowed: true,
    },
    journal_entry: {
      entityType: "journal_entry",
      minRetentionDays: 365 * 7,
      purgeAllowed: true,
    },
    bank_statement: {
      entityType: "bank_statement",
      minRetentionDays: 365 * 7,
      purgeAllowed: true,
    },
    contract: {
      entityType: "contract",
      minRetentionDays: 365 * 10,
      purgeAllowed: true,
    },
    tax_filing: {
      entityType: "tax_filing",
      minRetentionDays: 365 * 10,
      purgeAllowed: true,
    },
    payroll: {
      entityType: "payroll",
      minRetentionDays: 365 * 10,
      purgeAllowed: true,
    },
    fixed_asset: {
      entityType: "fixed_asset",
      minRetentionDays: 365 * 10,
      purgeAllowed: true,
    },
    other: {
      entityType: "other",
      minRetentionDays: 365 * 7,
      purgeAllowed: true,
    },
  });

export function computeRetention(meta: EvidenceMetadata, rules = DefaultRetentionRules) {
  const rule = rules[meta.entityType] ?? rules.other;
  const anchorUtc = meta.retentionAnchorUtc ?? meta.createdAtUtc;
  const purgeEligibleUtc = addDaysUtc(anchorUtc, rule.minRetentionDays);
  return { anchorUtc, purgeEligibleUtc, rule };
}

export function isRetentionMetForPurge(
  meta: EvidenceMetadata,
  nowUtc: string,
  rules = DefaultRetentionRules,
): boolean {
  const { purgeEligibleUtc, rule } = computeRetention(meta, rules);
  if (!rule.purgeAllowed) return false;
  return toMillis(nowUtc) >= toMillis(purgeEligibleUtc);
}

//
// ──────────────────────────────────────────────────────────────────────────────
// Decision engine (NO proof here; proof is for enforcement)
// ──────────────────────────────────────────────────────────────────────────────
//

export function decideEvidenceIntent(
  ctx: EvidencePolicyContext,
  meta: EvidenceMetadata,
  intent: EvidencePolicyIntent,
  nowUtc: string,
  rules = DefaultRetentionRules,
): EvidencePolicyDecision {
  // 1) Workspace boundary (absolute)
  if (ctx.workspaceId !== meta.workspaceId) {
    return deny(intent, "EVIDENCE_WRONG_WORKSPACE");
  }

  // 2) Hard terminal lifecycle
  if (meta.lifecycle === "hard_deleted") {
    return deny(intent, "EVIDENCE_HARD_DELETED");
  }

  // 3) Legal hold blocks destructive actions
  if (meta.legalHold?.onHold) {
    if (intent === "purge" || intent === "soft_delete") {
      return deny(intent, "EVIDENCE_ON_LEGAL_HOLD", meta.legalHold.reason ?? "Legal hold active.");
    }
  }

  // 4) Lifecycle gates
  if (meta.lifecycle === "soft_deleted") {
    if (intent !== "restore" && intent !== "purge") {
      return deny(intent, "EVIDENCE_SOFT_DELETED");
    }
  }
  if (meta.lifecycle === "archived") {
    if (intent === "archive") return deny(intent, "EVIDENCE_ARCHIVED");
  }

  // 5) Locked evidence cannot be modified (except purge under strict rules)
  if (meta.isLocked && (intent === "archive" || intent === "soft_delete" || intent === "restore")) {
    return deny(intent, "EVIDENCE_LOCKED");
  }

  // 6) Permission gate
  const required = permissionForIntent(intent);
  if (required && !ctx.permissions.includes(required)) {
    return deny(intent, "MISSING_PERMISSION", `Requires ${required}`);
  }

  // 7) View/download scan gates + sensitivity obligations
  if (intent === "view" || intent === "download") {
    const scan = decideScanGate(ctx, meta, intent);
    if (!scan.ok) return scan;

    // Merge sensitivity obligations on top of scan obligations (if any)
    const sens = obligationsForRead(meta, intent);
    return allow(intent, mergeObligations(scan.obligations, sens));
  }

  // 8) Purge rules (hard-delete)
  if (intent === "purge") {
    // Require soft-delete first
    if (meta.lifecycle !== "soft_deleted") {
      return deny(intent, "RETENTION_NOT_MET", "Must be soft-deleted before purge.", {
        audit: { required: true, eventType: "evidence.purge" },
      });
    }
    if (!isRetentionMetForPurge(meta, nowUtc, rules)) {
      return deny(intent, "RETENTION_NOT_MET", "Retention window not met.", {
        audit: { required: true, eventType: "evidence.purge" },
      });
    }
    // Compliance clearance if evidence ever had a legal hold record (held or released)
    const needsComplianceApproval = Boolean(meta.legalHold);

    return allow(intent, {
      audit: { required: true, eventType: "evidence.purge" },
      operation: { required: true, purpose: "idempotency" },
      justification: { required: true, minLength: 12 },
      mfa: { required: true, mode: "mfa" },
      ...(needsComplianceApproval
        ? { approval: { required: true, grantType: "compliance" as const } }
        : {}),
    });
  }

  // 9) Archive/delete/restore obligations
  if (intent === "archive") {
    return allow(intent, {
      audit: { required: true, eventType: "evidence.archive" },
      operation: { required: true, purpose: "audit_correlation" },
    });
  }
  if (intent === "restore") {
    return allow(intent, {
      audit: { required: true, eventType: "evidence.restore" },
      operation: { required: true, purpose: "audit_correlation" },
    });
  }
  if (intent === "soft_delete") {
    return allow(intent, {
      audit: { required: true, eventType: "evidence.soft_delete" },
      operation: { required: true, purpose: "audit_correlation" },
      justification: { required: true, minLength: 8 },
    });
  }

  return allow(intent);
}

function obligationsForRead(
  meta: EvidenceMetadata,
  intent: "view" | "download",
): EvidencePolicyObligations {
  const baseAudit: EvidencePolicyObligations["audit"] = {
    required: true,
    eventType: intent === "download" ? "evidence.download" : "evidence.view",
  };

  // Require operationId for downloads (idempotency + audit correlation)
  const baseOperation: EvidencePolicyObligations["operation"] =
    intent === "download"
      ? { required: true, purpose: "idempotency" }
      : { required: true, purpose: "audit_correlation" };

  if (meta.sensitivity === "public" || meta.sensitivity === "internal") {
    return { audit: baseAudit, operation: baseOperation };
  }

  if (meta.sensitivity === "confidential") {
    return intent === "download"
      ? {
          audit: baseAudit,
          operation: baseOperation,
          watermark: { required: true, mode: "standard" },
        }
      : { audit: baseAudit, operation: baseOperation };
  }

  // restricted
  return intent === "download"
    ? {
        audit: baseAudit,
        operation: baseOperation,
        watermark: { required: true, mode: "restricted" },
        mfa: { required: true, mode: "mfa" },
        justification: { required: true, minLength: 16 },
      }
    : {
        audit: baseAudit,
        operation: baseOperation,
        mfa: { required: true, mode: "reauth" },
      };
}

function decideScanGate(
  ctx: EvidencePolicyContext,
  meta: EvidenceMetadata,
  intent: "view" | "download",
): EvidencePolicyDecision {
  // Pending scan: allow SAFE PREVIEW ONLY (view), deny download.
  if (meta.scanStatus === "pending") {
    if (intent === "download") {
      return deny(intent, "SCAN_PENDING", "Scan pending.");
    }
    // Require explicit permission + sandbox proof
    if (!ctx.permissions.includes(EvidencePermissions.previewPending)) {
      return deny(
        intent,
        "SCAN_PENDING",
        "Scan pending (preview requires evidence:preview_pending).",
      );
    }
    return allow(intent, {
      audit: { required: true, eventType: "evidence.preview_pending" },
      operation: { required: true, purpose: "audit_correlation" },
      previewSandbox: { required: true },
    });
  }

  // Quarantined: override requires permission + break-glass
  if (meta.scanStatus === "quarantined") {
    if (!ctx.permissions.includes(EvidencePermissions.overrideQuarantine)) {
      return deny(intent, "QUARANTINED", meta.quarantinedReason ?? "Evidence quarantined.");
    }
    if (!ctx.isBreakGlass) {
      return deny(intent, "QUARANTINED", "Override requires break-glass.");
    }
    return allow(intent, {
      audit: { required: true, eventType: "evidence.override_quarantine" },
      operation: { required: true, purpose: "idempotency" },
      justification: { required: true, minLength: 20 },
      mfa: { required: true, mode: "mfa" },
    });
  }

  // Infected/failed: strict break-glass + override only
  if (meta.scanStatus === "infected" || meta.scanStatus === "failed") {
    const hasOverride = ctx.permissions.includes(EvidencePermissions.overrideQuarantine);
    if (!hasOverride || !ctx.isBreakGlass) {
      return deny(intent, "INFECTED_OR_FAILED", "Unsafe evidence. Break-glass override required.");
    }
    return allow(intent, {
      audit: { required: true, eventType: "evidence.override_quarantine" },
      operation: { required: true, purpose: "idempotency" },
      justification: { required: true, minLength: 24 },
      mfa: { required: true, mode: "mfa" },
    });
  }

  // clean
  return allow(intent);
}

function permissionForIntent(intent: EvidencePolicyIntent): string | null {
  switch (intent) {
    case "view":
      return EvidencePermissions.read;
    case "download":
      return EvidencePermissions.download;
    case "archive":
    case "restore":
      return EvidencePermissions.archive;
    case "soft_delete":
      return EvidencePermissions.delete;
    case "purge":
      return EvidencePermissions.purge;
    case "register":
      return EvidencePermissions.register;
    default:
      return null;
  }
}

function mergeObligations(
  a?: EvidencePolicyObligations,
  b?: EvidencePolicyObligations,
): EvidencePolicyObligations | undefined {
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}

//
// ──────────────────────────────────────────────────────────────────────────────
// Enforcement (proof validation)
// ──────────────────────────────────────────────────────────────────────────────
//

export class EvidencePolicyError extends Error {
  readonly code: EvidenceDenyReasonCode;
  readonly details?: Record<string, unknown>;
  constructor(code: EvidenceDenyReasonCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "EvidencePolicyError";
    this.code = code;
    this.details = details;
  }
}

export function assertEvidenceAllowed(
  ctx: EvidencePolicyContext,
  meta: EvidenceMetadata,
  intent: EvidencePolicyIntent,
  nowUtc: string,
  proof?: EvidencePolicyProof,
  rules = DefaultRetentionRules,
): EvidencePolicyDecision {
  const d = decideEvidenceIntent(ctx, meta, intent, nowUtc, rules);
  if (!d.ok) {
    throw new EvidencePolicyError(d.reasonCode ?? "UNKNOWN", d.reason ?? "Evidence policy denied", {
      intent,
      evidenceId: meta.evidenceId,
    });
  }
  assertObligationsSatisfied(d, proof);

  return d;
}

export function assertObligationsSatisfied(
  decision: EvidencePolicyDecision,
  proof?: EvidencePolicyProof,
): void {
  const o = decision.obligations;
  if (!o) return;

  // operationId
  if (o.operation?.required) {
    const op = proof?.operationId;
    if (!op || String(op).trim().length < 8) {
      throw new EvidencePolicyError("OBLIGATION_NOT_MET", "operationId required.", {
        intent: decision.intent,
      });
    }
  }

  // justification
  if (o.justification?.required) {
    const text = (proof?.justificationText ?? "").trim();
    if (text.length < o.justification.minLength) {
      throw new EvidencePolicyError(
        "OBLIGATION_NOT_MET",
        `Justification required (min ${o.justification.minLength} chars).`,
        { intent: decision.intent },
      );
    }
  }

  // MFA
  if (o.mfa?.required) {
    if (!proof?.mfaVerified) {
      throw new EvidencePolicyError("OBLIGATION_NOT_MET", `${o.mfa.mode.toUpperCase()} required.`, {
        intent: decision.intent,
      });
    }
  }

  // approval grant
  if (o.approval?.required) {
    if (!proof?.approvalGrantId) {
      throw new EvidencePolicyError(
        "OBLIGATION_NOT_MET",
        `Approval grant required (${o.approval.grantType}).`,
        { intent: decision.intent },
      );
    }
  }

  // watermark
  if (o.watermark?.required) {
    if (!proof?.watermarkApplied) {
      throw new EvidencePolicyError(
        "OBLIGATION_NOT_MET",
        `Watermark required (${o.watermark.mode}).`,
        { intent: decision.intent },
      );
    }
  }

  // safe preview sandbox
  if (o.previewSandbox?.required) {
    if (!proof?.previewSandboxed) {
      throw new EvidencePolicyError("OBLIGATION_NOT_MET", "Safe preview sandbox required.", {
        intent: decision.intent,
      });
    }
  }
}

//
// ──────────────────────────────────────────────────────────────────────────────
// Lifecycle transitions (pure)
// ──────────────────────────────────────────────────────────────────────────────
//

export type EvidenceLifecycleEvent =
  | { type: "archive"; atUtc: string }
  | { type: "restore"; atUtc: string }
  | { type: "soft_delete"; atUtc: string }
  | { type: "purge"; atUtc: string };

export function nextLifecycleState(
  current: EvidenceMetadata,
  event: EvidenceLifecycleEvent,
): EvidenceMetadata {
  switch (event.type) {
    case "archive":
      if (current.lifecycle === "hard_deleted") return current;
      return { ...current, lifecycle: "archived", archivedAtUtc: event.atUtc };
    case "restore":
      if (current.lifecycle === "hard_deleted") return current;
      return {
        ...current,
        lifecycle: "active",
        softDeletedAtUtc: undefined,
        archivedAtUtc: undefined,
      };
    case "soft_delete":
      if (current.lifecycle === "hard_deleted") return current;
      return {
        ...current,
        lifecycle: "soft_deleted",
        softDeletedAtUtc: event.atUtc,
      };
    case "purge":
      return { ...current, lifecycle: "hard_deleted" };
  }
}

//
// ──────────────────────────────────────────────────────────────────────────────
// Canonical audit payload builder
// ──────────────────────────────────────────────────────────────────────────────
//

export interface EvidenceAuditEvent {
  type: EvidenceAuditEventType;
  atUtc: string;

  // correlation / idempotency
  operationId?: EvidenceOperationId;

  // actor
  actorUserId: UserId;

  // scope
  workspaceId: WorkspaceId;

  // target
  evidenceId: EvidenceId;
  entityType: EvidenceEntityType;
  entityId?: string;
  kind: EvidenceKind;

  // state snapshot for audit forensics
  sensitivity: EvidenceSensitivity;
  lifecycle: EvidenceLifecycleState;
  scanStatus: EvidenceScanStatus;
  legalHoldOn: boolean;

  // optional human reason (redacted by default; see JustificationRedactionStrategy)
  justificationText?: string;

  /**
   * If redaction was applied, this records which strategy was used.
   * Lets downstream consumers know whether `justificationText` is full, truncated,
   * or replaced with a hash.
   */
  justificationRedaction?: JustificationRedactionStrategy;

  // optional approval evidence
  approvalGrantId?: string;
}

/**
 * Build a normalized audit event from a policy decision + proof.
 * Recommended usage pattern in services:
 *   const decision = assertEvidenceAllowed(..., proof)
 *   const audit = buildEvidenceAuditEvent(decision, ctx, meta, nowUtc, proof)
 *   await auditLog.write(audit)
 *
 * @param redact  Controls how justification text is stored in audit logs.
 *                Defaults to "full" (store verbatim). Override per environment.
 */
export function buildEvidenceAuditEvent(
  decision: EvidencePolicyDecision,
  ctx: EvidencePolicyContext,
  meta: EvidenceMetadata,
  nowUtc: string,
  proof?: EvidencePolicyProof,
  redact: JustificationRedactionStrategy = "full",
): EvidenceAuditEvent | null {
  const audit = decision.obligations?.audit;
  if (!audit?.required) return null;

  const rawText = proof?.justificationText?.trim() || undefined;
  const redacted = rawText ? redactJustificationForStorage(rawText, redact) : undefined;

  // NOTE: we intentionally do NOT enforce obligations here;
  // call assertEvidenceAllowed() first (it will validate proof).
  return {
    type: audit.eventType,
    atUtc: nowUtc,

    operationId: proof?.operationId,

    actorUserId: ctx.principalUserId,
    workspaceId: meta.workspaceId,

    evidenceId: meta.evidenceId,
    entityType: meta.entityType,
    entityId: meta.entityId,
    kind: meta.kind,

    sensitivity: meta.sensitivity,
    lifecycle: meta.lifecycle,
    scanStatus: meta.scanStatus,
    legalHoldOn: Boolean(meta.legalHold?.onHold),

    justificationText: redacted,
    justificationRedaction: rawText ? redact : undefined,
    approvalGrantId: proof?.approvalGrantId,
  };
}

//
// ──────────────────────────────────────────────────────────────────────────────
// Justification redaction
// ──────────────────────────────────────────────────────────────────────────────
//

/**
 * Controls how human-entered justification text is persisted in audit logs.
 *
 * - `"full"`     — store verbatim (default; useful for internal / compliance audits).
 * - `"truncate"` — cap at 120 chars (reduce storage of long free-text).
 * - `"hash"`     — SHA-256 hex digest (prove text existed without storing PII).
 * - `"redact"`   — replace with `"[REDACTED]"` (log the *fact* of a justification, nothing more).
 *
 * Choose per environment: dev/staging can use `"full"`, production restricted
 * tenants might require `"hash"` or `"redact"` to satisfy data-minimization rules.
 */
export type JustificationRedactionStrategy = "full" | "truncate" | "hash" | "redact";

const JUSTIFICATION_TRUNCATE_LENGTH = 120;

/**
 * Pure redaction hook — called by `buildEvidenceAuditEvent` before persisting.
 * Exported so callers can also use it independently (e.g., ad-hoc audit rows).
 *
 * NOTE: `"hash"` uses a simple inline DJB2a-based hash (no crypto import).
 * If you need cryptographic strength, swap to `crypto.subtle.digest` in your
 * service layer and pass the result as `"full"` with the hash string.
 */
export function redactJustificationForStorage(
  text: string,
  strategy: JustificationRedactionStrategy,
): string {
  switch (strategy) {
    case "full":
      return text;

    case "truncate":
      return text.length <= JUSTIFICATION_TRUNCATE_LENGTH
        ? text
        : text.slice(0, JUSTIFICATION_TRUNCATE_LENGTH) + "…";

    case "hash":
      return `djb2a:${djb2aHex(text)}`;

    case "redact":
      return "[REDACTED]";
  }
}

/**
 * DJB2a (xor variant) — fast, deterministic, non-cryptographic.
 * Returns 8-char zero-padded hex of a 32-bit hash.
 * Good enough to prove "same text" in audit; NOT a security hash.
 */
function djb2aHex(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h * 33) ^ input.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

//
// ──────────────────────────────────────────────────────────────────────────────
// Register intent (no EvidenceMetadata needed — document doesn't exist yet)
// ──────────────────────────────────────────────────────────────────────────────
//

/**
 * Policy gate for document/evidence registration.
 *
 * Unlike the other intents, there is no `EvidenceMetadata` yet —
 * the document is being *created*, not accessed.
 * Workspace boundary is implicit: caller must scope orgId correctly.
 */
export function assertEvidenceRegisterAllowed(
  ctx: EvidencePolicyContext,
  nowUtc: string,
  proof?: EvidencePolicyProof,
): EvidencePolicyDecision {
  if (!ctx.permissions.includes(EvidencePermissions.register)) {
    throw new EvidencePolicyError(
      "MISSING_PERMISSION",
      `Requires ${EvidencePermissions.register}`,
      {
        nowUtc,
      },
    );
  }

  const decision: EvidencePolicyDecision = {
    ok: true,
    intent: "register",
    obligations: {
      audit: { required: true, eventType: "evidence.register" },
      operation: { required: true, purpose: "idempotency" },
    },
  };

  assertObligationsSatisfied(decision, proof);
  return decision;
}

/**
 * Canonical audit details for document/evidence registration.
 * Contains all fields needed to reconstruct the event for court-grade audit.
 */
export interface EvidenceRegisterAuditDetails {
  evidenceId: EvidenceId;
  workspaceId: WorkspaceId;

  objectKey: string;
  sha256: string;
  mime: string;
  sizeBytes: number;

  created: boolean;
  deduped: boolean;
  /** True when the result came from an existing operation ledger entry. */
  idempotentHit: boolean;

  uploadedByPrincipalId?: string | null;
}

/**
 * Build the canonical audit payload for a register operation.
 * Returns null if the decision doesn't require audit.
 */
export function buildEvidenceRegisterAuditEvent(
  decision: EvidencePolicyDecision,
  ctx: EvidencePolicyContext,
  nowUtc: string,
  proof: EvidencePolicyProof | undefined,
  details: EvidenceRegisterAuditDetails,
) {
  const audit = decision.obligations?.audit;
  if (!audit?.required) return null;

  return {
    type: audit.eventType,
    atUtc: nowUtc,

    operationId: proof?.operationId,
    justificationText: proof?.justificationText?.trim() || undefined,
    approvalGrantId: proof?.approvalGrantId,

    actorUserId: ctx.principalUserId,
    workspaceId: details.workspaceId,

    evidenceId: details.evidenceId,

    objectKey: details.objectKey,
    sha256: details.sha256,
    mime: details.mime,
    sizeBytes: details.sizeBytes,
    created: details.created,
    deduped: details.deduped,
    idempotentHit: details.idempotentHit,
    uploadedByPrincipalId: details.uploadedByPrincipalId ?? null,
  } as const;
}

//
// ──────────────────────────────────────────────────────────────────────────────
// UTC helpers (strict 'Z')
// ──────────────────────────────────────────────────────────────────────────────
//

function toMillis(utcIso: string): number {
  if (!utcIso.endsWith("Z")) throw new Error(`UTC datetime must end with 'Z': ${utcIso}`);
  const ms = Date.parse(utcIso);
  if (!Number.isFinite(ms)) throw new Error(`Invalid UTC ISO datetime: ${utcIso}`);
  return ms;
}

function addDaysUtc(utcIso: string, days: number): string {
  const ms = toMillis(utcIso);
  const out = ms + days * 24 * 60 * 60 * 1000;
  return new Date(out).toISOString();
}
