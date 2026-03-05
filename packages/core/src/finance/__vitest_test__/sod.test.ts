import { describe, expect, it } from "vitest";
import type { PrincipalId } from "@afenda/contracts";
import { Permissions } from "@afenda/contracts";
import { canApproveInvoice, canPostToGL, type PolicyContext } from "../sod.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRINCIPAL_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as PrincipalId;
const PRINCIPAL_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" as PrincipalId;

function makeCtx(
  overrides: Partial<PolicyContext> & { permissions?: string[] } = {}
): PolicyContext {
  const { permissions, ...rest } = overrides as any;
  const permissionsArray = permissions ?? [];
  return {
    principalId: PRINCIPAL_A,
    permissionsSet: new Set(permissionsArray),
    ...rest,
  };
}

// ── canApproveInvoice ────────────────────────────────────────────────────────

describe("canApproveInvoice", () => {
  it("allows when principal has permission and is not the submitter", () => {
    const ctx = makeCtx({ permissions: [Permissions.apInvoiceApprove] as any });
    const result = canApproveInvoice(ctx, PRINCIPAL_B);
    expect(result).toEqual({ allowed: true });
  });

  it("denies with MISSING_PERMISSION when principal lacks ap.invoice.approve", () => {
    const ctx = makeCtx({ permissions: [] });
    const result = canApproveInvoice(ctx, PRINCIPAL_B);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MISSING_PERMISSION");
      expect(result.reason).toContain(Permissions.apInvoiceApprove);
      expect(result.meta?.permission).toBe(Permissions.apInvoiceApprove);
    }
  });

  it("denies with SOD_SAME_PRINCIPAL when approver is the submitter", () => {
    const ctx = makeCtx({
      principalId: PRINCIPAL_A,
      permissions: [Permissions.apInvoiceApprove] as any,
    });
    const result = canApproveInvoice(ctx, PRINCIPAL_A);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("SOD_SAME_PRINCIPAL");
      expect(result.reason).toMatch(/submitter/i);
    }
  });

  it("checks permission before SoD (MISSING_PERMISSION wins over SOD_SAME_PRINCIPAL)", () => {
    // Same principal AND missing permission — should get MISSING_PERMISSION first
    const ctx = makeCtx({ principalId: PRINCIPAL_A, permissions: [] });
    const result = canApproveInvoice(ctx, PRINCIPAL_A);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MISSING_PERMISSION");
      expect(result.meta?.permission).toBe(Permissions.apInvoiceApprove);
    }
  });

  it("allows when principal has multiple permissions including ap.invoice.approve", () => {
    const ctx = makeCtx({
      permissions: [Permissions.apInvoiceSubmit, Permissions.apInvoiceApprove] as any,
    });
    const result = canApproveInvoice(ctx, PRINCIPAL_B);
    expect(result).toEqual({ allowed: true });
  });

  // ── Fail-closed: MISSING_CONTEXT scenarios ────────────────────────────────

  it("denies with MISSING_CONTEXT when principalId is missing (system action)", () => {
    const ctx = makeCtx({
      principalId: undefined,
      permissions: [Permissions.apInvoiceApprove] as any,
    });
    const result = canApproveInvoice(ctx, PRINCIPAL_B);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MISSING_CONTEXT");
      expect(result.reason).toContain("principalId");
      expect(result.meta?.field).toBe("principalId");
    }
  });

  it("denies with MISSING_CONTEXT when submittedByPrincipalId is null (legacy data)", () => {
    const ctx = makeCtx({
      principalId: PRINCIPAL_A,
      permissions: [Permissions.apInvoiceApprove] as any,
    });
    const result = canApproveInvoice(ctx, null);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MISSING_CONTEXT");
      expect(result.reason).toContain("submitter");
      expect(result.meta?.field).toBe("submittedByPrincipalId");
    }
  });

  it("denies with MISSING_CONTEXT when submittedByPrincipalId is undefined (import)", () => {
    const ctx = makeCtx({
      principalId: PRINCIPAL_A,
      permissions: [Permissions.apInvoiceApprove] as any,
    });
    const result = canApproveInvoice(ctx, undefined);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MISSING_CONTEXT");
      expect(result.meta?.field).toBe("submittedByPrincipalId");
    }
  });
});

// ── canPostToGL ──────────────────────────────────────────────────────────────

describe("canPostToGL", () => {
  it("allows when principal has gl.journal.post permission", () => {
    const ctx = makeCtx({ permissions: [Permissions.glJournalPost] as any });
    const result = canPostToGL(ctx);
    expect(result).toEqual({ allowed: true });
  });

  it("denies with MISSING_PERMISSION when principal lacks gl.journal.post", () => {
    const ctx = makeCtx({ permissions: [] });
    const result = canPostToGL(ctx);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MISSING_PERMISSION");
      expect(result.reason).toContain(Permissions.glJournalPost);
      expect(result.meta?.permission).toBe(Permissions.glJournalPost);
    }
  });

  it("denies when principal has other permissions but not gl.journal.post", () => {
    const ctx = makeCtx({
      permissions: [Permissions.apInvoiceApprove, Permissions.apInvoiceSubmit] as any,
    });
    const result = canPostToGL(ctx);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("MISSING_PERMISSION");
      expect(result.meta?.permission).toBe(Permissions.glJournalPost);
    }
  });
});
