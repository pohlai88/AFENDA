import { describe, expect, it } from "vitest";

import { erpNavigationDomains } from "../navigation.config";

describe("navigation config", () => {
  it("includes COMM domain with expected base route", () => {
    const commDomain = erpNavigationDomains.find((domain) => domain.key === "comm");

    expect(commDomain).toBeDefined();
    expect(commDomain?.title).toBe("COMM");
    expect(commDomain?.url).toBe("/comm");
  });

  it("includes task links under COMM", () => {
    const commDomain = erpNavigationDomains.find((domain) => domain.key === "comm");

    const itemUrls = (commDomain?.items ?? []).map((item) => item.url);

    expect(itemUrls).toContain("/comm/tasks/my");
    expect(itemUrls).toContain("/comm/tasks/board");
    expect(itemUrls).toContain("/comm/tasks");
  });
});
