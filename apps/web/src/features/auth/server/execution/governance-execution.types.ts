import type { ComplianceFramework } from "../compliance/compliance.types";

export type ReviewCycleStatus =
  | "scheduled"
  | "open"
  | "in_review"
  | "approved"
  | "overdue"
  | "closed";

export type ApprovalDecision = "approved" | "rejected" | "needs_changes";

export interface AuthReviewCycleRecord {
  id: string;
  framework: ComplianceFramework;
  periodType: "quarterly" | "monthly" | "ad_hoc";
  periodLabel: string;
  title: string;
  status: ReviewCycleStatus;
  ownerUserId?: string | null;
  reviewerUserId?: string | null;
  approverUserId?: string | null;
  dueAt?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthReviewReminderRecord {
  id: string;
  reviewCycleId: string;
  recipientUserId: string;
  reminderType: "upcoming" | "due" | "overdue";
  dispatchedAt?: string | null;
  status: "pending" | "sent" | "failed";
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuthReviewEscalationRecord {
  id: string;
  reviewCycleId: string;
  escalationLevel: "manager" | "security_admin" | "internal_audit";
  triggeredAt: string;
  reason: string;
  status: "open" | "acknowledged" | "closed";
  metadata?: Record<string, unknown> | null;
}

export interface AuthApprovalMatrixRecord {
  id: string;
  framework: ComplianceFramework;
  reviewType: string;
  minApprovals: number;
  requiredRoles: string[];
  escalationRole?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuthEvidencePackageRecord {
  id: string;
  framework: ComplianceFramework;
  packageType: string;
  title: string;
  description?: string | null;
  status: "draft" | "sealed" | "released";
  createdBy: string;
  createdAt: string;
  sealedAt?: string | null;
  releasedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuthEvidencePackageItemRecord {
  id: string;
  packageId: string;
  itemType: string;
  itemId: string;
  hash?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuthExportManifestRecord {
  id: string;
  packageId: string;
  manifestHash: string;
  manifestVersion: string;
  immutableSnapshotRef: string;
  createdBy: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface AuditorAccessGrantRecord {
  id: string;
  auditorUserId: string;
  framework: ComplianceFramework;
  packageId?: string | null;
  expiresAt?: string | null;
  status: "active" | "revoked" | "expired";
  createdBy: string;
  createdAt: string;
}
