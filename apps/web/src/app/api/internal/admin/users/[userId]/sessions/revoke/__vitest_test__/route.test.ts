import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const revokeAllNeonUserSessionsMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  revokeAllNeonUserSessions: (...args: unknown[]) => revokeAllNeonUserSessionsMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("POST /api/internal/admin/users/[userId]/sessions/revoke", () => {
  beforeEach(() => {
    authMock.mockReset();
    revokeAllNeonUserSessionsMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("returns 403 for non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/sessions/revoke", {
        method: "POST",
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(403);
    expect(revokeAllNeonUserSessionsMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("revokes all user sessions and publishes audit", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    revokeAllNeonUserSessionsMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/sessions/revoke", {
        method: "POST",
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(revokeAllNeonUserSessionsMock).toHaveBeenCalledWith({ userId: "u_2" });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_user_sessions_revoked", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "REVOKE_USER_SESSIONS",
        requiredPermission: "admin.user.session.revoke",
        targetUserId: "u_2",
      },
    });
  });

  it("allows callers with admin.user.session.revoke permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.session.revoke"] },
    });
    revokeAllNeonUserSessionsMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/sessions/revoke", {
        method: "POST",
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(revokeAllNeonUserSessionsMock).toHaveBeenCalledWith({ userId: "u_2" });
  });
});
