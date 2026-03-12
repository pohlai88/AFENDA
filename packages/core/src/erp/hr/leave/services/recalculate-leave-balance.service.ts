import type { DbClient } from "@afenda/db";
import { auditLog, hrmLeaveBalances, hrmLeaveRequests, outboxEvent } from "@afenda/db";
import { and, eq, sql } from "drizzle-orm";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import type {
  RecalculateLeaveBalanceInput,
  RecalculateLeaveBalanceOutput,
} from "../dto/recalculate-leave-balance.dto";

function parseDecimal(input: string): number | null {
  if (!/^-?\d+(?:\.\d+)?$/.test(input)) {
    return null;
  }

  const value = Number(input);
  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }

  return 31;
}

function resolveAccrualPeriodRange(
  accrualPeriod: string,
): { periodStart: string; periodEnd: string } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(accrualPeriod);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const monthText = String(month).padStart(2, "0");
  const endDay = String(daysInMonth(year, month)).padStart(2, "0");

  return {
    periodStart: `${year}-${monthText}-01`,
    periodEnd: `${year}-${monthText}-${endDay}`,
  };
}

export async function recalculateLeaveBalance(
  db: DbClient,
  orgId: string,
  actorPrincipalId: string | undefined,
  correlationId: string,
  input: RecalculateLeaveBalanceInput,
): Promise<HrmResult<RecalculateLeaveBalanceOutput>> {
  if (!input.employmentId || !input.leaveTypeId || !input.accrualPeriod) {
    return err(
      HRM_ERROR_CODES.INVALID_INPUT,
      "employmentId, leaveTypeId and accrualPeriod are required",
    );
  }

  const periodRange = resolveAccrualPeriodRange(input.accrualPeriod);
  if (!periodRange) {
    return err(HRM_ERROR_CODES.INVALID_INPUT, "accrualPeriod must be in YYYY-MM format");
  }

  try {
    const data = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          leaveBalanceId: hrmLeaveBalances.id,
          openingBalance: hrmLeaveBalances.openingBalance,
          accruedAmount: hrmLeaveBalances.accruedAmount,
        })
        .from(hrmLeaveBalances)
        .where(
          and(
            eq(hrmLeaveBalances.orgId, orgId),
            eq(hrmLeaveBalances.employmentId, input.employmentId),
            eq(hrmLeaveBalances.leaveTypeId, input.leaveTypeId),
            eq(hrmLeaveBalances.accrualPeriod, input.accrualPeriod),
          ),
        );

      const [consumedRow] = await tx
        .select({
          consumedAmount: sql<string>`coalesce(sum(${hrmLeaveRequests.requestedAmount}), 0)::text`,
        })
        .from(hrmLeaveRequests)
        .where(
          and(
            eq(hrmLeaveRequests.orgId, orgId),
            eq(hrmLeaveRequests.employmentId, input.employmentId),
            eq(hrmLeaveRequests.leaveTypeId, input.leaveTypeId),
            eq(hrmLeaveRequests.status, "approved"),
            sql`${hrmLeaveRequests.startDate} <= ${periodRange.periodEnd}::date`,
            sql`${hrmLeaveRequests.endDate} >= ${periodRange.periodStart}::date`,
          ),
        );

      const openingBalance = input.openingBalance ?? String(existing?.openingBalance ?? "0");
      const accruedAmount = input.accruedAmount ?? String(existing?.accruedAmount ?? "0");
      const consumedAmount = String(consumedRow?.consumedAmount ?? "0");

      const openingValue = parseDecimal(openingBalance);
      const accruedValue = parseDecimal(accruedAmount);
      const consumedValue = parseDecimal(consumedAmount);

      if (openingValue === null || accruedValue === null || consumedValue === null) {
        return err<RecalculateLeaveBalanceOutput>(
          HRM_ERROR_CODES.INVALID_INPUT,
          "openingBalance, accruedAmount and consumedAmount must be numeric",
        );
      }

      const closingValue = openingValue + accruedValue - consumedValue;
      if (closingValue < 0) {
        return err<RecalculateLeaveBalanceOutput>(
          HRM_ERROR_CODES.CONFLICT,
          "Leave balance cannot be negative after recalculation",
          {
            employmentId: input.employmentId,
            leaveTypeId: input.leaveTypeId,
            accrualPeriod: input.accrualPeriod,
          },
        );
      }

      const closingBalance = closingValue.toFixed(6);

      const [row] = await tx
        .insert(hrmLeaveBalances)
        .values({
          orgId,
          employmentId: input.employmentId,
          leaveTypeId: input.leaveTypeId,
          accrualPeriod: input.accrualPeriod,
          openingBalance,
          accruedAmount,
          consumedAmount,
          closingBalance,
        })
        .onConflictDoUpdate({
          target: [
            hrmLeaveBalances.orgId,
            hrmLeaveBalances.employmentId,
            hrmLeaveBalances.leaveTypeId,
            hrmLeaveBalances.accrualPeriod,
          ],
          set: {
            openingBalance,
            accruedAmount,
            consumedAmount,
            closingBalance,
            updatedAt: sql`now()`,
          },
        })
        .returning({
          leaveBalanceId: hrmLeaveBalances.id,
          employmentId: hrmLeaveBalances.employmentId,
          leaveTypeId: hrmLeaveBalances.leaveTypeId,
          accrualPeriod: hrmLeaveBalances.accrualPeriod,
          openingBalance: hrmLeaveBalances.openingBalance,
          accruedAmount: hrmLeaveBalances.accruedAmount,
          consumedAmount: hrmLeaveBalances.consumedAmount,
          closingBalance: hrmLeaveBalances.closingBalance,
        });

      if (!row) {
        throw new Error("Failed to recalculate leave balance");
      }

      await tx.insert(auditLog).values({
        orgId,
        actorPrincipalId: actorPrincipalId ?? null,
        action: HRM_EVENTS.LEAVE_BALANCE_RECALCULATED,
        entityType: "hrm_leave_balance",
        entityId: row.leaveBalanceId,
        correlationId,
        details: {
          leaveBalanceId: row.leaveBalanceId,
          employmentId: row.employmentId,
          leaveTypeId: row.leaveTypeId,
          accrualPeriod: row.accrualPeriod,
          openingBalance: row.openingBalance,
          accruedAmount: row.accruedAmount,
          consumedAmount: row.consumedAmount,
          closingBalance: row.closingBalance,
        },
      });

      await tx.insert(outboxEvent).values({
        orgId,
        type: "HRM.LEAVE_BALANCE_RECALCULATED",
        version: "1",
        correlationId,
        payload: {
          leaveBalanceId: row.leaveBalanceId,
          employmentId: row.employmentId,
          leaveTypeId: row.leaveTypeId,
          accrualPeriod: row.accrualPeriod,
          openingBalance: row.openingBalance,
          accruedAmount: row.accruedAmount,
          consumedAmount: row.consumedAmount,
          closingBalance: row.closingBalance,
        },
      });

      return ok<RecalculateLeaveBalanceOutput>({
        leaveBalanceId: row.leaveBalanceId,
        employmentId: row.employmentId,
        leaveTypeId: row.leaveTypeId,
        accrualPeriod: row.accrualPeriod,
        openingBalance: String(row.openingBalance),
        accruedAmount: String(row.accruedAmount),
        consumedAmount: String(row.consumedAmount),
        closingBalance: String(row.closingBalance),
      });
    });

    return data;
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to recalculate leave balance", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
