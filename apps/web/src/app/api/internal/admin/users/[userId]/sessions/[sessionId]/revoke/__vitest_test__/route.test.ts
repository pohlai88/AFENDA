import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const revokeNeonUserSessionMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  revokeNeonUserSession: (...args: unknown[]) => revokeNeonUserSessionMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("POST /api/internal/admin/users/[userId]/sessions/[sessionId]/revoke", () => {
  beforeEach(() => {
    authMock.mockReset();
    revokeNeonUserSessionMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("returns 403 for non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/sessions/s_1/revoke", {
        method: "POST",
      }),
      { params: Promise.resolve({ userId: "u_2", sessionId: "s_1" }) },
    );

    expect(response.status).toBe(403);
    expect(revokeNeonUserSessionMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("revokes a specific user session and publishes audit", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    revokeNeonUserSessionMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/sessions/s_1/revoke", {
        method: "POST",
      }),
      { params: Promise.resolve({ userId: "u_2", sessionId: "s_1" }) },
    );

    expect(response.status).toBe(200);
    expect(revokeNeonUserSessionMock).toHaveBeenCalledWith({ userId: "u_2", sessionId: "s_1" });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_user_session_revoked", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "REVOKE_USER_SESSION",
        requiredPermission: "admin.user.session.revoke",
        targetUserId: "u_2",
        targetSessionId: "s_1",
      },
    });
  });

  it("allows callers with admin.user.session.revoke permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.session.revoke"] },
    });
    revokeNeonUserSessionMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/sessions/s_1/revoke", {
        method: "POST",
      }),
      { params: Promise.resolve({ userId: "u_2", sessionId: "s_1" }) },
    );

    expect(response.status).toBe(200);
    expect(revokeNeonUserSessionMock).toHaveBeenCalledWith({ userId: "u_2", sessionId: "s_1" });
  });
});
