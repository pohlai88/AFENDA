/**
 * Test factories — deterministic constants and payload builders.
 *
 * These constants match the seed data created by global-setup.ts.
 * Payload builders return valid command bodies for use with injectAs().
 */

// ── Test user emails (match global-setup seed) ────────────────────────────────
export const SUBMITTER_EMAIL = "admin@test.afenda";
export const APPROVER_EMAIL = "approver@test.afenda";

// ── Org ──────────────────────────────────────────────────────────────────────
export const TEST_ORG_SLUG = "test-org";

// ── Counter for unique idempotency keys ──────────────────────────────────────
let counter = 0;
export function uniqueKey(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${++counter}`;
}

// ── Submit invoice payload ──────────────────────────────────────────────────
export interface SubmitPayloadOpts {
  supplierId: string;
  amountMinor?: number;
  currencyCode?: string;
  dueDate?: string;
  poReference?: string;
}

export function submitInvoicePayload(opts: SubmitPayloadOpts) {
  return {
    idempotencyKey: uniqueKey("submit"),
    supplierId: opts.supplierId,
    amountMinor: opts.amountMinor ?? 100_00,
    currencyCode: opts.currencyCode ?? "USD",
    dueDate: opts.dueDate,
    poReference: opts.poReference,
  };
}

// ── Approve invoice payload ─────────────────────────────────────────────────
export function approveInvoicePayload(invoiceId: string, reason?: string) {
  return {
    idempotencyKey: uniqueKey("approve"),
    invoiceId,
    reason,
  };
}

// ── Reject invoice payload ──────────────────────────────────────────────────
export function rejectInvoicePayload(invoiceId: string, reason = "does not match PO") {
  return {
    idempotencyKey: uniqueKey("reject"),
    invoiceId,
    reason,
  };
}

// ── Void invoice payload ────────────────────────────────────────────────────
export function voidInvoicePayload(invoiceId: string, reason = "duplicate entry") {
  return {
    idempotencyKey: uniqueKey("void"),
    invoiceId,
    reason,
  };
}

// ── Mark paid payload ───────────────────────────────────────────────────────
export function markPaidPayload(invoiceId: string, paymentReference = "PAY-001", reason?: string) {
  return {
    idempotencyKey: uniqueKey("paid"),
    invoiceId,
    paymentReference,
    reason,
  };
}

// ── Post-to-GL payload (balanced 2-line journal entry) ──────────────────────
export interface PostToGLPayloadOpts {
  debitAccountId: string;
  creditAccountId: string;
  amountMinor?: number;
  currencyCode?: string;
  sourceInvoiceId?: string;
  memo?: string;
}

export function postToGLPayload(opts: PostToGLPayloadOpts) {
  const amount = opts.amountMinor ?? 100_00;
  return {
    idempotencyKey: uniqueKey("gl"),
    correlationId: crypto.randomUUID(),
    sourceInvoiceId: opts.sourceInvoiceId,
    memo: opts.memo ?? "Test journal entry",
    lines: [
      {
        accountId: opts.debitAccountId,
        debitMinor: amount,
        currencyCode: opts.currencyCode ?? "USD",
      },
      {
        accountId: opts.creditAccountId,
        creditMinor: amount,
        currencyCode: opts.currencyCode ?? "USD",
      },
    ],
  };
}

// ── Reverse entry payload ───────────────────────────────────────────────────
export function reverseEntryPayload(journalEntryId: string, memo = "Reversal test") {
  return {
    idempotencyKey: uniqueKey("reverse"),
    correlationId: crypto.randomUUID(),
    journalEntryId,
    memo,
  };
}

/**
 * Look up the test supplier ID from the DB via Fastify inject.
 * Call once per test suite and cache the result.
 */
export async function getTestSupplierId(app: import("fastify").FastifyInstance): Promise<string> {
  const rows = await app.db.execute(
    /* sql */ `SELECT s.id FROM supplier s JOIN organization o ON o.id = s.org_id WHERE o.slug = 'test-org' LIMIT 1`,
  );
  const row = (rows as unknown as { rows: Array<{ id: string }> }).rows[0];
  if (!row) throw new Error("Test supplier not found — did global-setup run?");
  return row.id;
}

/**
 * Look up account IDs from the test CoA by code.
 */
export async function getAccountIdByCode(
  app: import("fastify").FastifyInstance,
  code: string,
): Promise<string> {
  const rows = await app.db.execute(
    /* sql */ `SELECT a.id FROM account a JOIN organization o ON o.id = a.org_id WHERE o.slug = 'test-org' AND a.code = '${code}' LIMIT 1`,
  );
  const row = (rows as unknown as { rows: Array<{ id: string }> }).rows[0];
  if (!row) throw new Error(`Account ${code} not found — did global-setup run?`);
  return row.id;
}
