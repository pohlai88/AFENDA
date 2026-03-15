import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();
const createReviewAttestationMock = vi.fn();
const recordChainOfCustodyEventMock = vi.fn();
const createSignedAuthEvidenceExportMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

vi.mock("@/features/auth/server/compliance/review-attestation.service", () => ({
  createReviewAttestation: (...args: unknown[]) => createReviewAttestationMock(...args),
}));

vi.mock("@/features/auth/server/compliance/chain-of-custody.service", () => ({
  recordChainOfCustodyEvent: (...args: unknown[]) => recordChainOfCustodyEventMock(...args),
}));

vi.mock("@/features/auth/server/compliance/compliance.service", () => ({
  createSignedAuthEvidenceExport: (...args: unknown[]) => createSignedAuthEvidenceExportMock(...args),
}));

describe("internal security compliance routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    publishAuthAuditEventMock.mockReset();
    createReviewAttestationMock.mockReset();
    recordChainOfCustodyEventMock.mockReset();
    createSignedAuthEvidenceExportMock.mockReset();
  });

  it("returns 403 for non-admin attestation request and does not publish audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { POST } = await import("../attestations/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/attestations", {
        method: "POST",
        body: JSON.stringify({ reviewType: "periodic" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(403);
    expect(createReviewAttestationMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("creates attestation, writes chain of custody, and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    createReviewAttestationMock.mockResolvedValue({ id: "att_1" });

    const { POST } = await import("../attestations/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/attestations", {
        method: "POST",
        body: JSON.stringify({
          reviewType: "quarterly",
          framework: "SOX",
          relatedEntityType: "review_cycle",
          relatedEntityId: "rc_1",
          statement: "all controls pass",
          outcome: "pass",
          metadata: { sampleSize: 5 },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(createReviewAttestationMock).toHaveBeenCalled();
    expect(recordChainOfCustodyEventMock).toHaveBeenCalledWith({
      evidenceType: "auth_review_attestation",
      evidenceId: "att_1",
      action: "attested",
      actorUserId: "u_admin",
      metadata: {
        framework: "SOX",
        outcome: "pass",
      },
    });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.attestation_created", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        attestationId: "att_1",
        reviewType: "quarterly",
        framework: "SOX",
        relatedEntityType: "review_cycle",
        relatedEntityId: "rc_1",
        outcome: "pass",
      },
    });
  });

  it("creates evidence export and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    createSignedAuthEvidenceExportMock.mockResolvedValue({
      exportRecord: { id: "exp_1" },
      payload: { rows: 3 },
    });

    const { POST } = await import("../evidence/export/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/evidence/export", {
        method: "POST",
        body: JSON.stringify({
          exportType: "audit_bundle",
          framework: "ISO27001",
          jurisdiction: "US",
          payload: { include: ["incidents"] },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(createSignedAuthEvidenceExportMock).toHaveBeenCalledWith({
      exportType: "audit_bundle",
      framework: "ISO27001",
      jurisdiction: "US",
      createdBy: "u_admin",
      payload: { include: ["incidents"] },
    });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.evidence_export_created", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        exportId: "exp_1",
        exportType: "audit_bundle",
        framework: "ISO27001",
        jurisdiction: "US",
      },
    });
  });
});
