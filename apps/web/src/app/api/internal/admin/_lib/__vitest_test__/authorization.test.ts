import { describe, expect, it } from "vitest";

import { AdminOperation, hasAdminOperationAccess } from "../authorization";

describe("hasAdminOperationAccess", () => {
  it("allows role admin for every operation", () => {
    const session = {
      user: {
        roles: ["admin"],
      },
      activeOrganization: {
        permissions: [],
      },
    };

    expect(hasAdminOperationAccess(session, AdminOperation.SET_USER_ROLE)).toBe(true);
    expect(hasAdminOperationAccess(session, AdminOperation.REMOVE_USER)).toBe(true);
  });

  it("allows org manage fallback permission", () => {
    const session = {
      user: {
        roles: ["member"],
      },
      activeOrganization: {
        permissions: ["admin.org.manage"],
      },
    };

    expect(hasAdminOperationAccess(session, AdminOperation.BAN_USER)).toBe(true);
  });

  it("allows only matching granular permission", () => {
    const session = {
      user: {
        roles: ["member"],
      },
      activeOrganization: {
        permissions: ["admin.user.session.revoke"],
      },
    };

    expect(hasAdminOperationAccess(session, AdminOperation.REVOKE_USER_SESSION)).toBe(true);
    expect(hasAdminOperationAccess(session, AdminOperation.REVOKE_USER_SESSIONS)).toBe(true);
    expect(hasAdminOperationAccess(session, AdminOperation.SET_USER_PASSWORD)).toBe(false);
  });

  it("denies callers with no required permission", () => {
    const session = {
      user: {
        roles: ["member"],
      },
      activeOrganization: {
        permissions: ["admin.settings.read"],
      },
    };

    expect(hasAdminOperationAccess(session, AdminOperation.LIST_USERS)).toBe(false);
  });
});
