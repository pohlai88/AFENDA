import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const setNeonUserPasswordMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  setNeonUserPassword: (...args: unknown[]) => setNeonUserPasswordMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("POST /api/internal/admin/users/[userId]/password", () => {
  beforeEach(() => {
    authMock.mockReset();
    setNeonUserPasswordMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("returns 403 for non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "A_secure_password_123" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(403);
    expect(setNeonUserPasswordMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("validates minimum password length", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", roles: ["admin"] } });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "short" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(400);
    expect(setNeonUserPasswordMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("sets user password and publishes audit", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    setNeonUserPasswordMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "A_secure_password_123" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(setNeonUserPasswordMock).toHaveBeenCalledWith({
      userId: "u_2",
      newPassword: "A_secure_password_123",
    });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_user_password_set", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "SET_USER_PASSWORD",
        requiredPermission: "admin.user.password.set",
        targetUserId: "u_2",
        passwordLength: 21,
      },
    });
  });

  it("allows callers with admin.user.password.set permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.password.set"] },
    });
    setNeonUserPasswordMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/password", {
        method: "POST",
        body: JSON.stringify({ newPassword: "A_secure_password_123" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(setNeonUserPasswordMock).toHaveBeenCalledWith({
      userId: "u_2",
      newPassword: "A_secure_password_123",
    });
  });
});
