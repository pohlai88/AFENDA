import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const setNeonUserRoleMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  setNeonUserRole: (...args: unknown[]) => setNeonUserRoleMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("POST /api/internal/admin/users/[userId]/role", () => {
  beforeEach(() => {
    authMock.mockReset();
    setNeonUserRoleMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("returns 403 for non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/role", {
        method: "POST",
        body: JSON.stringify({ role: "admin" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(403);
    expect(setNeonUserRoleMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("validates role payload", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", roles: ["admin"] } });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/role", {
        method: "POST",
        body: JSON.stringify({ role: "" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(400);
    expect(setNeonUserRoleMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("sets role and publishes audit", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    setNeonUserRoleMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/role", {
        method: "POST",
        body: JSON.stringify({ role: "operator" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(setNeonUserRoleMock).toHaveBeenCalledWith({ userId: "u_2", role: "operator" });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_user_role_set", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "SET_USER_ROLE",
        requiredPermission: "admin.user.role.set",
        targetUserId: "u_2",
        role: "operator",
      },
    });
  });

  it("allows callers with admin.user.role.set permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.role.set"] },
    });
    setNeonUserRoleMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/role", {
        method: "POST",
        body: JSON.stringify({ role: "operator" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(setNeonUserRoleMock).toHaveBeenCalledWith({ userId: "u_2", role: "operator" });
  });
});
