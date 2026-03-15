import React from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const reactMocks = vi.hoisted(() => ({
  useStateMock: vi.fn(),
  useTransitionMock: vi.fn(),
  useEffectMock: vi.fn(),
}));

const authClientMocks = vi.hoisted(() => ({
  createNeonClientOrganizationMock: vi.fn(),
  inviteNeonClientOrganizationMemberMock: vi.fn(),
  useActiveOrganizationMock: vi.fn(),
}));

const uiMocks = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
}));

let transitionTasks: Promise<void>[] = [];

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useState: reactMocks.useStateMock,
    useTransition: reactMocks.useTransitionMock,
    useEffect: reactMocks.useEffectMock,
  };
});

vi.mock("@/lib/auth/client", () => ({
  createNeonClientOrganization: (...args: unknown[]) =>
    authClientMocks.createNeonClientOrganizationMock(...args),
  inviteNeonClientOrganizationMember: (...args: unknown[]) =>
    authClientMocks.inviteNeonClientOrganizationMemberMock(...args),
  useActiveOrganization: () => authClientMocks.useActiveOrganizationMock(),
  neonClientCapabilities: {
    organization: {
      create: true,
      inviteMember: true,
    },
  },
}));

vi.mock("@afenda/ui", () => ({
  Alert: "af-alert",
  AlertDescription: "af-alert-description",
  AlertTitle: "af-alert-title",
  Button: "af-button",
  Card: "af-card",
  CardContent: "af-card-content",
  CardDescription: "af-card-description",
  CardHeader: "af-card-header",
  CardTitle: "af-card-title",
  Input: "af-input",
  Label: "af-label",
  Select: "af-select",
  SelectContent: "af-select-content",
  SelectItem: "af-select-item",
  SelectTrigger: "af-select-trigger",
  SelectValue: "af-select-value",
  Spinner: "af-spinner",
  toast: {
    success: (...args: unknown[]) => uiMocks.toastSuccessMock(...args),
  },
}));

function setupStateSequence(values: unknown[]) {
  let index = 0;
  reactMocks.useStateMock.mockImplementation((initialValue: unknown) => [
    index < values.length ? values[index++] : initialValue,
    vi.fn(),
  ]);
}

function setupTransitionMock() {
  transitionTasks = [];
  reactMocks.useTransitionMock.mockImplementation(() => [
    false,
    (callback: () => Promise<void> | void) => {
      const task = Promise.resolve().then(async () => {
        await callback();
      });
      transitionTasks.push(task.then(() => undefined));
    },
  ]);
}

async function flushTransitions() {
  await Promise.all(transitionTasks);
}

function findNode(
  node: unknown,
  predicate: (value: { type?: unknown; props?: Record<string, unknown> }) => boolean,
): { type?: unknown; props?: Record<string, unknown> } | null {
  if (!node || typeof node !== "object") {
    return null;
  }

  const candidate = node as { type?: unknown; props?: Record<string, unknown> };
  if (predicate(candidate)) {
    return candidate;
  }

  const children = candidate.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findNode(child, predicate);
      if (found) {
        return found;
      }
    }
    return null;
  }

  return children ? findNode(children, predicate) : null;
}

