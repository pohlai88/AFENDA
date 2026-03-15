import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();
const retryFailedOutboxEventMock = vi.fn();
const forceDeadLetterOutboxEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit-ops.service", () => ({
  retryFailedOutboxEvent: (...args: unknown[]) => retryFailedOutboxEventMock(...args),
  forceDeadLetterOutboxEvent: (...args: unknown[]) => forceDeadLetterOutboxEventMock(...args),
}));

describe("internal security outbox routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    publishAuthAuditEventMock.mockReset();
    retryFailedOutboxEventMock.mockReset();
    forceDeadLetterOutboxEventMock.mockReset();
  });

  it("returns 400 for retry-outbox without eventId and does not publish audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", roles: ["admin"] } });

    const { POST } = await import("../retry-outbox/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/retry-outbox", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(retryFailedOutboxEventMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("retries outbox event and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    retryFailedOutboxEventMock.mockResolvedValue(true);

    const { POST } = await import("../retry-outbox/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/retry-outbox", {
        method: "POST",
        body: JSON.stringify({ eventId: "evt_1" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(retryFailedOutboxEventMock).toHaveBeenCalledWith("evt_1", "u_admin");
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.outbox_retry", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        eventId: "evt_1",
        ok: true,
      },
    });
  });

  it("dead-letters outbox event and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    forceDeadLetterOutboxEventMock.mockResolvedValue(true);

    const { POST } = await import("../dead-letter-outbox/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/dead-letter-outbox", {
        method: "POST",
        body: JSON.stringify({ eventId: "evt_2", reason: "manual_triage" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(forceDeadLetterOutboxEventMock).toHaveBeenCalledWith("evt_2", "u_admin", "manual_triage");
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.outbox_dead_letter", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        eventId: "evt_2",
        reason: "manual_triage",
        ok: true,
      },
    });
  });
});
