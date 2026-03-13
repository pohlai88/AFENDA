import { describe, expect, it, vi } from "vitest";

import {
  AuditFieldsSchema,
  AuditLogEntrySchema,
  appendAudit,
  createAuditLogEntry,
  redactAuditSnapshots,
} from "../audit";

describe("shared audit", () => {
  it("validates canonical 7W1H audit fields", () => {
    const parsed = AuditFieldsSchema.parse({
      occurredAt: "2026-03-13T12:00:00.000Z",
      actorId: "principal_1",
      actorType: "user",
      action: "INVOICE.SUBMIT",
      resourceType: "Invoice",
      resourceId: "invoice_1",
      correlationId: "corr_1",
      service: "api",
      channel: "api",
      before: { status: "draft" },
      after: { status: "submitted" },
    });

    expect(parsed.action).toBe("INVOICE.SUBMIT");
    expect(parsed.channel).toBe("api");
  });

  it("creates audit log entry with generated defaults", () => {
    const entry = createAuditLogEntry(
      {
        action: "LEDGER.POST",
        actorType: "service",
      },
      {
        id: "11111111-1111-4111-8111-111111111111",
        now: () => "2026-03-13T12:34:56.000Z",
      },
    );

    expect(entry.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(entry.occurredAt).toBe("2026-03-13T12:34:56.000Z");
    expect(entry.createdAt).toBe("2026-03-13T12:34:56.000Z");
    expect(AuditLogEntrySchema.parse(entry).action).toBe("LEDGER.POST");
  });

  it("appends audit via writer callback", async () => {
    const writer = vi.fn(async (entry) => ({ id: entry.id, action: entry.action }));

    const result = await appendAudit(
      writer,
      {
        action: "INVOICE.APPROVE",
        actorId: "principal_2",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        now: () => "2026-03-13T13:00:00.000Z",
      },
    );

    expect(writer).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: "22222222-2222-4222-8222-222222222222",
      action: "INVOICE.APPROVE",
    });
  });

  it("redacts sensitive fields in before/after snapshots", () => {
    const redacted = redactAuditSnapshots(
      {
        before: { token: "abc", amount: 100 },
        after: { token: "xyz", status: "done" },
      },
      { keys: ["token"] },
    );

    expect(redacted.before?.token).toBe("[REDACTED]");
    expect(redacted.after?.token).toBe("[REDACTED]");
    expect(redacted.before?.amount).toBe(100);
    expect(redacted.after?.status).toBe("done");
  });
});
