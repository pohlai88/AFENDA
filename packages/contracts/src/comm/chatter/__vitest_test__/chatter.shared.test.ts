import { describe, expect, it } from "vitest";
import { CommChatterMessageBodyTextSchema } from "../chatter.shared.js";

describe("chatter.shared – CommChatterMessageBodyTextSchema", () => {
  it("accepts valid body text", () => {
    const result = CommChatterMessageBodyTextSchema.safeParse("Hello chatter");
    expect(result.success).toBe(true);
  });

  it("trims body text", () => {
    const result = CommChatterMessageBodyTextSchema.parse("  padded body  ");
    expect(result).toBe("padded body");
  });

  it("rejects empty text", () => {
    const result = CommChatterMessageBodyTextSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects text over max length", () => {
    const result = CommChatterMessageBodyTextSchema.safeParse("x".repeat(20_001));
    expect(result.success).toBe(false);
  });
});
