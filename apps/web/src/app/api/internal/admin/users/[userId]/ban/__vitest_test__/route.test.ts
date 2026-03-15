import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const banNeonUserMock = vi.fn();
const unbanNeonUserMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  banNeonUser: (...args: unknown[]) => banNeonUserMock(...args),
  unbanNeonUser: (...args: unknown[]) => unbanNeonUserMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("/api/internal/admin/users/[userId]/ban", () => {
  beforeEach(() => {
    authMock.mockReset();
    banNeonUserMock.mockReset();
    unbanNeonUserMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("blocks self-ban", async () => {
    authMock.mockResolvedValue({ user: { id: "u_1", roles: ["admin"] } });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_1/ban", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_1" }) },
    );

    expect(response.status).toBe(400);
    expect(banNeonUserMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("rejects invalid expiresInSeconds range", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/ban", {
        method: "POST",
        body: JSON.stringify({ reason: "security", expiresInSeconds: 1 }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(400);
    expect(banNeonUserMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("calls ban service for admin", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    banNeonUserMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/ban", {
        method: "POST",
        body: JSON.stringify({ reason: "security", expiresInSeconds: 600 }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(banNeonUserMock).toHaveBeenCalledWith({
      userId: "u_2",
      banReason: "security",
      banExpiresIn: 600,
    });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_user_banned", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "BAN_USER",
        requiredPermission: "admin.user.ban",
        targetUserId: "u_2",
        reason: "security",
        expiresInSeconds: 600,
      },
    });
  });

  it("allows callers with admin.user.ban permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.ban"] },
    });
    banNeonUserMock.mockResolvedValue({ data: null, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/ban", {
        method: "POST",
        body: JSON.stringify({ reason: "security", expiresInSeconds: 600 }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(banNeonUserMock).toHaveBeenCalled();
  });

  it("calls unban service for admin delete", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    unbanNeonUserMock.mockResolvedValue({ data: null, error: null });

    const { DELETE } = await import("../route");
    const response = await DELETE(
      new Request("http://localhost/api/internal/admin/users/u_3/ban", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "u_3" }) },
    );

    expect(response.status).toBe(200);
    expect(unbanNeonUserMock).toHaveBeenCalledWith({ userId: "u_3" });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_user_unbanned", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "UNBAN_USER",
        requiredPermission: "admin.user.unban",
        targetUserId: "u_3",
      },
    });
  });

  it("allows callers with admin.user.unban permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.unban"] },
    });
    unbanNeonUserMock.mockResolvedValue({ data: null, error: null });

    const { DELETE } = await import("../route");
    const response = await DELETE(
      new Request("http://localhost/api/internal/admin/users/u_3/ban", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "u_3" }) },
    );

    expect(response.status).toBe(200);
    expect(unbanNeonUserMock).toHaveBeenCalledWith({ userId: "u_3" });
  });
});
