import { afterEach, describe, expect, it } from "vitest";

import { isTenantRoutingV2Enabled } from "../feature-flags";

describe("isTenantRoutingV2Enabled", () => {
  const originalValue = process.env.NEXT_PUBLIC_TENANT_ROUTING_V2;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.NEXT_PUBLIC_TENANT_ROUTING_V2;
      return;
    }

    process.env.NEXT_PUBLIC_TENANT_ROUTING_V2 = originalValue;
  });

  it("defaults to enabled when env var is unset", () => {
    delete process.env.NEXT_PUBLIC_TENANT_ROUTING_V2;
    expect(isTenantRoutingV2Enabled()).toBe(true);
  });

  it("treats false-like values as disabled", () => {
    process.env.NEXT_PUBLIC_TENANT_ROUTING_V2 = "false";
    expect(isTenantRoutingV2Enabled()).toBe(false);

    process.env.NEXT_PUBLIC_TENANT_ROUTING_V2 = "0";
    expect(isTenantRoutingV2Enabled()).toBe(false);

    process.env.NEXT_PUBLIC_TENANT_ROUTING_V2 = "off";
    expect(isTenantRoutingV2Enabled()).toBe(false);
  });

  it("treats non-false values as enabled", () => {
    process.env.NEXT_PUBLIC_TENANT_ROUTING_V2 = "true";
    expect(isTenantRoutingV2Enabled()).toBe(true);

    process.env.NEXT_PUBLIC_TENANT_ROUTING_V2 = "1";
    expect(isTenantRoutingV2Enabled()).toBe(true);
  });
});
