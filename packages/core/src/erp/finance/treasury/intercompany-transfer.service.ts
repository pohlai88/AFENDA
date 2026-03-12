import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  ApproveIntercompanyTransferCommand,
  CreateIntercompanyTransferCommand,
  RejectIntercompanyTransferCommand,
  SettleIntercompanyTransferCommand,
  SubmitIntercompanyTransferCommand,
  IntercompanyTransferEntity,
} from "@afenda/contracts";
import {
  outboxEvent,
  treasuryInternalBankAccountTable,
  treasuryIntercompanyTransferTable,
} from "@afenda/db";
import {
  assertBalancedTransfer,
  calculateBalancedLegs,
} from "./calculators/intercompany-balancing";

export interface IntercompanyTransferServiceDeps {
  db: any;
  logger: any;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/**
 * Intercompany Transfer Service
 * Manages internal treasury transfers between legal entities with Double-Entry Book Keeping (DEBK) support
 */
export class IntercompanyTransferService {
  constructor(private deps: IntercompanyTransferServiceDeps) {}

  /**
   * Create an intercompany transfer in draft state
   */
  async createIntercompanyTransfer(
    cmd: CreateIntercompanyTransferCommand,
  ): Promise<ServiceResult<IntercompanyTransferEntity>> {
    try {
      // Check if from and to legal entities are the same
      if (cmd.fromLegalEntityId === cmd.toLegalEntityId) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_SAME_ENTITY",
            message: "Cannot transfer between same legal entity",
          },
        };
      }

      // Verify both accounts exist and are active
      const fromAccount = await this.deps.db
        .select()
        .from(treasuryInternalBankAccountTable)
        .where(
          and(
            eq(treasuryInternalBankAccountTable.id, cmd.fromInternalBankAccountId),
            eq(treasuryInternalBankAccountTable.orgId, cmd.orgId),
          ),
        )
        .limit(1);

