import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  ActivateInternalInterestRateCommand,
  CreateInternalInterestRateCommand,
  InternalInterestRateEntity,
} from "@afenda/contracts";
import { outboxEvent, treasuryInternalInterestRateTable } from "@afenda/db";

export interface InternalInterestRateServiceDeps {
  db: any;
  logger: any;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export class InternalInterestRateService {
  constructor(private deps: InternalInterestRateServiceDeps) {}

  async createInternalInterestRate(
    cmd: CreateInternalInterestRateCommand,
  ): Promise<ServiceResult<InternalInterestRateEntity>> {
    try {
      const existing = await this.deps.db
        .select()
        .from(treasuryInternalInterestRateTable)
        .where(
          and(
            eq(treasuryInternalInterestRateTable.orgId, cmd.orgId),
            eq(treasuryInternalInterestRateTable.code, cmd.code),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERNAL_INTEREST_RATE_CODE_EXISTS",
            message: `Internal interest rate code ${cmd.code} already exists in org ${cmd.orgId}`,
          },
        };
      }

      const id = randomUUID();
      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      const rate: InternalInterestRateEntity = {
        id,
        orgId: cmd.orgId,
        code: cmd.code,
        legalEntityId: cmd.legalEntityId ?? null,
        currencyCode: cmd.currencyCode,
        annualRateBps: cmd.annualRateBps,
        dayCountConvention: cmd.dayCountConvention,
        effectiveFrom: cmd.effectiveFrom,
        effectiveTo: cmd.effectiveTo ?? null,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };

      await this.deps.db.insert(treasuryInternalInterestRateTable).values(rate);

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERNAL_INTEREST_RATE_CREATED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          internalInterestRateId: id,
          code: cmd.code,
          currencyCode: cmd.currencyCode,
          legalEntityId: cmd.legalEntityId ?? null,
        },
      });

      this.deps.logger.info(
        { internalInterestRateId: id, orgId: cmd.orgId, code: cmd.code },
        "Internal interest rate created",
      );

      return { ok: true, data: rate };
    } catch (err) {
      this.deps.logger.error(
        { error: err, orgId: cmd.orgId },
        "Failed to create internal interest rate",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }

  async activateInternalInterestRate(
    cmd: ActivateInternalInterestRateCommand,
  ): Promise<ServiceResult<InternalInterestRateEntity>> {
    try {
      const existing = await this.deps.db
        .select()
        .from(treasuryInternalInterestRateTable)
        .where(
          and(
            eq(treasuryInternalInterestRateTable.id, cmd.internalInterestRateId),
            eq(treasuryInternalInterestRateTable.orgId, cmd.orgId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERNAL_INTEREST_RATE_NOT_FOUND",
            message: `Internal interest rate ${cmd.internalInterestRateId} not found in org ${cmd.orgId}`,
          },
        };
      }

      const rate = existing[0];
      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      await this.deps.db
        .update(treasuryInternalInterestRateTable)
        .set({
          status: "inactive",
          updatedAt: now,
        })
        .where(
          and(
            eq(treasuryInternalInterestRateTable.orgId, cmd.orgId),
            eq(treasuryInternalInterestRateTable.currencyCode, rate.currencyCode),
            eq(treasuryInternalInterestRateTable.status, "active"),
          ),
        );

      await this.deps.db
        .update(treasuryInternalInterestRateTable)
        .set({
          status: "active",
          updatedAt: now,
        })
        .where(eq(treasuryInternalInterestRateTable.id, cmd.internalInterestRateId));

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERNAL_INTEREST_RATE_ACTIVATED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          internalInterestRateId: cmd.internalInterestRateId,
          currencyCode: rate.currencyCode,
        },
      });

      const updated = { ...rate, status: "active", updatedAt: now };

      this.deps.logger.info(
        { internalInterestRateId: cmd.internalInterestRateId, orgId: cmd.orgId },
        "Internal interest rate activated",
      );

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, internalInterestRateId: cmd.internalInterestRateId },
        "Failed to activate internal interest rate",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }
}
