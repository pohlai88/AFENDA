export type ComplianceFramework =
  | "SOX"
  | "ISO27001"
  | "SOC2"
  | "INTERNAL";
export type ReviewStatus =
  | "open"
  | "in_review"
  | "approved"
  | "rejected"
  | "closed";
export type ControlRunStatus = "passed" | "failed" | "warning";
export type EvidenceExportStatus =
  | "generated"
  | "signed"
  | "released"
  | "expired";

export interface AuthControlDefinition {
  code: string;
  name: string;
  description: string;
  framework: ComplianceFramework;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  ownerRole: string;
}

export interface AuthControlRunRecord {
  id: string;
  controlCode: string;
  framework: ComplianceFramework;
  status: ControlRunStatus;
  summary: string;
  findingsCount: number;
  startedAt: string;
  completedAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface AuthReviewAttestationRecord {
  id: string;
  reviewType: string;
  framework: ComplianceFramework;
  relatedEntityType: string;
  relatedEntityId: string;
  attestedBy: string;
  attestedAt: string;
  statement: string;
  outcome: "accepted" | "rejected" | "exception_noted";
  metadata?: Record<string, unknown> | null;
}

export interface AuthEvidenceExportRecord {
  id: string;
  exportType: string;
  framework: ComplianceFramework;
  status: EvidenceExportStatus;
  fileName: string;
  fileHash: string;
  signature?: string | null;
  signedAt?: string | null;
  expiresAt?: string | null;
  createdBy: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface AuthChainOfCustodyRecord {
  id: string;
  evidenceType: string;
  evidenceId: string;
  action: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  timestamp: string;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuthReviewCaseRecord {
  id: string;
  framework: ComplianceFramework;
  status: ReviewStatus;
  title: string;
  description?: string | null;
  ownerUserId?: string | null;
  dueAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
