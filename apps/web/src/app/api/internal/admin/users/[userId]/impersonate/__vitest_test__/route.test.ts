import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const impersonateNeonUserMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  impersonateNeonUser: (...args: unknown[]) => impersonateNeonUserMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("POST /api/internal/admin/users/[userId]/impersonate", () => {
  beforeEach(() => {
    authMock.mockReset();
    impersonateNeonUserMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("returns 403 for non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/impersonate", { method: "POST" }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(403);
    expect(impersonateNeonUserMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("blocks self-impersonation", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", roles: ["admin"] } });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_admin/impersonate", {
        method: "POST",
      }),
      { params: Promise.resolve({ userId: "u_admin" }) },
    );

    expect(response.status).toBe(400);
    expect(impersonateNeonUserMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("starts impersonation and publishes audit", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    impersonateNeonUserMock.mockResolvedValue({ data: { token: "imp_1" }, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/impersonate", { method: "POST" }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(impersonateNeonUserMock).toHaveBeenCalledWith({ userId: "u_2" });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith(
      "auth.ops.admin_user_impersonation_started",
      {
        userId: "u_admin",
        email: "admin@afenda.com",
        metadata: {
          operation: "START_IMPERSONATION",
          requiredPermission: "admin.user.impersonate.start",
          targetUserId: "u_2",
        },
      },
    );
  });

  it("allows callers with admin.user.impersonate.start permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.impersonate.start"] },
    });
    impersonateNeonUserMock.mockResolvedValue({ data: { token: "imp_1" }, error: null });

    const { POST } = await import("../route");
    const response = await POST(
      new Request("http://localhost/api/internal/admin/users/u_2/impersonate", { method: "POST" }),
      { params: Promise.resolve({ userId: "u_2" }) },
    );

    expect(response.status).toBe(200);
    expect(impersonateNeonUserMock).toHaveBeenCalledWith({ userId: "u_2" });
  });
});
