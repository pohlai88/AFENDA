import { beforeEach, describe, expect, it, vi } from "vitest";

const createNeonAuthMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@neondatabase/auth/next/server", () => ({
  createNeonAuth: createNeonAuthMock,
}));

type MockOrganizationApi = {
  list?: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
  inviteMember?: ReturnType<typeof vi.fn>;
  listMembers?: ReturnType<typeof vi.fn>;
  setActive?: ReturnType<typeof vi.fn>;
  setActiveOrganization?: ReturnType<typeof vi.fn>;
  acceptInvitation?: ReturnType<typeof vi.fn>;
};

function buildAuth(organization: MockOrganizationApi = {}) {
  return {
    handler: vi.fn(() => null),
    middleware: vi.fn(() => null),
    getSession: vi.fn(async () => ({ data: null, error: null })),
    changeEmail: vi.fn(async () => ({ data: { ok: true }, error: null })),
    organization,
  };
}

async function loadFacade(organization: MockOrganizationApi = {}) {
  vi.resetModules();
  process.env.NEON_AUTH_BASE_URL = "https://auth.example.test";
  process.env.NEON_AUTH_COOKIE_SECRET = "12345678901234567890123456789012";
  createNeonAuthMock.mockReturnValue(buildAuth(organization));
  return import("../auth/server");
}

describe("auth server typed facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes organizations when listing", async () => {
    const organizationApi = {
      list: vi.fn(async () => ({
        data: [{ id: "org_1", name: "Acme", slug: "acme" }, { id: "", name: "invalid" }, null],
      })),
    };
    const facade = await loadFacade(organizationApi);

    const result = await facade.listNeonOrganizations();

    expect(organizationApi.list).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      data: [{ id: "org_1", name: "Acme", slug: "acme" }],
      error: null,
    });
  });

  it("returns unavailable error when create method does not exist", async () => {
    const facade = await loadFacade({});

    const result = await facade.createNeonOrganization({ name: "Acme" });

    expect(result).toEqual({
      data: null,
      error: { message: "Neon Auth organization.create is unavailable." },
    });
  });

  it("propagates provider error for invite member", async () => {
    const organizationApi = {
      inviteMember: vi.fn(async () => ({ error: { message: "invite disabled" } })),
    };
    const facade = await loadFacade(organizationApi);

    const result = await facade.inviteNeonOrganizationMember({
      organizationId: "org_1",
      email: "member@example.com",
      role: "member",
    });

    expect(result).toEqual({
      data: null,
      error: { message: "invite disabled" },
    });
  });

  it("returns empty members list when listMembers is unavailable", async () => {
    const facade = await loadFacade({});

    const result = await facade.listNeonOrganizationMembers({ organizationId: "org_1" });

    expect(result).toEqual({ data: [], error: null });
  });

  it("uses setActiveOrganization fallback when setActive is not available", async () => {
    const organizationApi = {
      setActiveOrganization: vi.fn(async () => ({ data: { ok: true } })),
    };
    const facade = await loadFacade(organizationApi);

    const result = await facade.setNeonActiveOrganization({ organizationId: "org_1" });

    expect(organizationApi.setActiveOrganization).toHaveBeenCalledWith({ organizationId: "org_1" });
    expect(result).toEqual({ data: { ok: true }, error: null });
  });

  it("returns fallback error when accept invitation throws", async () => {
    const organizationApi = {
      acceptInvitation: vi.fn(async () => {
        throw new Error("request timeout");
      }),
    };
    const facade = await loadFacade(organizationApi);

    const result = await facade.acceptNeonOrganizationInvitation({ invitationId: "inv_1" });

    expect(result).toEqual({
      data: null,
      error: { message: "request timeout" },
    });
  });

  it("returns unavailable error when changeEmail method does not exist", async () => {
    createNeonAuthMock.mockReturnValue({
      ...buildAuth({}),
      changeEmail: undefined,
    });
    vi.resetModules();
    const facadeWithoutChangeEmail = await import("../auth/server");

    const result = await facadeWithoutChangeEmail.changeNeonEmail({
      newEmail: "new@example.com",
    });

    expect(result).toEqual({
      data: null,
      error: { message: "Neon Auth changeEmail is unavailable." },
    });
  });

  it("calls changeEmail when available", async () => {
    const changeEmail = vi.fn(async () => ({ data: { sent: true }, error: null }));
    createNeonAuthMock.mockReturnValue({
      ...buildAuth({}),
      changeEmail,
    });
    vi.resetModules();
    const facade = await import("../auth/server");

    const result = await facade.changeNeonEmail({
      newEmail: "new@example.com",
      callbackURL: "https://app.example.test/auth/verify-email",
    });

    expect(changeEmail).toHaveBeenCalledWith({
      newEmail: "new@example.com",
      callbackURL: "https://app.example.test/auth/verify-email",
    });
    expect(result).toEqual({
      data: { sent: true },
      error: null,
    });
  });
});
