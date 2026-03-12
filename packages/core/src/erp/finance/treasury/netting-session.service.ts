import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  AddNettingSessionItemsCommand,
  CloseNettingSessionCommand,
  CreateNettingSessionCommand,
  NettingSessionEntity,
  SettleNettingSessionCommand,
} from "@afenda/contracts";
import {
  outboxEvent,
  treasuryIntercompanyTransferTable,
  treasuryNettingSessionItemTable,
  treasuryNettingSessionTable,
} from "@afenda/db";
import { buildNetPositions } from "./calculators/internal-interest";

export interface NettingSessionServiceDeps {
  db: any;
  logger: any;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export class NettingSessionService {
  constructor(private deps: NettingSessionServiceDeps) {}

  async createNettingSession(
    cmd: CreateNettingSessionCommand,
  ): Promise<ServiceResult<NettingSessionEntity>> {
    try {
      const existing = await this.deps.db
        .select()
        .from(treasuryNettingSessionTable)
        .where(
          and(
            eq(treasuryNettingSessionTable.orgId, cmd.orgId),
            eq(treasuryNettingSessionTable.sessionNumber, cmd.sessionNumber),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SESSION_NUMBER_EXISTS",
            message: `Netting session ${cmd.sessionNumber} already exists in org ${cmd.orgId}`,
          },
        };
      }

      const id = randomUUID();
      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      const session: NettingSessionEntity = {
        id,
        orgId: cmd.orgId,
        sessionNumber: cmd.sessionNumber,
        currencyCode: cmd.currencyCode,
        nettingDate: cmd.nettingDate,
        settlementDate: cmd.settlementDate,
        status: "draft",
        totalObligationCount: 0,
        totalGrossPayableMinor: "0",
        totalGrossReceivableMinor: "0",
        totalNettableMinor: "0",
        sourceVersion: cmd.sourceVersion,
        closedAt: null,
        settledAt: null,
        createdAt: now,
        updatedAt: now,
      };

      await this.deps.db.insert(treasuryNettingSessionTable).values(session);

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.NETTING_SESSION_CREATED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          nettingSessionId: id,
          sessionNumber: cmd.sessionNumber,
          currencyCode: cmd.currencyCode,
        },
      });

      this.deps.logger.info(
        { nettingSessionId: id, orgId: cmd.orgId, sessionNumber: cmd.sessionNumber },
        "Netting session created",
      );

      return { ok: true, data: session };
    } catch (err) {
      this.deps.logger.error({ error: err, orgId: cmd.orgId }, "Failed to create netting session");
      return { ok: false, error: { code: "SHARED_INTERNAL_ERROR", message: String(err) } };
    }
  }

  async addNettingSessionItems(
    cmd: AddNettingSessionItemsCommand,
  ): Promise<ServiceResult<NettingSessionEntity>> {
    try {
      const sessions = await this.deps.db
        .select()
        .from(treasuryNettingSessionTable)
        .where(
          and(
            eq(treasuryNettingSessionTable.orgId, cmd.orgId),
            eq(treasuryNettingSessionTable.id, cmd.nettingSessionId),
          ),
        )
        .limit(1);

      if (sessions.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SESSION_NOT_FOUND",
            message: `Netting session ${cmd.nettingSessionId} not found in org ${cmd.orgId}`,
          },
        };
      }

      const session = sessions[0];

      if (session.status !== "draft" && session.status !== "open") {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SESSION_ILLEGAL_TRANSITION",
            message: `Cannot add items to session in ${session.status} state`,
          },
        };
      }

      const transfers = await this.deps.db
        .select()
        .from(treasuryIntercompanyTransferTable)
        .where(
          and(
            eq(treasuryIntercompanyTransferTable.orgId, cmd.orgId),
            inArray(treasuryIntercompanyTransferTable.id, cmd.intercompanyTransferIds),
          ),
        );

      if (transfers.length !== cmd.intercompanyTransferIds.length) {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SOURCE_TRANSFER_NOT_FOUND",
            message: "One or more intercompany transfers were not found",
          },
        };
      }

      for (const transfer of transfers) {
        if (transfer.status !== "settled") {
          return {
            ok: false,
            error: {
              code: "TREASURY_NETTING_SOURCE_TRANSFER_NOT_SETTLED",
              message: `Intercompany transfer ${transfer.id} is ${transfer.status}; only settled is allowed`,
            },
          };
        }

        if (transfer.currencyCode !== session.currencyCode) {
          return {
            ok: false,
            error: {
              code: "TREASURY_NETTING_SESSION_CURRENCY_MISMATCH",
              message: `Intercompany transfer ${transfer.id} currency does not match netting session currency`,
            },
          };
        }
      }

      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      for (const transfer of transfers) {
        await this.deps.db.insert(treasuryNettingSessionItemTable).values({
          id: randomUUID(),
          orgId: cmd.orgId,
          nettingSessionId: session.id,
          sourceType: "intercompany_transfer",
          sourceId: transfer.id,
          fromLegalEntityId: transfer.fromLegalEntityId,
          toLegalEntityId: transfer.toLegalEntityId,
          currencyCode: transfer.currencyCode,
          amountMinor: transfer.transferAmountMinor,
          status: "included",
          createdAt: now,
        });
      }

      const grossAdded = transfers.reduce(
        (acc: bigint, transfer: { transferAmountMinor: string }) =>
          acc + BigInt(transfer.transferAmountMinor),
        0n,
      );

      await this.deps.db
        .update(treasuryNettingSessionTable)
        .set({
          status: "open",
          totalObligationCount: session.totalObligationCount + transfers.length,
          totalGrossPayableMinor: (BigInt(session.totalGrossPayableMinor) + grossAdded).toString(),
          totalGrossReceivableMinor: (
            BigInt(session.totalGrossReceivableMinor) + grossAdded
          ).toString(),
          totalNettableMinor: (BigInt(session.totalNettableMinor) + grossAdded).toString(),
          updatedAt: now,
        })
        .where(eq(treasuryNettingSessionTable.id, session.id));

      const updated: NettingSessionEntity = {
        ...session,
        status: "open",
        totalObligationCount: session.totalObligationCount + transfers.length,
        totalGrossPayableMinor: (BigInt(session.totalGrossPayableMinor) + grossAdded).toString(),
        totalGrossReceivableMinor: (
          BigInt(session.totalGrossReceivableMinor) + grossAdded
        ).toString(),
        totalNettableMinor: (BigInt(session.totalNettableMinor) + grossAdded).toString(),
        updatedAt: now,
      };

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.NETTING_SESSION_ITEMS_ADDED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          nettingSessionId: session.id,
          addedCount: transfers.length,
        },
      });

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, orgId: cmd.orgId, nettingSessionId: cmd.nettingSessionId },
        "Failed to add netting session items",
      );
      return { ok: false, error: { code: "SHARED_INTERNAL_ERROR", message: String(err) } };
    }
  }

  async closeNettingSession(
    cmd: CloseNettingSessionCommand,
  ): Promise<ServiceResult<NettingSessionEntity>> {
    try {
      const sessions = await this.deps.db
        .select()
        .from(treasuryNettingSessionTable)
        .where(
          and(
            eq(treasuryNettingSessionTable.orgId, cmd.orgId),
            eq(treasuryNettingSessionTable.id, cmd.nettingSessionId),
          ),
        )
        .limit(1);

      if (sessions.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SESSION_NOT_FOUND",
            message: `Netting session ${cmd.nettingSessionId} not found in org ${cmd.orgId}`,
          },
        };
      }

      const session = sessions[0];
      if (session.status !== "open") {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SESSION_ILLEGAL_TRANSITION",
            message: `Cannot close netting session in ${session.status} state`,
          },
        };
      }

      const items = await this.deps.db
        .select()
        .from(treasuryNettingSessionItemTable)
        .where(
          and(
            eq(treasuryNettingSessionItemTable.orgId, cmd.orgId),
            eq(treasuryNettingSessionItemTable.nettingSessionId, cmd.nettingSessionId),
          ),
        );

      const positions = buildNetPositions(
        items.map((item: any) => ({
          fromLegalEntityId: item.fromLegalEntityId,
          toLegalEntityId: item.toLegalEntityId,
          amountMinor: item.amountMinor,
        })),
      );

      const netSum = positions.reduce(
        (acc: bigint, pos: { netPositionMinor: string }) => acc + BigInt(pos.netPositionMinor),
        0n,
      );

      if (netSum !== 0n) {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SESSION_UNBALANCED",
            message: "Netting positions are not balanced to zero",
          },
        };
      }

      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      await this.deps.db
        .update(treasuryNettingSessionTable)
        .set({
          status: "closed",
          closedAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryNettingSessionTable.id, cmd.nettingSessionId));

      await this.deps.db
        .update(treasuryNettingSessionItemTable)
        .set({ status: "netted" })
        .where(eq(treasuryNettingSessionItemTable.nettingSessionId, cmd.nettingSessionId));

      const updated: NettingSessionEntity = {
        ...session,
        status: "closed",
        closedAt: now,
        updatedAt: now,
      };

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.NETTING_SESSION_CLOSED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          nettingSessionId: cmd.nettingSessionId,
          positions,
        },
      });

      this.deps.logger.info(
        { nettingSessionId: cmd.nettingSessionId, orgId: cmd.orgId },
        "Netting session closed",
      );

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, orgId: cmd.orgId, nettingSessionId: cmd.nettingSessionId },
        "Failed to close netting session",
      );
      return { ok: false, error: { code: "SHARED_INTERNAL_ERROR", message: String(err) } };
    }
  }

  async settleNettingSession(
    cmd: SettleNettingSessionCommand,
  ): Promise<ServiceResult<NettingSessionEntity>> {
    try {
      const sessions = await this.deps.db
        .select()
        .from(treasuryNettingSessionTable)
        .where(
          and(
            eq(treasuryNettingSessionTable.orgId, cmd.orgId),
            eq(treasuryNettingSessionTable.id, cmd.nettingSessionId),
          ),
        )
        .limit(1);

      if (sessions.length === 0) {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SESSION_NOT_FOUND",
            message: `Netting session ${cmd.nettingSessionId} not found in org ${cmd.orgId}`,
          },
        };
      }

      const session = sessions[0];
      if (session.status !== "closed") {
        return {
          ok: false,
          error: {
            code: "TREASURY_NETTING_SESSION_ILLEGAL_TRANSITION",
            message: `Cannot settle netting session in ${session.status} state`,
          },
        };
      }

      // gate:allow-js-date Contract response timestamps mirror write time for returned entity shape.
      const now = new Date().toISOString();

      await this.deps.db
        .update(treasuryNettingSessionTable)
        .set({
          status: "settled",
          settledAt: now,
          updatedAt: now,
        })
        .where(eq(treasuryNettingSessionTable.id, cmd.nettingSessionId));

      await this.deps.db
        .update(treasuryNettingSessionItemTable)
        .set({ status: "settled" })
        .where(eq(treasuryNettingSessionItemTable.nettingSessionId, cmd.nettingSessionId));

      const updated: NettingSessionEntity = {
        ...session,
        status: "settled",
        settledAt: now,
        updatedAt: now,
      };

      await this.deps.db.insert(outboxEvent).values({
        orgId: cmd.orgId,
        type: "TREAS.NETTING_SESSION_SETTLED",
        version: "1",
        correlationId: cmd.correlationId,
        payload: {
          nettingSessionId: cmd.nettingSessionId,
        },
      });

      this.deps.logger.info(
        { nettingSessionId: cmd.nettingSessionId, orgId: cmd.orgId },
        "Netting session settled",
      );

      return { ok: true, data: updated };
    } catch (err) {
      this.deps.logger.error(
        { error: err, orgId: cmd.orgId, nettingSessionId: cmd.nettingSessionId },
        "Failed to settle netting session",
      );
      return { ok: false, error: { code: "SHARED_INTERNAL_ERROR", message: String(err) } };
    }
  }
}
