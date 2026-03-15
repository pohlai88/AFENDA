import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const stopNeonImpersonationMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  stopNeonImpersonation: (...args: unknown[]) => stopNeonImpersonationMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("DELETE /api/internal/admin/impersonation", () => {
  beforeEach(() => {
    authMock.mockReset();
    stopNeonImpersonationMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("returns 403 for non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { DELETE } = await import("../route");
    const response = await DELETE();

    expect(response.status).toBe(403);
    expect(stopNeonImpersonationMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("stops impersonation and publishes audit", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    stopNeonImpersonationMock.mockResolvedValue({ data: { stopped: true }, error: null });

    const { DELETE } = await import("../route");
    const response = await DELETE();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(stopNeonImpersonationMock).toHaveBeenCalled();
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith(
      "auth.ops.admin_user_impersonation_stopped",
      {
        userId: "u_admin",
        email: "admin@afenda.com",
        metadata: {
          operation: "STOP_IMPERSONATION",
          requiredPermission: "admin.user.impersonate.stop",
        },
      },
    );
  });

  it("allows callers with admin.user.impersonate.stop permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.impersonate.stop"] },
    });
    stopNeonImpersonationMock.mockResolvedValue({ data: { stopped: true }, error: null });

    const { DELETE } = await import("../route");
    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(stopNeonImpersonationMock).toHaveBeenCalled();
  });
});
