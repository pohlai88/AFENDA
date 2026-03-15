import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { postPayrollToGl } from "@afenda/core";
import { z } from "zod";
import type { OrgId, PrincipalId } from "@afenda/contracts";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const ResponseSchema = makeSuccessSchema(
  z.object({
    payrollRunId: z.string().uuid(),
    payrollGlPostingId: z.string().uuid(),
    journalEntryId: z.string().uuid().nullable(),
    status: z.string(),
  }),
);

function buildCtx(orgId: string): { activeContext: { orgId: OrgId } } {
  return { activeContext: { orgId: orgId as OrgId } };
}

function buildPolicyCtx(req: {
  ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> };
}): { principalId?: PrincipalId; permissionsSet: ReadonlySet<string> } {
  return {
    principalId: req.ctx?.principalId ?? undefined,
    permissionsSet: req.ctx?.permissionsSet ?? new Set(),
  };
}

export async function hrPostPayrollToGlRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    "/hrm/payroll/runs/:payrollRunId/post-to-gl",
    {
      schema: {
        description: "Post payroll run to General Ledger.",
        tags: ["HRM", "Payroll"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ payrollRunId: z.string().uuid() }),
        body: z.object({
          idempotencyKey: z.string().uuid(),
          payrollPayableAccountCode: z.string().trim().min(1).max(20).optional(),
        }),
        response: {
          200: ResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          500: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const auth = requireAuth(req, reply);
      if (!auth) return;

      const params = req.params as { payrollRunId: string };
      const body = req.body as { idempotencyKey: string; payrollPayableAccountCode?: string };

      const result = await postPayrollToGl(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        {
          payrollRunId: params.payrollRunId,
          payrollPayableAccountCode: body.payrollPayableAccountCode,
          idempotencyKey: body.idempotencyKey,
          correlationId: req.correlationId,
        },
      );

      if (!result.ok) {
        const status =
          result.error.code === "HRM_PAYROLL_RUN_NOT_FOUND"
            ? 404
            : result.error.code === "HRM_CONFLICT" ||
                result.error.code === "HRM_PAYROLL_GL_POSTING_ALREADY_EXISTS"
              ? 409
              : result.error.code === "IAM_INSUFFICIENT_PERMISSIONS"
                ? 403
                : 400;
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );
}