describe("organization mutation panels", () => {
  beforeAll(() => {
    vi.stubGlobal("React", React);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.resetModules();
    reactMocks.useStateMock.mockReset();
    reactMocks.useTransitionMock.mockReset();
    reactMocks.useEffectMock.mockReset();
    reactMocks.useEffectMock.mockImplementation(() => undefined);
    authClientMocks.createNeonClientOrganizationMock.mockReset();
    authClientMocks.inviteNeonClientOrganizationMemberMock.mockReset();
    authClientMocks.useActiveOrganizationMock.mockReset();
    uiMocks.toastSuccessMock.mockReset();
    setupTransitionMock();
  });

  it("calls parent refresh callback after create organization succeeds", async () => {
    setupStateSequence(["Acme Holdings", "acme-holdings", null, null]);
    authClientMocks.createNeonClientOrganizationMock.mockResolvedValue({
      data: { id: "org_1" },
      error: null,
    });

    const onMutationSuccess = vi.fn();
    const { CreateOrganizationClient } = await import("../CreateOrganizationClient");
    const tree = CreateOrganizationClient({ onMutationSuccess });
    const form = findNode(tree, (node) => node.type === "form");

    expect(form).toBeTruthy();

    const onSubmit = form?.props?.onSubmit as
      | ((event: { preventDefault: () => void }) => void)
      | undefined;

    onSubmit?.({
      preventDefault: vi.fn(),
    });

    await flushTransitions();

    expect(authClientMocks.createNeonClientOrganizationMock).toHaveBeenCalledWith({
      name: "Acme Holdings",
      slug: "acme-holdings",
    });
    expect(uiMocks.toastSuccessMock).toHaveBeenCalledWith("Organization created.");
    expect(onMutationSuccess).toHaveBeenCalledTimes(1);
  });

  it("does not call parent refresh callback after create organization fails", async () => {
    setupStateSequence(["Acme Holdings", "acme-holdings", null, null]);
    authClientMocks.createNeonClientOrganizationMock.mockResolvedValue({
      data: null,
      error: { message: "slug already exists" },
    });

    const onMutationSuccess = vi.fn();
    const { CreateOrganizationClient } = await import("../CreateOrganizationClient");
    const tree = CreateOrganizationClient({ onMutationSuccess });
    const form = findNode(tree, (node) => node.type === "form");

    expect(form).toBeTruthy();

    const onSubmit = form?.props?.onSubmit as
      | ((event: { preventDefault: () => void }) => void)
      | undefined;

    onSubmit?.({
      preventDefault: vi.fn(),
    });

    await flushTransitions();

    expect(authClientMocks.createNeonClientOrganizationMock).toHaveBeenCalledWith({
      name: "Acme Holdings",
      slug: "acme-holdings",
    });
    expect(uiMocks.toastSuccessMock).not.toHaveBeenCalled();
    expect(onMutationSuccess).not.toHaveBeenCalled();
  });

  it("does not call parent refresh callback after create organization throws", async () => {
    setupStateSequence(["Acme Holdings", "acme-holdings", null, null]);
    authClientMocks.createNeonClientOrganizationMock.mockRejectedValue(
      new Error("network unavailable"),
    );

    const onMutationSuccess = vi.fn();
    const { CreateOrganizationClient } = await import("../CreateOrganizationClient");
    const tree = CreateOrganizationClient({ onMutationSuccess });
    const form = findNode(tree, (node) => node.type === "form");

    expect(form).toBeTruthy();

    const onSubmit = form?.props?.onSubmit as
      | ((event: { preventDefault: () => void }) => void)
      | undefined;

    onSubmit?.({
      preventDefault: vi.fn(),
    });

    await expect(flushTransitions()).rejects.toThrow("network unavailable");

    expect(authClientMocks.createNeonClientOrganizationMock).toHaveBeenCalledWith({
      name: "Acme Holdings",
      slug: "acme-holdings",
    });
    expect(uiMocks.toastSuccessMock).not.toHaveBeenCalled();
    expect(onMutationSuccess).not.toHaveBeenCalled();
  });

  it("calls parent refresh callback after invite member succeeds", async () => {
    setupStateSequence(["org_123", "member@example.com", "admin", null, null]);
    authClientMocks.useActiveOrganizationMock.mockReturnValue({
      data: { id: "org_123" },
    });
    authClientMocks.inviteNeonClientOrganizationMemberMock.mockResolvedValue({
      data: { id: "inv_1" },
      error: null,
    });

    const onMutationSuccess = vi.fn();
    const { InviteMemberClient } = await import("../InviteMemberClient");
    const tree = InviteMemberClient({ onMutationSuccess });
    const form = findNode(tree, (node) => node.type === "form");

    expect(form).toBeTruthy();

    const onSubmit = form?.props?.onSubmit as
      | ((event: { preventDefault: () => void }) => void)
      | undefined;

    onSubmit?.({
      preventDefault: vi.fn(),
    });

    await flushTransitions();

    expect(authClientMocks.inviteNeonClientOrganizationMemberMock).toHaveBeenCalledWith({
      organizationId: "org_123",
      email: "member@example.com",
      role: "admin",
    });
    expect(uiMocks.toastSuccessMock).toHaveBeenCalledWith("Invitation sent.");
    expect(onMutationSuccess).toHaveBeenCalledTimes(1);
  });

  it("does not call parent refresh callback after invite member fails", async () => {
    setupStateSequence(["org_123", "member@example.com", "admin", null, null]);
    authClientMocks.useActiveOrganizationMock.mockReturnValue({
      data: { id: "org_123" },
    });
    authClientMocks.inviteNeonClientOrganizationMemberMock.mockResolvedValue({
      data: null,
      error: { message: "invite failed" },
    });

    const onMutationSuccess = vi.fn();
    const { InviteMemberClient } = await import("../InviteMemberClient");
    const tree = InviteMemberClient({ onMutationSuccess });
    const form = findNode(tree, (node) => node.type === "form");

    expect(form).toBeTruthy();

    const onSubmit = form?.props?.onSubmit as
      | ((event: { preventDefault: () => void }) => void)
      | undefined;

    onSubmit?.({
      preventDefault: vi.fn(),
    });

    await flushTransitions();

    expect(authClientMocks.inviteNeonClientOrganizationMemberMock).toHaveBeenCalledWith({
      organizationId: "org_123",
      email: "member@example.com",
      role: "admin",
    });
    expect(uiMocks.toastSuccessMock).not.toHaveBeenCalled();
    expect(onMutationSuccess).not.toHaveBeenCalled();
  });

  it("does not call parent refresh callback after invite member throws", async () => {
    setupStateSequence(["org_123", "member@example.com", "admin", null, null]);
    authClientMocks.useActiveOrganizationMock.mockReturnValue({
      data: { id: "org_123" },
    });
    authClientMocks.inviteNeonClientOrganizationMemberMock.mockRejectedValue(
      new Error("request aborted"),
    );

    const onMutationSuccess = vi.fn();
    const { InviteMemberClient } = await import("../InviteMemberClient");
    const tree = InviteMemberClient({ onMutationSuccess });
    const form = findNode(tree, (node) => node.type === "form");

    expect(form).toBeTruthy();

    const onSubmit = form?.props?.onSubmit as
      | ((event: { preventDefault: () => void }) => void)
      | undefined;

    onSubmit?.({
      preventDefault: vi.fn(),
    });

    await expect(flushTransitions()).rejects.toThrow("request aborted");

    expect(authClientMocks.inviteNeonClientOrganizationMemberMock).toHaveBeenCalledWith({
      organizationId: "org_123",
      email: "member@example.com",
      role: "admin",
    });
    expect(uiMocks.toastSuccessMock).not.toHaveBeenCalled();
    expect(onMutationSuccess).not.toHaveBeenCalled();
  });
});
