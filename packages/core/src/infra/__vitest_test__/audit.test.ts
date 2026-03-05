/**
 * Tests for the audit log service — assertJsonSafe, redaction, and writeAuditLog.
 *
 * These are pure-logic unit tests; DB-level behaviour (append-only trigger,
 * idempotency index) is validated via migration tests and integration suites.
 *
 * We mock `@afenda/db` so we don't need a live Postgres connection or ESM
 * resolution of the full schema graph during unit tests.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { OrgId, PrincipalId, CorrelationId, EntityId, JsonObject, AuditAction, AuditEntityType } from "@afenda/contracts";

// ── Mock @afenda/db before any code that imports it ──────────────────────────

const FAKE_AUDIT_LOG_ID = "eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee";

const returningFn = vi.fn().mockResolvedValue([{ id: FAKE_AUDIT_LOG_ID }]);
const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
const insertFn = vi.fn().mockReturnValue({ values: valuesFn });
const transactionFn = vi.fn(async (fn: any) => fn({ insert: insertFn, execute: vi.fn() }));

vi.mock("@afenda/db", () => ({
  auditLog: { id: "id" },
  createDbClient: vi.fn(),
}));

// Import after mock registration
import { writeAuditLog, withAudit } from "../audit.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" as OrgId;
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" as PrincipalId;
const CORRELATION_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc" as CorrelationId;
const ENTITY_ID = "dddddddd-dddd-4ddd-dddd-dddddddddddd" as EntityId;

function ctx() {
  return { activeContext: { orgId: ORG_ID } };
}

function baseEntry(details?: JsonObject) {
  return {
    actorPrincipalId: PRINCIPAL_ID,
    action: "document.registered" as AuditAction,
    entityType: "document" as AuditEntityType,
    entityId: ENTITY_ID,
    correlationId: CORRELATION_ID,
    details,
  };
}

// ── Mock DB factory ──────────────────────────────────────────────────────────

function createMockDb() {
  // Reset shared mocks
  insertFn.mockClear();
  valuesFn.mockClear();
  returningFn.mockClear().mockResolvedValue([{ id: FAKE_AUDIT_LOG_ID }]);
  transactionFn.mockClear().mockImplementation(async (fn: any) => fn({ insert: insertFn, execute: vi.fn() }));

  return {
    insert: insertFn,
    transaction: transactionFn,
    execute: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  returningFn.mockResolvedValue([{ id: FAKE_AUDIT_LOG_ID }]);
  valuesFn.mockReturnValue({ returning: returningFn });
  insertFn.mockReturnValue({ values: valuesFn });
  transactionFn.mockImplementation(async (fn: any) => fn({ insert: insertFn, execute: vi.fn() }));
});

// ═══════════════════════════════════════════════════════════════════════════════
// assertJsonSafe (tested via writeAuditLog boundary)
// ═══════════════════════════════════════════════════════════════════════════════

describe("assertJsonSafe (via writeAuditLog)", () => {
  it("accepts primitives: string, number, boolean, null", async () => {
    const db = createMockDb() as any;
    await expect(
      writeAuditLog(db, ctx(), baseEntry({ str: "ok", num: 42, bool: true, nil: null })),
    ).resolves.toBeDefined();
  });

  it("accepts nested objects and arrays", async () => {
    const db = createMockDb() as any;
    const details: JsonObject = {
      nested: { deep: { value: "ok" } },
      list: [1, 2, 3],
    };
    await expect(writeAuditLog(db, ctx(), baseEntry(details))).resolves.toBeDefined();
  });

  it("rejects NaN", async () => {
    const db = createMockDb() as any;
    const details = { bad: NaN } as unknown as JsonObject;
    await expect(writeAuditLog(db, ctx(), baseEntry(details))).rejects.toThrow(
      /non-finite number/,
    );
  });

  it("rejects Infinity", async () => {
    const db = createMockDb() as any;
    const details = { bad: Infinity } as unknown as JsonObject;
    await expect(writeAuditLog(db, ctx(), baseEntry(details))).rejects.toThrow(
      /non-finite number/,
    );
  });

  it("rejects -Infinity", async () => {
    const db = createMockDb() as any;
    const details = { bad: -Infinity } as unknown as JsonObject;
    await expect(writeAuditLog(db, ctx(), baseEntry(details))).rejects.toThrow(
      /non-finite number/,
    );
  });

  it("rejects BigInt", async () => {
    const db = createMockDb() as any;
    const details = { bad: BigInt(42) } as unknown as JsonObject;
    await expect(writeAuditLog(db, ctx(), baseEntry(details))).rejects.toThrow(
      /BigInt/,
    );
  });

  it("rejects Date", async () => {
    const db = createMockDb() as any;
    const details = { bad: new Date() } as unknown as JsonObject;
    await expect(writeAuditLog(db, ctx(), baseEntry(details))).rejects.toThrow(
      /Date/,
    );
  });

  it("rejects Map", async () => {
    const db = createMockDb() as any;
    const details = { bad: new Map() } as unknown as JsonObject;
    await expect(writeAuditLog(db, ctx(), baseEntry(details))).rejects.toThrow(
      /Map\/Set/,
    );
  });

  it("rejects nested NaN deep in the tree", async () => {
    const db = createMockDb() as any;
    const details = { a: { b: { c: NaN } } } as unknown as JsonObject;
    await expect(writeAuditLog(db, ctx(), baseEntry(details))).rejects.toThrow(
      /non-finite number at \$\.a\.b\.c/,
    );
  });

  it("rejects NaN inside arrays", async () => {
    const db = createMockDb() as any;
    const details = { arr: [1, 2, NaN] } as unknown as JsonObject;
    await expect(writeAuditLog(db, ctx(), baseEntry(details))).rejects.toThrow(
      /non-finite number at \$\.arr\[2\]/,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Deep redaction
// ═══════════════════════════════════════════════════════════════════════════════

describe("deep redaction (via writeAuditLog)", () => {
  it("redacts top-level sensitive keys", async () => {
    const db = createMockDb() as any;
    const details = { password: "s3cret", action: "login" } as unknown as JsonObject;
    await writeAuditLog(db, ctx(), baseEntry(details));

    const insertedValues = valuesFn.mock.calls[0][0];
    expect(insertedValues.details).toEqual({ password: "[REDACTED]", action: "login" });
  });

  it("redacts nested sensitive keys (deep)", async () => {
    const db = createMockDb() as any;
    const details = {
      auth: { token: "abc123", scope: "admin" },
      safe: "value",
    } as unknown as JsonObject;
    await writeAuditLog(db, ctx(), baseEntry(details));

    const insertedValues = valuesFn.mock.calls[0][0];
    expect(insertedValues.details).toEqual({
      auth: { token: "[REDACTED]", scope: "admin" },
      safe: "value",
    });
  });

  it("redacts deeply nested (3+ levels) sensitive keys", async () => {
    const db = createMockDb() as any;
    const details = {
      a: { b: { c: { secret: "x", ok: 1 } } },
    } as unknown as JsonObject;
    await writeAuditLog(db, ctx(), baseEntry(details));

    const insertedValues = valuesFn.mock.calls[0][0];
    expect(insertedValues.details).toEqual({
      a: { b: { c: { secret: "[REDACTED]", ok: 1 } } },
    });
  });

  it("redacts sensitive keys inside arrays of objects", async () => {
    const db = createMockDb() as any;
    const details = {
      accounts: [
        { name: "Acme", apikey: "key1" },
        { name: "Beta", api_key: "key2" },
      ],
    } as unknown as JsonObject;
    await writeAuditLog(db, ctx(), baseEntry(details));

    const insertedValues = valuesFn.mock.calls[0][0];
    expect(insertedValues.details).toEqual({
      accounts: [
        { name: "Acme", apikey: "[REDACTED]" },
        { name: "Beta", api_key: "[REDACTED]" },
      ],
    });
  });

  it("redacts all key variants: access_token, refresh_token, apiKey, etc.", async () => {
    const db = createMockDb() as any;
    const allSensitive = {
      password: "1", pass: "2", token: "3",
      access_token: "4", accesstoken: "5",
      refresh_token: "6", refreshtoken: "7",
      secret: "8", api_key: "9", apikey: "10",
      authorization: "11", creditcard: "12",
      cardnumber: "13", cvv: "14", ssn: "15",
    } as unknown as JsonObject;
    await writeAuditLog(db, ctx(), baseEntry(allSensitive));

    const insertedValues = valuesFn.mock.calls[0][0];
    for (const key of Object.keys(allSensitive)) {
      expect(insertedValues.details[key]).toBe("[REDACTED]");
    }
  });

  it("is case-insensitive for key matching", async () => {
    const db = createMockDb() as any;
    const details = { PASSWORD: "x", Token: "y", SSN: "z", safe: "ok" } as unknown as JsonObject;
    await writeAuditLog(db, ctx(), baseEntry(details));

    const insertedValues = valuesFn.mock.calls[0][0];
    expect(insertedValues.details).toEqual({
      PASSWORD: "[REDACTED]",
      Token: "[REDACTED]",
      SSN: "[REDACTED]",
      safe: "ok",
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Details size guard
// ═══════════════════════════════════════════════════════════════════════════════

describe("details size guard", () => {
  it("rejects details larger than 64KB", async () => {
    const db = createMockDb() as any;
    // Generate a string just over 64KB
    const bigPayload = "x".repeat(65_000);
    const details = { data: bigPayload } as unknown as JsonObject;
    await expect(
      writeAuditLog(db, ctx(), baseEntry(details)),
    ).rejects.toThrow(/too large/);
  });

  it("accepts details just under 64KB", async () => {
    const db = createMockDb() as any;
    // ~60KB payload — under the 64KB limit
    const payload = "x".repeat(60_000);
    const details = { data: payload } as unknown as JsonObject;
    await expect(
      writeAuditLog(db, ctx(), baseEntry(details)),
    ).resolves.toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// writeAuditLog
// ═══════════════════════════════════════════════════════════════════════════════

describe("writeAuditLog", () => {
  it("inserts with correct org from activeContext", async () => {
    const db = createMockDb() as any;
    await writeAuditLog(db, ctx(), baseEntry({ foo: "bar" }));

    const insertedValues = valuesFn.mock.calls[0][0];
    expect(insertedValues.orgId).toBe(ORG_ID);
    expect(insertedValues.action).toBe("document.registered");
    expect(insertedValues.entityType).toBe("document");
    expect(insertedValues.correlationId).toBe(CORRELATION_ID);
  });

  it("handles undefined details (null in DB)", async () => {
    const db = createMockDb() as any;
    await writeAuditLog(db, ctx(), baseEntry(undefined));

    const insertedValues = valuesFn.mock.calls[0][0];
    expect(insertedValues.details).toBeNull();
  });

  it("handles null actorPrincipalId for system events", async () => {
    const db = createMockDb() as any;
    const entry = { ...baseEntry(), actorPrincipalId: null };
    await writeAuditLog(db, ctx(), entry);

    const insertedValues = valuesFn.mock.calls[0][0];
    expect(insertedValues.actorPrincipalId).toBeNull();
  });

  it("throws when DB returns no row", async () => {
    const db = createMockDb() as any;
    returningFn.mockResolvedValue([]);

    await expect(writeAuditLog(db, ctx(), baseEntry())).rejects.toThrow(
      /Failed to write audit log entry/,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// withAudit
// ═══════════════════════════════════════════════════════════════════════════════

describe("withAudit", () => {
  it("calls fn and writeAuditLog inside the same transaction", async () => {
    const db = createMockDb() as any;
    const fnResult = { id: "result-123" };

    const result = await withAudit(db, ctx(), baseEntry(), async (_tx) => {
      return fnResult;
    });

    expect(result).toBe(fnResult);
    expect(transactionFn).toHaveBeenCalledOnce();
    // writeAuditLog was called inside the transaction (via insert)
    expect(valuesFn).toHaveBeenCalled();
  });

  it("passes the tx handle to fn as DbClient", async () => {
    const db = createMockDb() as any;

    await withAudit(db, ctx(), baseEntry(), async (tx) => {
      // tx should be usable as a DbClient — it has insert, etc.
      expect(tx).toBeDefined();
      expect(typeof tx.insert).toBe("function");
      return "ok";
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AuditEntryInput.commandId slot
// ═══════════════════════════════════════════════════════════════════════════════

describe("AuditEntryInput.commandId", () => {
  it("accepts an optional commandId for idempotency", async () => {
    const db = createMockDb() as any;
    const entry = { ...baseEntry(), commandId: "cmd-unique-123" };
    // Should not throw — commandId is accepted
    await expect(writeAuditLog(db, ctx(), entry)).resolves.toBeDefined();
  });

  it("works without commandId (backward-compatible)", async () => {
    const db = createMockDb() as any;
    await expect(writeAuditLog(db, ctx(), baseEntry())).resolves.toBeDefined();
  });
});
