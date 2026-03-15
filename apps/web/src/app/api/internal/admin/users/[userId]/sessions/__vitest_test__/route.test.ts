import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const listNeonAdminUserSessionsMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  listNeonAdminUserSessions: (...args: unknown[]) => listNeonAdminUserSessionsMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("GET /api/internal/admin/users/[userId]/sessions", () => {
  beforeEach(() => {
    authMock.mockReset();
    listNeonAdminUserSessionsMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("returns 403 for non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { GET } = await import("../route");
    const response = await GET(
      new Request("http://localhost/api/internal/admin/users/u_1/sessions?offset=0&limit=10"),
      { params: Promise.resolve({ userId: "u_1" }) },
    );

    expect(response.status).toBe(403);
    expect(listNeonAdminUserSessionsMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("returns user sessions for admins and publishes audit", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    listNeonAdminUserSessionsMock.mockResolvedValue({
      data: {
        sessions: [{ id: "s_1", userId: "u_1" }],
        total: 1,
      },
      error: null,
    });

    const { GET } = await import("../route");
    const response = await GET(
      new Request("http://localhost/api/internal/admin/users/u_1/sessions?offset=0&limit=10"),
      { params: Promise.resolve({ userId: "u_1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sessions).toHaveLength(1);
    expect(listNeonAdminUserSessionsMock).toHaveBeenCalledWith({
      userId: "u_1",
      query: {
        offset: 0,
        limit: 10,
      },
    });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_user_sessions_listed", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "LIST_USER_SESSIONS",
        requiredPermission: "admin.user.session.read",
        targetUserId: "u_1",
        offset: 0,
        limit: 10,
        total: 1,
      },
    });
  });

  it("allows callers with admin.user.session.read permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.session.read"] },
    });
    listNeonAdminUserSessionsMock.mockResolvedValue({
      data: { sessions: [{ id: "s_1", userId: "u_1" }], total: 1 },
      error: null,
    });

    const { GET } = await import("../route");
    const response = await GET(
      new Request("http://localhost/api/internal/admin/users/u_1/sessions?offset=0&limit=10"),
      { params: Promise.resolve({ userId: "u_1" }) },
    );

    expect(response.status).toBe(200);
    expect(listNeonAdminUserSessionsMock).toHaveBeenCalled();
  });
});
