import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();
const archiveOrDeleteOldAuthAuditEventsMock = vi.fn();
const scheduleQuarterlyAuthReviewsMock = vi.fn();
const dispatchReviewRemindersMock = vi.fn();
const dispatchOverdueEscalationsMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.retention", () => ({
  archiveOrDeleteOldAuthAuditEvents: (...args: unknown[]) => archiveOrDeleteOldAuthAuditEventsMock(...args),
}));

vi.mock("@/features/auth/server/execution/review-scheduler.service", () => ({
  scheduleQuarterlyAuthReviews: (...args: unknown[]) => scheduleQuarterlyAuthReviewsMock(...args),
}));

vi.mock("@/features/auth/server/execution/reminder.service", () => ({
  dispatchReviewReminders: (...args: unknown[]) => dispatchReviewRemindersMock(...args),
}));

vi.mock("@/features/auth/server/execution/escalation.service", () => ({
  dispatchOverdueEscalations: (...args: unknown[]) => dispatchOverdueEscalationsMock(...args),
}));

describe("internal security execution routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    publishAuthAuditEventMock.mockReset();
    archiveOrDeleteOldAuthAuditEventsMock.mockReset();
    scheduleQuarterlyAuthReviewsMock.mockReset();
    dispatchReviewRemindersMock.mockReset();
    dispatchOverdueEscalationsMock.mockReset();
  });

  it("archives auth audit data and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    archiveOrDeleteOldAuthAuditEventsMock.mockResolvedValue(7);

    const { POST } = await import("../archive-auth-audit/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(archiveOrDeleteOldAuthAuditEventsMock).toHaveBeenCalledWith(90);
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.auth_audit_archived", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        retentionDays: 90,
        deleted: 7,
      },
    });
  });

  it("generates review cycles and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    scheduleQuarterlyAuthReviewsMock.mockResolvedValue([{ id: "rc_1" }, { id: "rc_2" }]);

    const { POST } = await import("../review-cycles/generate/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(scheduleQuarterlyAuthReviewsMock).toHaveBeenCalledWith({
      frameworks: ["SOX", "ISO27001"],
      ownerUserId: "u_admin",
      reviewerUserId: "u_admin",
      approverUserId: "u_admin",
    });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.review_cycles_generated", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        frameworks: ["SOX", "ISO27001"],
        generatedCount: 2,
      },
    });
  });

  it("dispatches reminders and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    dispatchReviewRemindersMock.mockResolvedValue({ ok: true, sent: 3 });

    const { POST } = await import("../reminders/dispatch/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(dispatchReviewRemindersMock).toHaveBeenCalled();
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.review_reminders_dispatched", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        result: { ok: true, sent: 3 },
      },
    });
  });

  it("dispatches escalations and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    dispatchOverdueEscalationsMock.mockResolvedValue({ ok: true, escalated: 2 });

    const { POST } = await import("../escalations/dispatch/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(dispatchOverdueEscalationsMock).toHaveBeenCalled();
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.escalations_dispatched", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        result: { ok: true, escalated: 2 },
      },
    });
  });
});
