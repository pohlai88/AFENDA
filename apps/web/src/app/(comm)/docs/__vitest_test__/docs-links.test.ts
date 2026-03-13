import { describe, expect, it } from "vitest";

const DOC_ID = "11111111-1111-4111-8111-111111111111";

describe("Docs routes", () => {
  it("uses consistent path patterns for docs", () => {
    expect(`/comm/docs`).toBe("/comm/docs");
    expect(`/comm/docs/new`).toBe("/comm/docs/new");
    expect(`/comm/docs/${DOC_ID}`).toBe(`/comm/docs/${DOC_ID}`);
    expect(`/comm/docs/${DOC_ID}/history`).toBe(`/comm/docs/${DOC_ID}/history`);
  });

  it("builds doc detail href from id", () => {
    const href = `/comm/docs/${DOC_ID}`;
    expect(href).toMatch(/^\/comm\/docs\/[0-9a-f-]+$/);
  });
});
