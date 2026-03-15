import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const getNeonAdminUserMock = vi.fn();
const removeNeonUserMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  getNeonAdminUser: (...args: unknown[]) => getNeonAdminUserMock(...args),
  removeNeonUser: (...args: unknown[]) => removeNeonUserMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("GET /api/internal/admin/users/[userId]", () => {
  beforeEach(() => {
    authMock.mockReset();
    getNeonAdminUserMock.mockReset();
    removeNeonUserMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("returns 403 for non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/internal/admin/users/u_1"), {
      params: Promise.resolve({ userId: "u_1" }),
    });

    expect(response.status).toBe(403);
    expect(getNeonAdminUserMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("returns user details for admins and publishes audit", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    getNeonAdminUserMock.mockResolvedValue({
      data: {
        id: "u_1",
        email: "user@afenda.com",
        banned: false,
      },
      error: null,
    });

    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/internal/admin/users/u_1"), {
      params: Promise.resolve({ userId: "u_1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.id).toBe("u_1");
    expect(getNeonAdminUserMock).toHaveBeenCalledWith({ userId: "u_1" });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_user_read", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "READ_USER",
        requiredPermission: "admin.user.read",
        targetUserId: "u_1",
        found: true,
      },
    });
  });

  it("allows callers with admin.user.read permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.read"] },
    });
    getNeonAdminUserMock.mockResolvedValue({
      data: { id: "u_1", email: "user@afenda.com", banned: false },
      error: null,
    });

    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/internal/admin/users/u_1"), {
      params: Promise.resolve({ userId: "u_1" }),
    });

    expect(response.status).toBe(200);
    expect(getNeonAdminUserMock).toHaveBeenCalledWith({ userId: "u_1" });
  });

  it("blocks self-user deletion", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", roles: ["admin"] } });

    const { DELETE } = await import("../route");
    const response = await DELETE(
      new Request("http://localhost/api/internal/admin/users/u_admin", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "u_admin" }) },
    );

    expect(response.status).toBe(400);
    expect(removeNeonUserMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("removes user for admins and publishes audit", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    removeNeonUserMock.mockResolvedValue({ data: null, error: null });

    const { DELETE } = await import("../route");
    const response = await DELETE(
      new Request("http://localhost/api/internal/admin/users/u_2", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(removeNeonUserMock).toHaveBeenCalledWith({ userId: "u_2" });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_user_removed", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "REMOVE_USER",
        requiredPermission: "admin.user.remove",
        targetUserId: "u_2",
      },
    });
  });

  it("allows callers with admin.user.remove permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.remove"] },
    });
    removeNeonUserMock.mockResolvedValue({ data: null, error: null });

    const { DELETE } = await import("../route");
    const response = await DELETE(
      new Request("http://localhost/api/internal/admin/users/u_2", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(removeNeonUserMock).toHaveBeenCalledWith({ userId: "u_2" });
  });
});
