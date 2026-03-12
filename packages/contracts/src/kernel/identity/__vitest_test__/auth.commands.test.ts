import { describe, expect, it } from "vitest";
import { RequestPasswordResetCommandSchema, ResetPasswordCommandSchema } from "../auth.commands";

describe("auth.commands password reset validation", () => {
  it("accepts request-password-reset with explicit delivery", () => {
    const parsed = RequestPasswordResetCommandSchema.parse({
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
      email: "user@example.com",
      delivery: "code",
    });

    expect(parsed.delivery).toBe("code");
  });

  it("accepts reset by long token without email", () => {
    const parsed = ResetPasswordCommandSchema.parse({
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
      token: "a".repeat(32),
      newPassword: "P@ssword1234",
    });

    expect(parsed.token).toHaveLength(32);
  });

  it("accepts reset by 6-digit code with matching email field present", () => {
    const parsed = ResetPasswordCommandSchema.parse({
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
      token: "123456",
      email: "user@example.com",
      newPassword: "P@ssword1234",
    });

    expect(parsed.token).toBe("123456");
    expect(parsed.email).toBe("user@example.com");
  });

  it("rejects reset by 6-digit code without email", () => {
    const result = ResetPasswordCommandSchema.safeParse({
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
      token: "123456",
      newPassword: "P@ssword1234",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid short non-code tokens", () => {
    const result = ResetPasswordCommandSchema.safeParse({
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
      token: "abc123xyz",
      email: "user@example.com",
      newPassword: "P@ssword1234",
    });

    expect(result.success).toBe(false);
  });
});
