import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  ActivateInternalBankAccountCommand,
  CreateInternalBankAccountCommand,
  DeactivateInternalBankAccountCommand,
  InternalBankAccountEntity,
} from "@afenda/contracts";
import { outboxEvent, treasuryInternalBankAccountTable } from "@afenda/db";

export interface InternalBankAccountServiceDeps {
  db: any;
  logger: any;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/**
 * Internal Bank Account Service
 * Manages the lifecycle of internal treasury accounts used for liquidity management
 */
export class InternalBankAccountService {
  constructor(private deps: InternalBankAccountServiceDeps) {}

  /**
   * Create a new internal bank account in draft state
   */
  async createInternalBankAccount(
    cmd: CreateInternalBankAccountCommand,
  ): Promise<ServiceResult<InternalBankAccountEntity>> {
    try {
      // Check if code already exists in org
      const existing = await this.deps.db
        .select()
        .from(treasuryInternalBankAccountTable)
        .where(
          and(
            eq(treasuryInternalBankAccountTable.orgId, cmd.orgId),
            eq(treasuryInternalBankAccountTable.code, cmd.code),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERNAL_BANK_ACCOUNT_CODE_EXISTS",
            message: `Account code ${cmd.code} already exists in org ${cmd.orgId}`,
          },
        };
      }

      const id = randomUUID();
      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      const account: InternalBankAccountEntity = {
        id,
        orgId: cmd.orgId,
        legalEntityId: cmd.legalEntityId,
        code: cmd.code,
        accountName: cmd.accountName,
        accountType: cmd.accountType,
        currencyCode: cmd.currencyCode,
        externalBankAccountId: cmd.externalBankAccountId ?? null,
        status: "draft",
        isPrimaryFundingAccount: cmd.isPrimaryFundingAccount ?? false,
        activatedAt: null,
        deactivatedAt: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await this.deps.db.insert(treasuryInternalBankAccountTable).values(account);

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERNAL_BANK_ACCOUNT_CREATED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          internalBankAccountId: id,
          code: cmd.code,
          legalEntityId: cmd.legalEntityId,
        },
      });

      this.deps.logger.info(
        { accountId: id, orgId: cmd.orgId, code: cmd.code },
        "Internal bank account created",
      );

      return { ok: true, data: account };
    } catch (err) {
      this.deps.logger.error(
        { error: err, orgId: cmd.orgId },
        "Failed to create internal bank account",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }

  /**
   * Activate an internal bank account
   */
  async activateInternalBankAccount(
    cmd: ActivateInternalBankAccountCommand,
  ): Promise<ServiceResult<InternalBankAccountEntity>> {
    try {
      const existing = await this.deps.db
        .select()
        .from(treasuryInternalBankAccountTable)
        .where(
          and(
            eq(treasuryInternalBankAccountTable.id, cmd.internalBankAccountId),
            eq(treasuryInternalBankAccountTable.orgId, cmd.orgId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERNAL_BANK_ACCOUNT_NOT_FOUND",
            message: `Account ${cmd.internalBankAccountId} not found in org ${cmd.orgId}`,
          },
        };
      }

      const account = existing[0];

      if (account.status !== "draft") {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERNAL_BANK_ACCOUNT_ILLEGAL_TRANSITION",
            message: `Cannot activate account in ${account.status} state`,
          },
        };
      }

      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      await this.deps.db
        .update(treasuryInternalBankAccountTable)
        .set({
          status: "active",
          activatedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryInternalBankAccountTable.id, cmd.internalBankAccountId));

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERNAL_BANK_ACCOUNT_ACTIVATED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          internalBankAccountId: cmd.internalBankAccountId,
        },
      });

      const updated = { ...account, status: "active", activatedAt: now, updatedAt: now };

      this.deps.logger.info(
        { accountId: cmd.internalBankAccountId, orgId: cmd.orgId },
        "Internal bank account activated",
      );

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, accountId: cmd.internalBankAccountId },
        "Failed to activate internal bank account",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }

  /**
   * Deactivate an internal bank account
   */
  async deactivateInternalBankAccount(
    cmd: DeactivateInternalBankAccountCommand,
  ): Promise<ServiceResult<InternalBankAccountEntity>> {
    try {
      const existing = await this.deps.db
        .select()
        .from(treasuryInternalBankAccountTable)
        .where(
          and(
            eq(treasuryInternalBankAccountTable.id, cmd.internalBankAccountId),
            eq(treasuryInternalBankAccountTable.orgId, cmd.orgId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERNAL_BANK_ACCOUNT_NOT_FOUND",
            message: `Account ${cmd.internalBankAccountId} not found in org ${cmd.orgId}`,
          },
        };
      }

      const account = existing[0];

      if (account.status !== "active") {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERNAL_BANK_ACCOUNT_ILLEGAL_TRANSITION",
            message: `Cannot deactivate account in ${account.status} state`,
          },
        };
      }

      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      await this.deps.db
        .update(treasuryInternalBankAccountTable)
        .set({
          status: "inactive",
          deactivatedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryInternalBankAccountTable.id, cmd.internalBankAccountId));

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERNAL_BANK_ACCOUNT_DEACTIVATED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          internalBankAccountId: cmd.internalBankAccountId,
          reason: cmd.reason,
        },
      });

      const updated = { ...account, status: "inactive", deactivatedAt: now, updatedAt: now };

      this.deps.logger.info(
        { accountId: cmd.internalBankAccountId, orgId: cmd.orgId, reason: cmd.reason },
        "Internal bank account deactivated",
      );

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, accountId: cmd.internalBankAccountId },
        "Failed to deactivate internal bank account",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }
}
