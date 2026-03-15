import { beforeEach, describe, expect, it, vi } from "vitest";

const createAuthClientMock = vi.fn();

const mockClient = {
  accountInfo: vi.fn(),
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  organization: {
    create: vi.fn(),
    list: vi.fn(),
    setActive: vi.fn(),
    inviteMember: vi.fn(),
  },
  emailOtp: {
    sendVerificationOtp: vi.fn(),
    verifyEmail: vi.fn(),
  },
  signIn: {
    emailOtp: vi.fn(),
  },
};

vi.mock("@neondatabase/auth/next", () => ({
  createAuthClient: createAuthClientMock,
}));

async function loadFacade() {
  vi.resetModules();
  createAuthClientMock.mockReturnValue(mockClient);
  return import("../auth/client");
}

describe("auth client typed facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists organizations through the typed facade", async () => {
    const facade = await loadFacade();
    mockClient.organization.list.mockResolvedValue({
      data: [{ id: "org_1", name: "Acme" }],
    });

    const result = await facade.listNeonClientOrganizations();

    expect(mockClient.organization.list).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      data: [{ id: "org_1", name: "Acme" }],
      error: null,
    });
  });

  it("returns provider error message for invite member", async () => {
    const facade = await loadFacade();
    mockClient.organization.inviteMember.mockResolvedValue({
      error: { message: "permission denied" },
    });

    const result = await facade.inviteNeonClientOrganizationMember({
      organizationId: "org_1",
      email: "member@example.com",
      role: "member",
    });

    expect(result).toEqual({
      data: null,
      error: { message: "permission denied" },
    });
  });

  it("falls back to default error message when create throws", async () => {
    const facade = await loadFacade();
    mockClient.organization.create.mockRejectedValue(new Error("network unavailable"));

    const result = await facade.createNeonClientOrganization({ name: "Acme" });

    expect(result).toEqual({
      data: null,
      error: { message: "network unavailable" },
    });
  });

  it("uses fallback message when set active returns a malformed error", async () => {
    const facade = await loadFacade();
    mockClient.organization.setActive.mockResolvedValue({
      error: { code: "UNKNOWN" },
    });

    const result = await facade.setNeonClientActiveOrganization({ organizationId: "org_1" });

    expect(result).toEqual({
      data: null,
      error: { message: "Unable to set active organization." },
    });
  });

  it("sends verification otp through typed emailOtp wrapper", async () => {
    const facade = await loadFacade();
    mockClient.emailOtp.sendVerificationOtp.mockResolvedValue({ data: { sent: true } });

    const result = await facade.sendNeonClientVerificationOtp({
      email: "user@example.com",
      type: "sign-in",
    });

    expect(mockClient.emailOtp.sendVerificationOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      type: "sign-in",
    });
    expect(result).toEqual({
      data: { sent: true },
      error: null,
    });
  });

  it("signs in with email otp through typed signIn wrapper", async () => {
    const facade = await loadFacade();
    mockClient.signIn.emailOtp.mockResolvedValue({ data: { token: "token_1" } });

    const result = await facade.signInWithNeonClientEmailOtp({
      email: "user@example.com",
      otp: "123456",
    });

    expect(mockClient.signIn.emailOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      otp: "123456",
    });
    expect(result).toEqual({
      data: { token: "token_1" },
      error: null,
    });
  });

  it("exposes deterministic client capabilities for organization flows", async () => {
    const facade = await loadFacade();

    expect(facade.neonClientCapabilities.organization.list).toBe(true);
    expect(facade.neonClientCapabilities.organization.setActive).toBe(true);
    expect(facade.neonClientCapabilities.organization.create).toBe(true);
    expect(facade.neonClientCapabilities.organization.inviteMember).toBe(true);
  });
});
