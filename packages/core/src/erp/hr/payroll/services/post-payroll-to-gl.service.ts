import type { DbClient } from "@afenda/db";
import {
  auditLog,
  hrmPayrollGlPostingLines,
  hrmPayrollGlPostings,
  hrmPayrollRuns,
  outboxEvent,
} from "@afenda/db";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { OrgScopedContext } from "../../../../kernel/governance/audit/audit";
import type { PolicyContext } from "../../../finance/sod";
import { postToGL } from "../../../finance/gl";
import { HRM_ERROR_CODES } from "../../shared/constants/hrm-error-codes";
import { HRM_EVENTS } from "../../shared/events/hrm-events";
import { err, ok, type HrmResult } from "../../shared/types/hrm-result";
import { buildPayrollGlMapping } from "./build-payroll-gl-mapping.service";

export interface PostPayrollToGlInput {
  payrollRunId: string;
  payrollPayableAccountCode?: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface PostPayrollToGlOutput {
  payrollRunId: string;
  payrollGlPostingId: string;
  journalEntryId: string | null;
  status: string;
}

export async function postPayrollToGl(
  db: DbClient,
  ctx: OrgScopedContext,
  policyCtx: PolicyContext,
  input: PostPayrollToGlInput,
): Promise<HrmResult<PostPayrollToGlOutput>> {
  const orgId = ctx.activeContext.orgId;

  try {
    const [run] = await db
      .select({
        id: hrmPayrollRuns.id,
        status: hrmPayrollRuns.status,
      })
      .from(hrmPayrollRuns)
      .where(
        and(
          eq(hrmPayrollRuns.orgId, orgId),
          eq(hrmPayrollRuns.id, input.payrollRunId),
        ),
      );

    if (!run) {
      return err(HRM_ERROR_CODES.PAYROLL_RUN_NOT_FOUND, "Payroll run not found", {
        payrollRunId: input.payrollRunId,
      });
    }

    if (run.status !== "approved") {
      return err(HRM_ERROR_CODES.CONFLICT, "Payroll run must be approved before posting to GL", {
        payrollRunId: input.payrollRunId,
        currentStatus: run.status,
      });
    }

    const [existing] = await db
      .select({ id: hrmPayrollGlPostings.id, postingStatus: hrmPayrollGlPostings.postingStatus })
      .from(hrmPayrollGlPostings)
      .where(
        and(
          eq(hrmPayrollGlPostings.orgId, orgId),
          eq(hrmPayrollGlPostings.payrollRunId, input.payrollRunId),
        ),
      );

    if (existing) {
      if (existing.postingStatus === "posted") {
        return err(HRM_ERROR_CODES.PAYROLL_GL_POSTING_ALREADY_EXISTS, "Payroll already posted to GL", {
          payrollRunId: input.payrollRunId,
          payrollGlPostingId: existing.id,
        });
      }
    }

    const payableCode = input.payrollPayableAccountCode ?? "2100";
    const mappingResult = await buildPayrollGlMapping(db, {
      orgId,
      payrollRunId: input.payrollRunId,
      payrollPayableAccountCode: payableCode,
    });

    if ("error" in mappingResult) {
      return err(
        HRM_ERROR_CODES.PAYROLL_GL_MAPPING_INCOMPLETE,
        mappingResult.error,
        { payrollRunId: input.payrollRunId },
      );
    }

    if (mappingResult.lines.length === 0) {
      return err(HRM_ERROR_CODES.PAYROLL_GL_MAPPING_INCOMPLETE, "No GL lines to post", {
        payrollRunId: input.payrollRunId,
      });
    }

    const [posting] = await db
      .insert(hrmPayrollGlPostings)
      .values({
        orgId,
        payrollRunId: input.payrollRunId,
        postingStatus: "pending",
      })
      .returning({
        id: hrmPayrollGlPostings.id,
      });

    if (!posting) {
      throw new Error("Failed to create payroll GL posting");
    }

    for (const line of mappingResult.lines) {
      await db.insert(hrmPayrollGlPostingLines).values({
        orgId,
        payrollGlPostingId: posting.id,
        accountId: line.accountId,
        debitMinor: line.debitMinor,
        creditMinor: line.creditMinor,
        currencyCode: line.currencyCode,
        memo: line.memo ?? null,
      });
    }

    const glResult = await postToGL(db, ctx, policyCtx, {
      correlationId: input.correlationId as import("@afenda/contracts").CorrelationId,
      memo: `Payroll run ${input.payrollRunId}`,
      idempotencyKey: input.idempotencyKey,
      lines: mappingResult.lines.map((l) => ({
        accountId: l.accountId as import("@afenda/contracts").AccountId,
        debitMinor: l.debitMinor,
        creditMinor: l.creditMinor,
        currencyCode: l.currencyCode,
        memo: l.memo,
      })),
    });

    if (!glResult.ok) {
      await db
        .update(hrmPayrollGlPostings)
        .set({
          postingStatus: "failed",
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(hrmPayrollGlPostings.orgId, orgId),
            eq(hrmPayrollGlPostings.id, posting.id),
          ),
        );
      return err(
        glResult.error.code,
        glResult.error.message,
        glResult.error.meta,
      );
    }

    await db
      .update(hrmPayrollGlPostings)
      .set({
        journalEntryId: glResult.data.id,
        postingStatus: "posted",
        postedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(hrmPayrollGlPostings.orgId, orgId),
          eq(hrmPayrollGlPostings.id, posting.id),
        ),
      );

    await db.insert(auditLog).values({
      orgId,
      actorPrincipalId: policyCtx.principalId ?? null,
      action: HRM_EVENTS.PAYROLL_POSTED_TO_GL,
      entityType: "hrm_payroll_gl_posting",
      entityId: posting.id,
      correlationId: input.correlationId,
      details: {
        payrollRunId: input.payrollRunId,
        payrollGlPostingId: posting.id,
        journalEntryId: glResult.data.id,
        entryNumber: glResult.data.entryNumber,
      },
    });

    await db.insert(outboxEvent).values({
      orgId,
      type: "HRM.PAYROLL_POSTED_TO_GL",
      version: "1",
      correlationId: input.correlationId,
      payload: {
        payrollRunId: input.payrollRunId,
        payrollGlPostingId: posting.id,
        journalEntryId: glResult.data.id,
        entryNumber: glResult.data.entryNumber,
      },
    });

    return ok({
      payrollRunId: input.payrollRunId,
      payrollGlPostingId: posting.id,
      journalEntryId: glResult.data.id,
      status: "posted",
    });
  } catch (error) {
    return err(HRM_ERROR_CODES.INTERNAL_ERROR, "Failed to post payroll to GL", {
      cause: error instanceof Error ? error.message : "unknown_error",
    });
  }
}
