import { describe, expect, it } from "vitest";
import { isPublicFacingPath } from "../shell-paths";

describe("isPublicFacingPath", () => {
  it("returns true for auth root and children", () => {
    expect(isPublicFacingPath("/auth")).toBe(true);
    expect(isPublicFacingPath("/auth/signin")).toBe(true);
    expect(isPublicFacingPath("/auth/reset-password/status")).toBe(true);
  });

  it("returns true for marketing root and children", () => {
    expect(isPublicFacingPath("/marketing")).toBe(true);
    expect(isPublicFacingPath("/marketing/pricing")).toBe(true);
  });

  it("returns false for internal routes", () => {
    expect(isPublicFacingPath("/")).toBe(false);
    expect(isPublicFacingPath("/governance/settings")).toBe(false);
    expect(isPublicFacingPath("/finance/ap/invoices")).toBe(false);
  });

  it("does not overmatch similarly prefixed paths", () => {
    expect(isPublicFacingPath("/authz")).toBe(false);
    expect(isPublicFacingPath("/marketingops")).toBe(false);
  });
});
