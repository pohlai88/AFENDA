import React from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let refreshNonce = 0;
const setRefreshNonce = vi.fn((updater: number | ((current: number) => number)) => {
  refreshNonce = typeof updater === "function" ? updater(refreshNonce) : updater;
});

vi.mock("../ListOrganizationsClient", () => ({
  ListOrganizationsClient: (props: { refreshNonce?: number }) => ({
    type: "list-organizations-client",
    props,
  }),
}));

vi.mock("../InviteMemberClient", () => ({
  InviteMemberClient: (props: { onMutationSuccess?: () => void }) => ({
    type: "invite-member-client",
    props,
  }),
}));

vi.mock("../CreateOrganizationClient", () => ({
  CreateOrganizationClient: (props: { onMutationSuccess?: () => void }) => ({
    type: "create-organization-client",
    props,
  }),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useState: vi.fn(() => [refreshNonce, setRefreshNonce]),
    useCallback: vi.fn((callback: (...args: unknown[]) => unknown) => callback),
  };
});

function toChildArray(node: unknown) {
  if (!node || typeof node !== "object" || !("props" in node)) {
    return [] as unknown[];
  }

  const props = (node as { props?: { children?: unknown } }).props;
  if (!props) {
    return [] as unknown[];
  }

  return Array.isArray(props.children) ? props.children : [props.children];
}

describe("OrganizationsSettingsClient", () => {
  beforeAll(() => {
    vi.stubGlobal("React", React);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    refreshNonce = 0;
    setRefreshNonce.mockClear();
    vi.resetModules();
  });

  it("passes initial refresh nonce to list panel and refresh callbacks to mutation panels", async () => {
    const { OrganizationsSettingsClient } = await import("../OrganizationsSettingsClient");

    const tree = OrganizationsSettingsClient();
    const children = toChildArray(tree);

    const listElement = children[0] as { props: { refreshNonce: number } };
    const inviteElement = children[2] as { props: { onMutationSuccess: () => void } };
    const createElement = children[4] as { props: { onMutationSuccess: () => void } };

    expect(listElement.props.refreshNonce).toBe(0);
    expect(inviteElement.props.onMutationSuccess).toEqual(expect.any(Function));
    expect(createElement.props.onMutationSuccess).toEqual(expect.any(Function));
  });

  it("increments refresh nonce when a child success callback is invoked", async () => {
    const { OrganizationsSettingsClient } = await import("../OrganizationsSettingsClient");

    const firstTree = OrganizationsSettingsClient();
    const firstChildren = toChildArray(firstTree);
    const inviteElement = firstChildren[2] as { props: { onMutationSuccess: () => void } };

    inviteElement.props.onMutationSuccess();

    expect(setRefreshNonce).toHaveBeenCalledTimes(1);
    expect(refreshNonce).toBe(1);

    const secondTree = OrganizationsSettingsClient();
    const secondChildren = toChildArray(secondTree);
    const listElement = secondChildren[0] as { props: { refreshNonce: number } };

    expect(listElement.props.refreshNonce).toBe(1);
  });
});
