import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import {
  activateTreasuryLimitCommandSchema,
  activateTreasuryPolicyCommandSchema,
  approveTreasuryLimitOverrideCommandSchema,
  createTreasuryLimitCommandSchema,
  createTreasuryPolicyCommandSchema,
  type CreateTreasuryLimitCommand,
} from "@afenda/contracts";
import {
  outboxEvent,
  treasuryLimitBreachTable,
  treasuryLimitTable,
  treasuryPolicyTable,
} from "@afenda/db";
import { evaluateLimitBreach } from "./calculators/limit-breach";

export type TreasuryPolicyServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export class TreasuryPolicyService {
  constructor(
    private readonly deps: {
      db: any;
      logger: any;
    },
  ) {}

  async createPolicy(raw: unknown): Promise<TreasuryPolicyServiceResult<{ id: string }>> {
    const cmd = createTreasuryPolicyCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryPolicyTable)
      .where(and(eq(treasuryPolicyTable.orgId, cmd.orgId), eq(treasuryPolicyTable.code, cmd.code)))
      .limit(1);

    if (existing.length > 0) {
      return {
        ok: false,
        error: { code: "TREASURY_POLICY_CODE_EXISTS", message: "Treasury policy code exists" },
      };
    }

    const id = randomUUID();

    await this.deps.db.insert(treasuryPolicyTable).values({
      id,
      orgId: cmd.orgId,
      code: cmd.code,
      name: cmd.name,
      scopeType: cmd.scopeType,
      legalEntityId: cmd.legalEntityId ?? null,
      currencyCode: cmd.currencyCode ?? null,
      allowOverride: cmd.allowOverride,
      status: "draft",
      effectiveFrom: cmd.effectiveFrom,
      effectiveTo: cmd.effectiveTo ?? null,
      createdAt: sql`now()`,
      updatedAt: sql`now()`,
    });

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.POLICY_CREATED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: { treasuryPolicyId: id, code: cmd.code },
    });

    return { ok: true, data: { id } };
  }

  async activatePolicy(raw: unknown): Promise<TreasuryPolicyServiceResult<{ id: string }>> {
    const cmd = activateTreasuryPolicyCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryPolicyTable)
      .where(
        and(
          eq(treasuryPolicyTable.orgId, cmd.orgId),
          eq(treasuryPolicyTable.id, cmd.treasuryPolicyId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return {
        ok: false,
        error: { code: "TREASURY_POLICY_NOT_FOUND", message: "Treasury policy not found" },
      };
    }

    await this.deps.db
      .update(treasuryPolicyTable)
      .set({ status: "active", updatedAt: sql`now()` })
      .where(eq(treasuryPolicyTable.id, cmd.treasuryPolicyId));

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.POLICY_ACTIVATED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: {
        treasuryPolicyId: cmd.treasuryPolicyId,
      },
    });

    return { ok: true, data: { id: cmd.treasuryPolicyId } };
  }

  async createLimit(raw: unknown): Promise<TreasuryPolicyServiceResult<{ id: string }>> {
    const cmd = createTreasuryLimitCommandSchema.parse(raw);

    const policy = await this.deps.db
      .select()
      .from(treasuryPolicyTable)
      .where(
        and(eq(treasuryPolicyTable.orgId, cmd.orgId), eq(treasuryPolicyTable.id, cmd.policyId)),
      )
      .limit(1);

    if (policy.length === 0) {
      return {
        ok: false,
        error: { code: "TREASURY_POLICY_NOT_FOUND", message: "Treasury policy not found" },
      };
    }

    const id = randomUUID();

    await this.deps.db.insert(treasuryLimitTable).values({
      id,
      orgId: cmd.orgId,
      policyId: cmd.policyId,
      code: cmd.code,
      scopeType: cmd.scopeType,
      legalEntityId: cmd.legalEntityId ?? null,
      currencyCode: cmd.currencyCode ?? null,
      metric: cmd.metric,
      thresholdMinor: cmd.thresholdMinor,
      hardBlock: cmd.hardBlock,
      status: "draft",
      effectiveFrom: cmd.effectiveFrom,
      effectiveTo: cmd.effectiveTo ?? null,
      createdAt: sql`now()`,
      updatedAt: sql`now()`,
    });

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.LIMIT_CREATED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: {
        treasuryLimitId: id,
        policyId: cmd.policyId,
        code: cmd.code,
      },
    });

    return { ok: true, data: { id } };
  }

  async activateLimit(raw: unknown): Promise<TreasuryPolicyServiceResult<{ id: string }>> {
    const cmd = activateTreasuryLimitCommandSchema.parse(raw);

    const existing = await this.deps.db
      .select()
      .from(treasuryLimitTable)
      .where(
        and(
          eq(treasuryLimitTable.orgId, cmd.orgId),
          eq(treasuryLimitTable.id, cmd.treasuryLimitId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return {
        ok: false,
        error: { code: "TREASURY_LIMIT_NOT_FOUND", message: "Treasury limit not found" },
      };
    }

    await this.deps.db
      .update(treasuryLimitTable)
      .set({ status: "active", updatedAt: sql`now()` })
      .where(eq(treasuryLimitTable.id, cmd.treasuryLimitId));

    await this.deps.db.insert(outboxEvent).values({
      orgId: cmd.orgId,
      type: "TREAS.LIMIT_ACTIVATED",
      version: "1",
      correlationId: cmd.correlationId,
      payload: {
        treasuryLimitId: cmd.treasuryLimitId,
      },
    });

    return { ok: true, data: { id: cmd.treasuryLimitId } };
  }

  async checkLimit(input: {
    orgId: string;
    sourceType: CreateTreasuryLimitCommand["scopeType"];
    sourceId: string;
    measuredValueMinor: string;
    correlationId: string;
  }): Promise<TreasuryPolicyServiceResult<{ allowed: boolean; breachId?: string }>> {
    const limits = await this.deps.db
      .select()
      .from(treasuryLimitTable)
      .where(
        and(
          eq(treasuryLimitTable.orgId, input.orgId),
          eq(treasuryLimitTable.scopeType, input.sourceType),
          eq(treasuryLimitTable.status, "active"),
        ),
      );

    for (const limit of limits) {
      const verdict = evaluateLimitBreach({
        measuredValueMinor: input.measuredValueMinor,
        thresholdMinor: limit.thresholdMinor,
      });

      if (!verdict.breached) {
        continue;
      }

      const breachId = randomUUID();
      await this.deps.db.insert(treasuryLimitBreachTable).values({
        id: breachId,
        orgId: input.orgId,
        treasuryLimitId: limit.id,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        measuredValueMinor: input.measuredValueMinor,
        thresholdMinor: limit.thresholdMinor,
        hardBlock: limit.hardBlock,
        overrideRequested: !limit.hardBlock,
        overrideApprovedByUserId: null,
        overrideReason: null,
        correlationId: input.correlationId,
        createdAt: sql`now()`,
      });

      await this.deps.db.insert(outboxEvent).values({
        orgId: input.orgId,
        type: "TREAS.LIMIT_BREACHED",
        version: "1",
        correlationId: input.correlationId,
        payload: {
          treasuryLimitBreachId: breachId,
          treasuryLimitId: limit.id,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          hardBlock: limit.hardBlock,
        },
      });

      return { ok: true, data: { allowed: false, breachId } };
    }

    return { ok: true, data: { allowed: true } };
  }

  async approveOverride(raw: unknown): Promise<TreasuryPolicyServiceResult<{ id: string }>> {
    const cmd = approveTreasuryLimitOverrideCommandSchema.parse(raw);

    const breach = await this.deps.db
      .select()
      .from(treasuryLimitBreachTable)
      .where(
        and(
          eq(treasuryLimitBreachTable.orgId, cmd.orgId),
          eq(treasuryLimitBreachTable.id, cmd.treasuryLimitBreachId),
        ),
      )
      .limit(1);

    if (breach.length === 0) {
      return {
        ok: false,
        error: {
          code: "TREASURY_LIMIT_BREACH_NOT_FOUND",
          message: "Treasury limit breach not found",
        },
      };
    }

    if (!breach[0].overrideRequested || breach[0].hardBlock) {
      return {
        ok: false,
        error: {
          code: "TREASURY_LIMIT_OVERRIDE_NOT_ALLOWED",
          message: "Override not allowed for this limit breach",
        },
      };
    }

    await this.deps.db
      .update(treasuryLimitBreachTable)
      .set({
        overrideApprovedByUserId: cmd.actorUserId,
        overrideReason: cmd.reason,
      })
      .where(eq(treasuryLimitBreachTable.id, cmd.treasuryLimitBreachId));

    return { ok: true, data: { id: cmd.treasuryLimitBreachId } };
  }
}
