import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  activateTreasuryAccountingPolicyCommandSchema,
  createTreasuryAccountingPolicyCommandSchema,
  requestTreasuryPostingCommandSchema,
} from "@afenda/contracts";
import { outboxEvent, treasuryAccountingPolicyTable, treasuryPostingBridgeTable } from "@afenda/db";

export type TreasuryAccountingBridgeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export class TreasuryAccountingBridgeService {
  constructor(private readonly deps: { db: any; logger: any }) {}

  async createPolicy(raw: unknown): Promise<TreasuryAccountingBridgeResult<{ id: string }>> {
    const cmd = createTreasuryAccountingPolicyCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryAccountingPolicyTable)
      .where(
        and(
          eq(treasuryAccountingPolicyTable.orgId, cmd.orgId),
          eq(treasuryAccountingPolicyTable.policyCode, cmd.policyCode),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        ok: false,
        error: {
          code: "TREASURY_ACCOUNTING_POLICY_CODE_EXISTS",
          message: "Treasury accounting policy code exists",
        },
      };
    }

    const id = randomUUID();

    await this.deps.db.insert(treasuryAccountingPolicyTable).values({
      id,
      orgId: cmd.orgId,
      policyCode: cmd.policyCode,
      name: cmd.name,
      scopeType: cmd.scopeType,
      debitAccountCode: cmd.debitAccountCode,
      creditAccountCode: cmd.creditAccountCode,
      status: "draft",
      effectiveFrom: cmd.effectiveFrom,
      effectiveTo: cmd.effectiveTo ?? null,
      createdAt: sql`now()`,
      updatedAt: sql`now()`,
    });

    return { ok: true, data: { id } };
  }

  async activatePolicy(raw: unknown): Promise<TreasuryAccountingBridgeResult<{ id: string }>> {
    const cmd = activateTreasuryAccountingPolicyCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryAccountingPolicyTable)
      .where(
        and(
          eq(treasuryAccountingPolicyTable.orgId, cmd.orgId),
          eq(treasuryAccountingPolicyTable.id, cmd.treasuryAccountingPolicyId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return {
        ok: false,
        error: {
          code: "TREASURY_ACCOUNTING_POLICY_NOT_FOUND",
          message: "Treasury accounting policy not found",
        },
      };
    }

    await this.deps.db
      .update(treasuryAccountingPolicyTable)
      .set({ status: "active", updatedAt: sql`now()` })
      .where(eq(treasuryAccountingPolicyTable.id, cmd.treasuryAccountingPolicyId));

    return { ok: true, data: { id: cmd.treasuryAccountingPolicyId } };
  }

  async requestPosting(raw: unknown): Promise<TreasuryAccountingBridgeResult<{ id: string }>> {
    const cmd = requestTreasuryPostingCommandSchema.parse(raw);
    const correlationId = `treas-posting-${cmd.idempotencyKey}`;

    const [policy] = await this.deps.db
      .select()
      .from(treasuryAccountingPolicyTable)
      .where(
        and(
          eq(treasuryAccountingPolicyTable.orgId, cmd.orgId),
          eq(treasuryAccountingPolicyTable.id, cmd.treasuryAccountingPolicyId),
          eq(treasuryAccountingPolicyTable.status, "active"),
        ),
      )
      .limit(1);

    if (!policy) {
      return {
        ok: false,
        error: {
          code: "TREASURY_ACCOUNTING_POLICY_NOT_ACTIVE",
          message: "Treasury accounting policy must be active",
        },
      };
    }

    const id = randomUUID();

    await this.deps.db.insert(treasuryPostingBridgeTable).values({
      id,
      orgId: cmd.orgId,
      sourceType: cmd.sourceType,
      sourceId: cmd.sourceId,
      treasuryAccountingPolicyId: cmd.treasuryAccountingPolicyId,
      debitAccountCode: policy.debitAccountCode,
      creditAccountCode: policy.creditAccountCode,
      amountMinor: cmd.amountMinor,
      currencyCode: cmd.currencyCode,
      status: "requested",
      correlationId,
      postedJournalEntryId: null,
      failureReason: null,
      createdAt: sql`now()`,
      updatedAt: sql`now()`,
    });

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.TREASURY_POSTING_REQUESTED",
      version: "1",
      correlationId,
      payload: {
        treasuryPostingBridgeId: id,
        sourceType: cmd.sourceType,
        sourceId: cmd.sourceId,
      },
    });

    return { ok: true, data: { id } };
  }
}