      if (fromAccount.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_NOT_FOUND",
            message: `From account ${cmd.fromInternalBankAccountId} not found`,
          },
        };
      }

      const toAccount = await this.deps.db
        .select()
        .from(treasuryInternalBankAccountTable)
        .where(
          and(
            eq(treasuryInternalBankAccountTable.id, cmd.toInternalBankAccountId),
            eq(treasuryInternalBankAccountTable.orgId, cmd.orgId),
          ),
        )
        .limit(1);

      if (toAccount.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_NOT_FOUND",
            message: `To account ${cmd.toInternalBankAccountId} not found`,
          },
        };
      }

      // Check accounts are active
      if (fromAccount[0].status !== "active") {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_INACTIVE",
            message: `From account is ${fromAccount[0].status}`,
          },
        };
      }

      if (toAccount[0].status !== "active") {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_INACTIVE",
            message: `To account is ${toAccount[0].status}`,
          },
        };
      }

      // Verify accounts belong to correct legal entities
      if (fromAccount[0].legalEntityId !== cmd.fromLegalEntityId) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ENTITY_ACCOUNT_MISMATCH",
            message: "From account does not belong to from legal entity",
          },
        };
      }

      if (toAccount[0].legalEntityId !== cmd.toLegalEntityId) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ENTITY_ACCOUNT_MISMATCH",
            message: "To account does not belong to to legal entity",
          },
        };
      }

      // Check currency match
      if (fromAccount[0].currencyCode !== cmd.currencyCode) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_CURRENCY_MISMATCH",
            message: "From account currency does not match transfer currency",
          },
        };
      }

      if (toAccount[0].currencyCode !== cmd.currencyCode) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_CURRENCY_MISMATCH",
            message: "To account currency does not match transfer currency",
          },
        };
      }

      // Check transfer number is unique
      const existingTransfer = await this.deps.db
        .select()
        .from(treasuryIntercompanyTransferTable)
        .where(
          and(
            eq(treasuryIntercompanyTransferTable.orgId, cmd.orgId),
            eq(treasuryIntercompanyTransferTable.transferNumber, cmd.transferNumber),
          ),
        )
        .limit(1);

      if (existingTransfer.length > 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_NUMBER_EXISTS",
            message: `Transfer number ${cmd.transferNumber} already exists`,
          },
        };
      }

      // Calculate balanced legs
      const legs = calculateBalancedLegs(cmd.transferAmountMinor);

      const id = randomUUID();
      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      const transfer: IntercompanyTransferEntity = {
        id,
        orgId: cmd.orgId,
        transferNumber: cmd.transferNumber,
        fromLegalEntityId: cmd.fromLegalEntityId,
        toLegalEntityId: cmd.toLegalEntityId,
        fromInternalBankAccountId: cmd.fromInternalBankAccountId,
        toInternalBankAccountId: cmd.toInternalBankAccountId,
        purpose: cmd.purpose,
        currencyCode: cmd.currencyCode,
        transferAmountMinor: cmd.transferAmountMinor,
        debitLegAmountMinor: legs.debitLegAmountMinor,
        creditLegAmountMinor: legs.creditLegAmountMinor,
        requestedExecutionDate: cmd.requestedExecutionDate,
        status: "draft",
        makerUserId: cmd.actorUserId,
        checkerUserId: null,
        approvedAt: null,
        rejectedAt: null,
        settledAt: null,
        rejectionReason: null,
        sourceVersion: cmd.sourceVersion,
        createdAt: now,
        updatedAt: now,
      };

      await this.deps.db.insert(treasuryIntercompanyTransferTable).values(transfer);

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERCOMPANY_TRANSFER_CREATED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          intercompanyTransferId: id,
          transferNumber: cmd.transferNumber,
          fromLegalEntityId: cmd.fromLegalEntityId,
          toLegalEntityId: cmd.toLegalEntityId,
          amountMinor: cmd.transferAmountMinor,
          currencyCode: cmd.currencyCode,
        },
      });

      this.deps.logger.info(
        { transferId: id, transferNumber: cmd.transferNumber, orgId: cmd.orgId },
        "Intercompany transfer created",
      );

      return { ok: true, data: transfer };
    } catch (err) {
      this.deps.logger.error(
        { error: err, orgId: cmd.orgId },
        "Failed to create intercompany transfer",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }

  /**
   * Submit an intercompany transfer for approval
   */
  async submitIntercompanyTransfer(
    cmd: SubmitIntercompanyTransferCommand,
  ): Promise<ServiceResult<IntercompanyTransferEntity>> {
    try {
      const existing = await this.deps.db
        .select()
        .from(treasuryIntercompanyTransferTable)
        .where(
          and(
            eq(treasuryIntercompanyTransferTable.id, cmd.intercompanyTransferId),
            eq(treasuryIntercompanyTransferTable.orgId, cmd.orgId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND",
            message: `Transfer ${cmd.intercompanyTransferId} not found`,
          },
        };
      }

      const transfer = existing[0];

      if (transfer.status !== "draft") {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION",
            message: `Cannot submit transfer in ${transfer.status} state`,
          },
        };
      }

      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      await this.deps.db
        .update(treasuryIntercompanyTransferTable)
        .set({
          status: "pending_approval",
          updatedAt: now,
        })
        .where(eq(treasuryIntercompanyTransferTable.id, cmd.intercompanyTransferId));

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERCOMPANY_TRANSFER_SUBMITTED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          intercompanyTransferId: cmd.intercompanyTransferId,
        },
      });

      const updated = { ...transfer, status: "pending_approval", updatedAt: now };

      this.deps.logger.info(
        { transferId: cmd.intercompanyTransferId, orgId: cmd.orgId },
        "Intercompany transfer submitted for approval",
      );

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, transferId: cmd.intercompanyTransferId },
        "Failed to submit intercompany transfer",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }

  /**
   * Approve an intercompany transfer
   */
  async approveIntercompanyTransfer(
    cmd: ApproveIntercompanyTransferCommand,
  ): Promise<ServiceResult<IntercompanyTransferEntity>> {
    try {
      const existing = await this.deps.db
        .select()
        .from(treasuryIntercompanyTransferTable)
        .where(
          and(
            eq(treasuryIntercompanyTransferTable.id, cmd.intercompanyTransferId),
            eq(treasuryIntercompanyTransferTable.orgId, cmd.orgId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND",
            message: `Transfer ${cmd.intercompanyTransferId} not found`,
          },
        };
      }

      const transfer = existing[0];

      if (transfer.status !== "pending_approval") {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION",
            message: `Cannot approve transfer in ${transfer.status} state`,
          },
        };
      }

      if (transfer.makerUserId === cmd.actorUserId) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_SOD_VIOLATION",
            message: "Maker-checker violation",
          },
        };
      }

      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      await this.deps.db
        .update(treasuryIntercompanyTransferTable)
        .set({
          status: "approved",
          checkerUserId: cmd.actorUserId,
          approvedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryIntercompanyTransferTable.id, cmd.intercompanyTransferId));

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERCOMPANY_TRANSFER_APPROVED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          intercompanyTransferId: cmd.intercompanyTransferId,
          checkerUserId: cmd.actorUserId,
        },
      });

      const updated = {
        ...transfer,
        status: "approved",
        checkerUserId: cmd.actorUserId,
        approvedAt: now,
        updatedAt: now,
      };

      this.deps.logger.info(
        { transferId: cmd.intercompanyTransferId, orgId: cmd.orgId },
        "Intercompany transfer approved",
      );

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, transferId: cmd.intercompanyTransferId },
        "Failed to approve intercompany transfer",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }

  /**
   * Reject an intercompany transfer
   */
  async rejectIntercompanyTransfer(
    cmd: RejectIntercompanyTransferCommand,
  ): Promise<ServiceResult<IntercompanyTransferEntity>> {
    try {
      const existing = await this.deps.db
        .select()
        .from(treasuryIntercompanyTransferTable)
        .where(
          and(
            eq(treasuryIntercompanyTransferTable.id, cmd.intercompanyTransferId),
            eq(treasuryIntercompanyTransferTable.orgId, cmd.orgId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND",
            message: `Transfer ${cmd.intercompanyTransferId} not found`,
          },
        };
      }

      const transfer = existing[0];

      if (transfer.status !== "pending_approval") {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION",
            message: `Cannot reject transfer in ${transfer.status} state`,
          },
        };
      }

      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      await this.deps.db
        .update(treasuryIntercompanyTransferTable)
        .set({
          status: "rejected",
          checkerUserId: cmd.actorUserId,
          rejectedAt: now,
          rejectionReason: cmd.reason,
          updatedAt: now,
        })
        .where(eq(treasuryIntercompanyTransferTable.id, cmd.intercompanyTransferId));

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERCOMPANY_TRANSFER_REJECTED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          intercompanyTransferId: cmd.intercompanyTransferId,
          checkerUserId: cmd.actorUserId,
          reason: cmd.reason,
        },
      });

      const updated = {
        ...transfer,
        status: "rejected",
        checkerUserId: cmd.actorUserId,
        rejectedAt: now,
        rejectionReason: cmd.reason,
        updatedAt: now,
      };

      this.deps.logger.info(
        { transferId: cmd.intercompanyTransferId, orgId: cmd.orgId, reason: cmd.reason },
        "Intercompany transfer rejected",
      );

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, transferId: cmd.intercompanyTransferId },
        "Failed to reject intercompany transfer",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }

  /**
   * Settle an intercompany transfer
   */
  async settleIntercompanyTransfer(
    cmd: SettleIntercompanyTransferCommand,
  ): Promise<ServiceResult<IntercompanyTransferEntity>> {
    try {
      const existing = await this.deps.db
        .select()
        .from(treasuryIntercompanyTransferTable)
        .where(
          and(
            eq(treasuryIntercompanyTransferTable.id, cmd.intercompanyTransferId),
            eq(treasuryIntercompanyTransferTable.orgId, cmd.orgId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND",
            message: `Transfer ${cmd.intercompanyTransferId} not found`,
          },
        };
      }

      const transfer = existing[0];

      if (transfer.status !== "approved") {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION",
            message: `Cannot settle transfer in ${transfer.status} state`,
          },
        };
      }

      // Verify balance before settling
      try {
        assertBalancedTransfer({
          transferAmountMinor: transfer.transferAmountMinor,
          debitLegAmountMinor: transfer.debitLegAmountMinor,
          creditLegAmountMinor: transfer.creditLegAmountMinor,
        });
      } catch (err) {
        return {
          ok: false,
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_UNBALANCED",
            message: String(err),
          },
        };
      }

      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      await this.deps.db
        .update(treasuryIntercompanyTransferTable)
        .set({
          status: "settled",
          settledAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryIntercompanyTransferTable.id, cmd.intercompanyTransferId));

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.INTERCOMPANY_TRANSFER_SETTLED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          intercompanyTransferId: cmd.intercompanyTransferId,
          transferNumber: transfer.transferNumber,
          fromLegalEntityId: transfer.fromLegalEntityId,
          toLegalEntityId: transfer.toLegalEntityId,
          fromInternalBankAccountId: transfer.fromInternalBankAccountId,
          toInternalBankAccountId: transfer.toInternalBankAccountId,
          purpose: transfer.purpose,
          currencyCode: transfer.currencyCode,
          transferAmountMinor: transfer.transferAmountMinor,
          debitLegAmountMinor: transfer.debitLegAmountMinor,
          creditLegAmountMinor: transfer.creditLegAmountMinor,
          requestedExecutionDate: transfer.requestedExecutionDate,
          settledAt: now,
          sourceVersion: transfer.sourceVersion,
        },
      });

      const updated = {
        ...transfer,
        status: "settled",
        settledAt: now,
        updatedAt: now,
      };

      this.deps.logger.info(
        { transferId: cmd.intercompanyTransferId, orgId: cmd.orgId },
        "Intercompany transfer settled",
      );

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, transferId: cmd.intercompanyTransferId },
        "Failed to settle intercompany transfer",
      );
      return {
        ok: false,
        error: { code: "SHARED_INTERNAL_ERROR", message: String(err) },
      };
    }
  }
}
