import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const listNeonAdminUsersMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/auth/server", () => ({
  listNeonAdminUsers: (...args: unknown[]) => listNeonAdminUsersMock(...args),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

describe("GET /api/internal/admin/users", () => {
  beforeEach(() => {
    authMock.mockReset();
    listNeonAdminUsersMock.mockReset();
    publishAuthAuditEventMock.mockReset();
  });

  it("returns 403 for non-admin callers", async () => {
    authMock.mockResolvedValue({ user: { roles: ["member"] } });

    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/internal/admin/users"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: "Forbidden" });
    expect(listNeonAdminUsersMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("returns user list for admins", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] },
    });
    listNeonAdminUsersMock.mockResolvedValue({
      data: {
        users: [{ id: "u_1", email: "admin@afenda.com", banned: false }],
        total: 1,
      },
      error: null,
    });

    const { GET } = await import("../route");
    const response = await GET(
      new Request("http://localhost/api/internal/admin/users?limit=10&offset=0&search=admin"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listNeonAdminUsersMock).toHaveBeenCalledWith({
      query: {
        searchValue: "admin",
        offset: 0,
        limit: 10,
      },
    });
    expect(body.users).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.admin_users_listed", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        operation: "LIST_USERS",
        requiredPermission: "admin.user.list",
        search: "admin",
        offset: 0,
        limit: 10,
        total: 1,
      },
    });
  });

  it("allows callers with admin.user.list permission", async () => {
    authMock.mockResolvedValue({
      user: { id: "u_delegate", email: "delegate@afenda.com", roles: ["member"] },
      activeOrganization: { permissions: ["admin.user.list"] },
    });
    listNeonAdminUsersMock.mockResolvedValue({
      data: { users: [{ id: "u_1", email: "admin@afenda.com", banned: false }], total: 1 },
      error: null,
    });

    const { GET } = await import("../route");
    const response = await GET(new Request("http://localhost/api/internal/admin/users?limit=10"));

    expect(response.status).toBe(200);
    expect(listNeonAdminUsersMock).toHaveBeenCalled();
  });
});
