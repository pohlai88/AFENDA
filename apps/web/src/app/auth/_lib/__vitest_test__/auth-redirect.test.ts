import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/tenant-context", () => ({
  buildSelectOrganizationRedirect: (callbackUrl?: string | null) =>
    `/auth/select-organization?callback=${encodeURIComponent(callbackUrl ?? "/app")}`,
}));

const isTenantRoutingV2EnabledMock = vi.fn(() => true);

vi.mock("@/lib/feature-flags", () => ({
  isTenantRoutingV2Enabled: () => isTenantRoutingV2EnabledMock(),
}));

import {
  normalizeCallbackUrl,
  resolveOrganizationPostSignInRedirect,
} from "../auth-redirect";

describe("auth redirect", () => {
  beforeEach(() => {
    isTenantRoutingV2EnabledMock.mockReset();
    isTenantRoutingV2EnabledMock.mockReturnValue(true);
  });

  it("normalizes only internal callback paths", () => {
    expect(normalizeCallbackUrl("/app")).toBe("/app");
    expect(normalizeCallbackUrl("https://example.com/app")).toBeUndefined();
    expect(normalizeCallbackUrl(undefined)).toBeUndefined();
  });

  it("routes app signin through organization selector when feature flag enabled", () => {
    expect(resolveOrganizationPostSignInRedirect("/finance/ap/invoices")).toBe(
      "/auth/select-organization?callback=%2Ffinance%2Fap%2Finvoices",
    );
  });

  it("falls back to app path when feature flag disabled", () => {
    isTenantRoutingV2EnabledMock.mockReturnValue(false);
    expect(resolveOrganizationPostSignInRedirect("/finance/ap/invoices")).toBe(
      "/finance/ap/invoices",
    );
    expect(resolveOrganizationPostSignInRedirect("https://example.com")).toBe("/app");
  });
});
