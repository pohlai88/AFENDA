/**
 * GL routes â€” post journal entry, reverse entry, list entries, list accounts, trial balance.
 *
 * Follows the Sprint 0 evidence.ts pattern:
 *   - ZodTypeProvider for automatic validation + OpenAPI generation
 *   - makeSuccessSchema / ApiErrorResponseSchema for response shapes
 *   - requireOrg / requireAuth guards
 *   - Domain services from @afenda/core (never direct @afenda/db access)
 *   - Rate limiting via config.rateLimit overrides
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  requireAuth,
} from "../../../helpers/responses.js";
import { serializeDate } from "../../../helpers/dates.js";
import { buildOrgScopedContext, buildPolicyContext } from "../../../helpers/context.js";
import {
  PostToGLCommandSchema,
  ReverseEntryCommandSchema,
  CursorParamsSchema,
  type OrgId,
  type CorrelationId,
  type JournalEntryId,
  type PrincipalId,
  type AccountId,
} from "@afenda/contracts";
import {
  postToGL,
  reverseJournalEntry,
  listJournalEntries,
  getJournalEntryById,
  listAccounts,
  getTrialBalance,
} from "@afenda/core";
import type { OrgScopedContext, PolicyContext } from "@afenda/core";

// â”€â”€ Response schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const JournalEntryResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    entryNumber: z.string(),
  }),
);

const JournalLineJsonSchema = z.object({
  id: z.string().uuid(),
  journalEntryId: z.string().uuid(),
  accountId: z.string().uuid(),
  debitMinor: z.string().describe("Bigint as string"),
  creditMinor: z.string().describe("Bigint as string"),
  currencyCode: z.string(),
  memo: z.string().nullable(),
  dimensions: z.record(z.string(), z.string()).nullable(),
});

const JournalEntryDetailSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    entryNumber: z.string(),
    postedAt: z.string().datetime(),
    memo: z.string().nullable(),
    postedByPrincipalId: z.string().uuid().nullable(),
    correlationId: z.string(),
    idempotencyKey: z.string().nullable(),
    sourceInvoiceId: z.string().uuid().nullable(),
    reversalOfId: z.string().uuid().nullable(),
    createdAt: z.string().datetime(),
    lines: z.array(JournalLineJsonSchema),
  }),
);

const JournalEntryListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      entryNumber: z.string(),
      postedAt: z.string().datetime(),
      memo: z.string().nullable(),
      postedByPrincipalId: z.string().uuid().nullable(),
      correlationId: z.string(),
      sourceInvoiceId: z.string().uuid().nullable(),
      reversalOfId: z.string().uuid().nullable(),
      createdAt: z.string().datetime(),
    }),
  ),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

const AccountListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      code: z.string(),
      name: z.string(),
      type: z.string(),
      isActive: z.boolean(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

const TrialBalanceSchema = makeSuccessSchema(
  z.array(
    z.object({
      accountId: z.string().uuid(),
      accountCode: z.string(),
      accountName: z.string(),
      accountType: z.string(),
      debitTotal: z.string().describe("Bigint as string"),
      creditTotal: z.string().describe("Bigint as string"),
    }),
  ),
);

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Route registration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function glRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // â”€â”€ Post journal entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/post-to-gl",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Post a balanced journal entry to the General Ledger.",
        tags: ["GL"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: PostToGLCommandSchema,
        response: {
          201: JournalEntryResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await postToGL(app.db, buildOrgScopedContext(orgId), buildPolicyContext(req), {
        correlationId: req.body.correlationId,
        sourceInvoiceId: req.body.sourceInvoiceId,
        memo: req.body.memo,
        idempotencyKey: req.body.idempotencyKey,
        lines: req.body.lines.map((l) => ({
          accountId: l.accountId,
          debitMinor: l.debitMinor,
          creditMinor: l.creditMinor,
          currencyCode: l.currencyCode,
          memo: l.memo,
          dimensions: l.dimensions,
        })),
      });

      if (!result.ok) {
        const status = mapErrorStatus(result.error.code);
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  // â”€â”€ Reverse journal entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/reverse-entry",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create a reversal entry for an existing journal entry.",
        tags: ["GL"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ReverseEntryCommandSchema,
        response: {
          201: JournalEntryResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await reverseJournalEntry(
        app.db,
        buildOrgScopedContext(orgId),
        buildPolicyContext(req),
        req.body.correlationId,
        req.body.journalEntryId,
        req.body.memo,
        req.body.idempotencyKey,
      );

      if (!result.ok) {
        const status = mapErrorStatus(result.error.code);
        return reply.status(status).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  // â”€â”€ List journal entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/gl/journal-entries",
    {
      schema: {
        description: "List journal entries with cursor pagination.",
        tags: ["GL"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema,
        response: {
          200: JournalEntryListSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listJournalEntries(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
      });

      return {
        data: page.data.map((e) => ({
          id: e.id,
          orgId: e.orgId,
          entryNumber: e.entryNumber,
          postedAt: serializeDate(e.postedAt)!,
          memo: e.memo,
          postedByPrincipalId: e.postedByPrincipalId,
          correlationId: e.correlationId,
          sourceInvoiceId: e.sourceInvoiceId,
          reversalOfId: e.reversalOfId,
          createdAt: serializeDate(e.createdAt)!,
        })),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Get journal entry by ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/gl/journal-entries/:entryId",
    {
      schema: {
        description: "Get a single journal entry with its lines.",
        tags: ["GL"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ entryId: z.string().uuid() }),
        response: {
          200: JournalEntryDetailSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const entry = await getJournalEntryById(
        app.db,
        orgId as OrgId,
        req.params.entryId as JournalEntryId,
      );

      if (!entry) {
        return reply.status(404).send({
          error: {
            code: "SHARED_NOT_FOUND",
            message: "Journal entry not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: {
          id: entry.id,
          orgId: entry.orgId,
          entryNumber: entry.entryNumber,
          postedAt: serializeDate(entry.postedAt)!,
          memo: entry.memo,
          postedByPrincipalId: entry.postedByPrincipalId,
          correlationId: entry.correlationId,
          idempotencyKey: entry.idempotencyKey,
          sourceInvoiceId: entry.sourceInvoiceId,
          reversalOfId: entry.reversalOfId,
          createdAt: serializeDate(entry.createdAt)!,
          lines: entry.lines.map((l) => ({
            id: l.id,
            journalEntryId: l.journalEntryId,
            accountId: l.accountId,
            debitMinor: l.debitMinor.toString(),
            creditMinor: l.creditMinor.toString(),
            currencyCode: l.currencyCode,
            memo: l.memo,
            dimensions: l.dimensions,
          })),
        },
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ List accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/gl/accounts",
    {
      schema: {
        description: "List chart of accounts with cursor pagination.",
        tags: ["GL"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema,
        response: {
          200: AccountListSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listAccounts(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
      });

      return {
        data: page.data.map((a) => ({
          ...a,
          createdAt: serializeDate(a.createdAt)!,
          updatedAt: serializeDate(a.updatedAt)!,
        })),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Trial balance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/gl/trial-balance",
    {
      schema: {
        description: "Compute real-time trial balance across all accounts.",
        tags: ["GL"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: TrialBalanceSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await getTrialBalance(app.db, orgId as OrgId);

      return {
        data: rows.map((r) => ({
          accountId: r.accountId,
          accountCode: r.accountCode,
          accountName: r.accountName,
          accountType: r.accountType,
          debitTotal: r.debitTotal.toString(),
          creditTotal: r.creditTotal.toString(),
        })),
        correlationId: req.correlationId,
      };
    },
  );
}

// â”€â”€ Error code â†’ HTTP status mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function mapErrorStatus(code: string) {
  switch (code) {
    case "GL_ACCOUNT_NOT_FOUND":
    case "SHARED_NOT_FOUND":
      return 404 as const;
    case "IAM_INSUFFICIENT_PERMISSIONS":
      return 403 as const;
    case "GL_JOURNAL_UNBALANCED":
    case "GL_ACCOUNT_INACTIVE":
      return 400 as const;
    default:
      return 400 as const;
  }
}
