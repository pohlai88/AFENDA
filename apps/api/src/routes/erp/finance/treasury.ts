import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ActivateBankAccountCommandSchema,
  BankAccountStatusValues,
  BankStatementStatusValues,
  CashMovementDirectionValues,
  StatementLineStatusValues,
  CreateBankAccountCommandSchema,
  CursorParamsSchema,
  DeactivateBankAccountCommandSchema,
  IngestBankStatementCommandSchema,
  MarkStatementFailedCommandSchema,
  type CorrelationId,
  type IngestBankStatementCommand,
  type MarkStatementFailedCommand,
  type OrgId,
  type PrincipalId,
  UpdateBankAccountCommandSchema,
  IdempotencyKeySchema,
  BankAccountIdSchema,
  CurrencyCodeSchema,
  UtcDateTimeSchema,
  CashMovementDirectionValues as DirectionEnumValues,
  // Wave 2 — Reconciliation
  OpenReconciliationSessionCommandSchema,
  AddReconciliationMatchCommandSchema,
  RemoveReconciliationMatchCommandSchema,
  CloseReconciliationSessionCommandSchema,
  ReconciliationSessionStatusValues,
  ReconciliationTargetTypeValues,
  ReconciliationMatchStatusValues,
  // Wave 2 — Payment Instructions
  CreatePaymentInstructionCommandSchema,
  SubmitPaymentInstructionCommandSchema,
  ApprovePaymentInstructionCommandSchema,
  RejectPaymentInstructionCommandSchema,
  PaymentInstructionStatusValues,
  TreasuryPaymentMethodValues,
  // Wave 2 — Payment Batches
  CreatePaymentBatchCommandSchema,
  RequestPaymentBatchReleaseCommandSchema,
  ReleasePaymentBatchCommandSchema,
  PaymentBatchStatusValues,
  // Wave 3 — Cash Position Snapshot
  RequestCashPositionSnapshotCommandSchema,
  CashPositionSnapshotStatusValues,
  CashPositionBucketTypeValues,
  CashPositionSourceTypeValues,
  // Wave 3.2 — Liquidity Forecast
  CreateLiquidityScenarioCommandSchema,
  ActivateLiquidityScenarioCommandSchema,
  RequestLiquidityForecastCommandSchema,
  LiquidityScenarioStatusValues,
  LiquidityScenarioTypeValues,
  LiquidityForecastStatusValues,
  LiquidityForecastBucketGranularityValues,
  LiquiditySourceFeedTypeValues,
  LiquiditySourceFeedStatusValues,
  LiquiditySourceDirectionValues,
  UpsertLiquiditySourceFeedCommandSchema,
  // Wave 3.3 — Forecast Variance
  RecordForecastVarianceCommandSchema,
} from "@afenda/contracts";
import {
  activateBankAccount,
  createBankAccount,
  deactivateBankAccount,
  getBankAccountById,
  getBankStatementById,
  ingestBankStatement,
  listBankAccounts,
  listBankStatementLines,
  listBankStatements,
  markStatementFailed,
  updateBankAccount,
  // Wave 2 — Reconciliation
  openReconciliationSession,
  addReconciliationMatch,
  removeReconciliationMatch,
  closeReconciliationSession,
  listReconciliationSessions,
  getReconciliationSessionById,
  listReconciliationMatches,
  // Wave 2 — Payment Instructions
  createPaymentInstruction,
  submitPaymentInstruction,
  approvePaymentInstruction,
  rejectPaymentInstruction,
  listPaymentInstructions,
  getPaymentInstructionById,
  // Wave 2 — Payment Batches
  createPaymentBatch,
  requestPaymentBatchRelease,
  releasePaymentBatch,
  listPaymentBatches,
  getPaymentBatchById,
  listPaymentBatchItems,
  // Wave 3 — Cash Position Snapshot
  requestCashPositionSnapshot,
  listCashPositionSnapshots,
  getCashPositionSnapshotById,
  listCashPositionSnapshotLines,
  listCashPositionSnapshotLineage,
  // Wave 3.2 — Liquidity Forecast
  createLiquidityScenario,
  activateLiquidityScenario,
  requestLiquidityForecast,
  listLiquidityScenarios,
  listLiquidityForecasts,
  getLiquidityForecastById,
  listLiquidityForecastBuckets,
  listLiquidityForecastBucketLineage,
  upsertLiquiditySourceFeed,
  listLiquiditySourceFeeds,
  // Wave 3.3 — Forecast Variance
  recordForecastVariance,
  listForecastVarianceByForecastId,
  getForecastVarianceById,
} from "@afenda/core";
import type { OrgScopedContext } from "@afenda/core";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireAuth,
  requireOrg,
} from "../../../helpers/responses.js";

const BankAccountRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  accountName: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  currencyCode: z.string(),
  bankIdentifierCode: z.string().nullable(),
  externalBankRef: z.string().nullable(),
  status: z.enum(BankAccountStatusValues),
  isPrimary: z.boolean(),
  activatedAt: z.string().datetime().nullable(),
  deactivatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const BankAccountListSchema = z.object({
  data: z.array(BankAccountRowSchema),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

// Ingest bank statement schema - explicitly defined to ensure coerce.bigint() works
// (avoiding .omit() which may not preserve Zod transformations properly)
const IngestBankStatementApiSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  bankAccountId: BankAccountIdSchema,
  sourceRef: z.string().trim().min(1).max(255),
  statementDate: UtcDateTimeSchema,
  openingBalance: z.coerce.bigint(),
  closingBalance: z.coerce.bigint(),
  currencyCode: CurrencyCodeSchema,
  lines: z.array(
    z.object({
      lineNumber: z.number().int().positive(),
      transactionDate: UtcDateTimeSchema,
      valueDate: UtcDateTimeSchema.optional().nullable(),
      description: z.string().trim().min(1).max(512),
      reference: z.string().trim().max(128).optional().nullable(),
      amount: z.coerce.bigint().positive(),
      direction: z.enum(CashMovementDirectionValues),
    })
  ).min(1).max(5000),
});

const MarkStatementFailedApiSchema = MarkStatementFailedCommandSchema.omit({
  orgId: true,
});

function normalizeDateInputToUtcIso(input: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return `${input}T00:00:00.000Z`;
  }
  return input;
}

function buildCtx(orgId: string): OrgScopedContext {
  return { activeContext: { orgId: orgId as OrgId } };
}

function buildPolicyCtx(req: {
  ctx?: { principalId: PrincipalId; permissionsSet: ReadonlySet<string> };
}) {
  return { principalId: req.ctx?.principalId };
}

function mapErrorStatus(code: string) {
  switch (code) {
    case "TREAS_BANK_ACCOUNT_NOT_FOUND":
      return 404 as const;
    case "TREAS_BANK_ACCOUNT_NUMBER_EXISTS":
      return 409 as const;
    case "TREAS_BANK_ACCOUNT_INACTIVE":
    case "TREAS_BANK_ACCOUNT_SUSPENDED":
      return 422 as const;
    default:
      return 400 as const;
  }
}

function toBankAccountResponse(row: {
  id: string;
  orgId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  currencyCode: string;
  bankIdentifierCode: string | null;
  externalBankRef: string | null;
  status: string;
  isPrimary: boolean;
  activatedAt: Date | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const status = row.status as (typeof BankAccountStatusValues)[number];
  return {
    id: row.id,
    orgId: row.orgId,
    accountName: row.accountName,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    currencyCode: row.currencyCode,
    bankIdentifierCode: row.bankIdentifierCode,
    externalBankRef: row.externalBankRef,
    status,
    isPrimary: row.isPrimary,
    activatedAt: row.activatedAt?.toISOString() ?? null,
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function treasuryRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  server.post(
    "/commands/create-bank-account",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Create a treasury bank account.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateBankAccountCommandSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await createBankAccount(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          accountName: req.body.accountName,
          bankName: req.body.bankName,
          accountNumber: req.body.accountNumber,
          currencyCode: req.body.currencyCode,
          bankIdentifierCode: req.body.bankIdentifierCode,
          externalBankRef: req.body.externalBankRef,
          isPrimary: req.body.isPrimary,
        },
      );

      if (!result.ok) {
        return reply.status(mapErrorStatus(result.error.code)).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  server.post(
    "/commands/update-bank-account",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Update treasury bank account details.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateBankAccountCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await updateBankAccount(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(mapErrorStatus(result.error.code)).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/activate-bank-account",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Activate a treasury bank account.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ActivateBankAccountCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await activateBankAccount(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(mapErrorStatus(result.error.code)).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/deactivate-bank-account",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Deactivate a treasury bank account.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DeactivateBankAccountCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await deactivateBankAccount(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        req.body,
      );

      if (!result.ok) {
        return reply.status(mapErrorStatus(result.error.code)).send({
          error: {
            code: result.error.code,
            message: result.error.message,
            details: result.error.meta,
          },
          correlationId: req.correlationId,
        });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  server.get(
    "/treasury/bank-accounts",
    {
      schema: {
        description: "List treasury bank accounts with cursor pagination.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({ status: z.string().optional() }),
        response: {
          200: BankAccountListSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listBankAccounts(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
      });

      return {
        data: page.data.map(toBankAccountResponse),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/bank-accounts/:id",
    {
      schema: {
        description: "Get one treasury bank account.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(BankAccountRowSchema),
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

      const found = await getBankAccountById(app.db, orgId as OrgId, req.params.id);

      if (!found) {
        return reply.status(404).send({
          error: {
            code: "TREAS_BANK_ACCOUNT_NOT_FOUND",
            message: "Bank account not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: toBankAccountResponse(found),
        correlationId: req.correlationId,
      };
    },
  );

  // ════════════════════════════════════════════════════════════════════════════
  // Bank Statement routes  (Wave 1.2)
  // ════════════════════════════════════════════════════════════════════════════

  const BankStatementRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    bankAccountId: z.string().uuid(),
    sourceRef: z.string(),
    statementDate: z.string().datetime(),
    openingBalance: z.string(), // bigint serialised as string
    closingBalance: z.string(),
    currencyCode: z.string(),
    status: z.enum(BankStatementStatusValues),
    lineCount: z.number().int(),
    failureReason: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const BankStatementLineRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    statementId: z.string().uuid(),
    lineNumber: z.number().int(),
    transactionDate: z.string().datetime(),
    valueDate: z.string().datetime().nullable(),
    description: z.string(),
    reference: z.string().nullable(),
    amount: z.string(), // bigint serialised as string
    direction: z.enum(CashMovementDirectionValues),
    status: z.enum(StatementLineStatusValues),
    createdAt: z.string().datetime(),
  });

  const BankStatementListSchema = z.object({
    data: z.array(BankStatementRowSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
    correlationId: z.string().uuid(),
  });

  const BankStatementLineListSchema = z.object({
    data: z.array(BankStatementLineRowSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
    correlationId: z.string().uuid(),
  });

  function mapStatementErrorStatus(code: string) {
    switch (code) {
      case "TREAS_BANK_ACCOUNT_NOT_FOUND":
      case "TREAS_BANK_STATEMENT_NOT_FOUND":
        return 404 as const;
      case "TREAS_BANK_STATEMENT_ALREADY_INGESTED":
        return 409 as const;
      case "TREAS_BANK_ACCOUNT_INACTIVE":
        return 422 as const;
      default:
        return 400 as const;
    }
  }

  function toStatementResponse(row: {
    id: string; orgId: string; bankAccountId: string; sourceRef: string;
    statementDate: Date; openingBalance: bigint; closingBalance: bigint;
    currencyCode: string; status: string; lineCount: number;
    failureReason: string | null; createdAt: Date; updatedAt: Date;
  }) {
    const status = row.status as (typeof BankStatementStatusValues)[number];
    return {
      id: row.id, orgId: row.orgId, bankAccountId: row.bankAccountId,
      sourceRef: row.sourceRef,
      statementDate: row.statementDate.toISOString(),
      openingBalance: String(row.openingBalance),
      closingBalance: String(row.closingBalance),
      currencyCode: row.currencyCode, status,
      lineCount: row.lineCount, failureReason: row.failureReason,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  function toStatementLineResponse(row: {
    id: string; orgId: string; statementId: string; lineNumber: number;
    transactionDate: Date; valueDate: Date | null; description: string;
    reference: string | null; amount: bigint; direction: string;
    status: string; createdAt: Date;
  }) {
    const direction = row.direction as (typeof CashMovementDirectionValues)[number];
    const status = row.status as (typeof StatementLineStatusValues)[number];
    return {
      id: row.id, orgId: row.orgId, statementId: row.statementId,
      lineNumber: row.lineNumber,
      transactionDate: row.transactionDate.toISOString(),
      valueDate: row.valueDate?.toISOString() ?? null,
      description: row.description, reference: row.reference,
      amount: String(row.amount), direction, status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // POST /commands/ingest-bank-statement
  server.post(
    "/commands/ingest-bank-statement",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        description: "Ingest a bank statement with all lines atomically.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: IngestBankStatementApiSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await ingestBankStatement(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          ...req.body,
          orgId: orgId as OrgId,
          statementDate: normalizeDateInputToUtcIso(req.body.statementDate),
          lines: req.body.lines.map((line) => ({
            ...line,
            transactionDate: normalizeDateInputToUtcIso(line.transactionDate),
            valueDate: line.valueDate ? normalizeDateInputToUtcIso(line.valueDate) : null,
          })),
        } as IngestBankStatementCommand,
      );

      if (!result.ok) {
        return reply.status(mapStatementErrorStatus(result.error.code)).send({
          error: { code: result.error.code, message: result.error.message, details: result.error.meta },
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  // POST /commands/mark-statement-failed
  server.post(
    "/commands/mark-statement-failed",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Mark a bank statement as failed (used by workers).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: MarkStatementFailedApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
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

      const result = await markStatementFailed(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        {
          ...req.body,
          orgId: orgId as OrgId,
        } as MarkStatementFailedCommand,
      );

      if (!result.ok) {
        const status = result.error.code === "TREAS_BANK_STATEMENT_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: { code: result.error.code, message: result.error.message, details: result.error.meta },
          correlationId: req.correlationId,
        });
      }

      return reply.status(200).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  // GET /treasury/bank-statements
  server.get(
    "/treasury/bank-statements",
    {
      schema: {
        description: "List bank statements (cursor-paginated).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          status: z.enum(BankStatementStatusValues).optional(),
          bankAccountId: z.string().uuid().optional(),
        }),
        response: {
          200: BankStatementListSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listBankStatements(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
        status: req.query.status,
        bankAccountId: req.query.bankAccountId,
      });

      return {
        data: page.data.map(toStatementResponse),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/bank-statements/:id
  server.get(
    "/treasury/bank-statements/:id",
    {
      schema: {
        description: "Get one bank statement.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(BankStatementRowSchema),
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

      const found = await getBankStatementById(app.db, orgId as OrgId, req.params.id);

      if (!found) {
        return reply.status(404).send({
          error: { code: "TREAS_BANK_STATEMENT_NOT_FOUND", message: "Bank statement not found" },
          correlationId: req.correlationId,
        });
      }

      return { data: toStatementResponse(found), correlationId: req.correlationId };
    },
  );

  // GET /treasury/bank-statements/:id/lines
  server.get(
    "/treasury/bank-statements/:id/lines",
    {
      schema: {
        description: "List lines for a bank statement (cursor-paginated).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        querystring: CursorParamsSchema,
        response: {
          200: BankStatementLineListSchema,
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

      // Validate statement belongs to org before listing lines
      const stmt = await getBankStatementById(app.db, orgId as OrgId, req.params.id);
      if (!stmt) {
        return reply.status(404).send({
          error: { code: "TREAS_BANK_STATEMENT_NOT_FOUND", message: "Bank statement not found" },
          correlationId: req.correlationId,
        });
      }

      const page = await listBankStatementLines(app.db, orgId as OrgId, req.params.id, {
        cursor: req.query.cursor,
        limit: req.query.limit,
      });

      return {
        data: page.data.map(toStatementLineResponse),
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // ── Health check for Treasury domain ─────────────────────────────────────
  server.get(
    "/treasury",
    {
      schema: {
        description: "Treasury domain health — confirms routes are mounted.",
        tags: ["Treasury"],
        response: {
          200: makeSuccessSchema(z.object({ domain: z.literal("treasury"), status: z.literal("ok") })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (_req, reply) => {
      return reply.send({
        data: { domain: "treasury" as const, status: "ok" as const },
        correlationId: _req.correlationId,
      });
    },
  );

  // ── Wave 2: Reconciliation Sessions ──────────────────────────────────────────

  const ReconciliationSessionRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    bankAccountId: z.string().uuid(),
    bankStatementId: z.string().uuid(),
    status: z.enum(ReconciliationSessionStatusValues),
    toleranceMinor: z.string(),
    closedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const ReconciliationMatchRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    reconciliationSessionId: z.string().uuid(),
    statementLineId: z.string().uuid(),
    targetType: z.enum(ReconciliationTargetTypeValues),
    targetId: z.string().uuid(),
    matchedAmountMinor: z.string(),
    status: z.enum(ReconciliationMatchStatusValues),
    matchedAt: z.string().datetime(),
    unmatchedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  });

  function toReconSessionResponse(row: any) {
    return {
      ...row,
      closedAt: row.closedAt ? (row.closedAt instanceof Date ? row.closedAt.toISOString() : row.closedAt) : null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }

  function toReconMatchResponse(row: any) {
    return {
      ...row,
      matchedAt: row.matchedAt instanceof Date ? row.matchedAt.toISOString() : row.matchedAt,
      unmatchedAt: row.unmatchedAt ? (row.unmatchedAt instanceof Date ? row.unmatchedAt.toISOString() : row.unmatchedAt) : null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    };
  }

  // POST /commands/open-reconciliation-session
  server.post(
    "/commands/open-reconciliation-session",
    {
      schema: {
        description: "Open a new reconciliation session for a bank statement.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: OpenReconciliationSessionCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await openReconciliationSession(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/add-reconciliation-match
  server.post(
    "/commands/add-reconciliation-match",
    {
      schema: {
        description: "Add a match record to an open reconciliation session.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AddReconciliationMatchCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await addReconciliationMatch(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/remove-reconciliation-match
  server.post(
    "/commands/remove-reconciliation-match",
    {
      schema: {
        description: "Remove (unmatch) a match record from a reconciliation session.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RemoveReconciliationMatchCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await removeReconciliationMatch(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/close-reconciliation-session
  server.post(
    "/commands/close-reconciliation-session",
    {
      schema: {
        description: "Close a reconciliation session.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CloseReconciliationSessionCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await closeReconciliationSession(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // GET /treasury/reconciliation-sessions
  server.get(
    "/treasury/reconciliation-sessions",
    {
      schema: {
        description: "List reconciliation sessions (cursor-paginated).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({ status: z.enum(ReconciliationSessionStatusValues).optional() }),
        response: {
          200: makeSuccessSchema(z.object({
            data: z.array(ReconciliationSessionRowSchema),
            cursor: z.string().nullable(),
            hasMore: z.boolean(),
          })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const { cursor, limit, status } = req.query as any;
      const result = await listReconciliationSessions(app.db, orgId as OrgId, { cursor, limit, status });

      return {
        data: { ...result, data: result.data.map(toReconSessionResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/reconciliation-sessions/:id
  server.get(
    "/treasury/reconciliation-sessions/:id",
    {
      schema: {
        description: "Get a reconciliation session by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(ReconciliationSessionRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const found = await getReconciliationSessionById(app.db, orgId as OrgId, req.params.id);
      if (!found) {
        return reply.status(404).send({ error: { code: "TREAS_RECONCILIATION_SESSION_NOT_FOUND", message: "Not found" }, correlationId: req.correlationId });
      }
      return { data: toReconSessionResponse(found), correlationId: req.correlationId };
    },
  );

  // GET /treasury/reconciliation-sessions/:id/matches
  server.get(
    "/treasury/reconciliation-sessions/:id/matches",
    {
      schema: {
        description: "List match records for a reconciliation session.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(ReconciliationMatchRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listReconciliationMatches(app.db, orgId as OrgId, req.params.id);
      return { data: { data: rows.map(toReconMatchResponse) }, correlationId: req.correlationId };
    },
  );

  // ── Wave 2: Payment Instructions ──────────────────────────────────────────────

  const PaymentInstructionRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    sourceBankAccountId: z.string().uuid(),
    beneficiaryName: z.string(),
    beneficiaryAccountNumber: z.string(),
    beneficiaryBankCode: z.string().nullable(),
    amountMinor: z.string(),
    currencyCode: z.string(),
    paymentMethod: z.enum(TreasuryPaymentMethodValues),
    reference: z.string().nullable(),
    requestedExecutionDate: z.string(),
    status: z.enum(PaymentInstructionStatusValues),
    createdByPrincipalId: z.string().uuid().nullable(),
    submittedAt: z.string().datetime().nullable(),
    approvedAt: z.string().datetime().nullable(),
    rejectedAt: z.string().datetime().nullable(),
    rejectionReason: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  function toPaymentInstrResponse(row: any) {
    return {
      ...row,
      submittedAt: row.submittedAt ? (row.submittedAt instanceof Date ? row.submittedAt.toISOString() : row.submittedAt) : null,
      approvedAt: row.approvedAt ? (row.approvedAt instanceof Date ? row.approvedAt.toISOString() : row.approvedAt) : null,
      rejectedAt: row.rejectedAt ? (row.rejectedAt instanceof Date ? row.rejectedAt.toISOString() : row.rejectedAt) : null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }

  // POST /commands/create-payment-instruction
  server.post(
    "/commands/create-payment-instruction",
    {
      schema: {
        description: "Create a new payment instruction.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreatePaymentInstructionCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await createPaymentInstruction(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/submit-payment-instruction
  server.post(
    "/commands/submit-payment-instruction",
    {
      schema: {
        description: "Submit a pending payment instruction for approval.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SubmitPaymentInstructionCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await submitPaymentInstruction(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        { paymentInstructionId: (req.body as any).paymentInstructionId },
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/approve-payment-instruction
  server.post(
    "/commands/approve-payment-instruction",
    {
      schema: {
        description: "Approve a submitted payment instruction (SOD enforced).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ApprovePaymentInstructionCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await approvePaymentInstruction(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        { paymentInstructionId: (req.body as any).paymentInstructionId },
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/reject-payment-instruction
  server.post(
    "/commands/reject-payment-instruction",
    {
      schema: {
        description: "Reject a submitted payment instruction.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RejectPaymentInstructionCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await rejectPaymentInstruction(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // GET /treasury/payment-instructions
  server.get(
    "/treasury/payment-instructions",
    {
      schema: {
        description: "List payment instructions (cursor-paginated).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({ status: z.enum(PaymentInstructionStatusValues).optional() }),
        response: {
          200: makeSuccessSchema(z.object({
            data: z.array(PaymentInstructionRowSchema),
            cursor: z.string().nullable(),
            hasMore: z.boolean(),
          })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const { cursor, limit, status } = req.query as any;
      const result = await listPaymentInstructions(app.db, orgId as OrgId, { cursor, limit, status });

      return {
        data: { ...result, data: result.data.map(toPaymentInstrResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/payment-instructions/:id
  server.get(
    "/treasury/payment-instructions/:id",
    {
      schema: {
        description: "Get a payment instruction by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(PaymentInstructionRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const found = await getPaymentInstructionById(app.db, orgId as OrgId, req.params.id);
      if (!found) {
        return reply.status(404).send({ error: { code: "TREAS_PAYMENT_INSTRUCTION_NOT_FOUND", message: "Not found" }, correlationId: req.correlationId });
      }
      return { data: toPaymentInstrResponse(found), correlationId: req.correlationId };
    },
  );

  // ── Wave 2: Payment Batches ───────────────────────────────────────────────────

  const PaymentBatchRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    sourceBankAccountId: z.string().uuid(),
    description: z.string().nullable(),
    status: z.enum(PaymentBatchStatusValues),
    totalAmountMinor: z.string(),
    itemCount: z.number().int(),
    requestedReleaseAt: z.string().datetime().nullable(),
    approvedAt: z.string().datetime().nullable(),
    releasedAt: z.string().datetime().nullable(),
    failedAt: z.string().datetime().nullable(),
    failureReason: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  function toPaymentBatchResponse(row: any) {
    const toIso = (d: Date | string | null) => !d ? null : (d instanceof Date ? d.toISOString() : d);
    return {
      ...row,
      requestedReleaseAt: toIso(row.requestedReleaseAt),
      approvedAt: toIso(row.approvedAt),
      releasedAt: toIso(row.releasedAt),
      failedAt: toIso(row.failedAt),
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  // POST /commands/create-payment-batch
  server.post(
    "/commands/create-payment-batch",
    {
      schema: {
        description: "Create a payment batch from a set of approved instructions.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreatePaymentBatchCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await createPaymentBatch(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/request-payment-batch-release
  server.post(
    "/commands/request-payment-batch-release",
    {
      schema: {
        description: "Request release of a draft payment batch.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RequestPaymentBatchReleaseCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await requestPaymentBatchRelease(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        { batchId: (req.body as any).batchId },
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/release-payment-batch
  server.post(
    "/commands/release-payment-batch",
    {
      schema: {
        description: "Approve and release a payment batch.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ReleasePaymentBatchCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await releasePaymentBatch(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        { batchId: (req.body as any).batchId },
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }
      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // GET /treasury/payment-batches
  server.get(
    "/treasury/payment-batches",
    {
      schema: {
        description: "List payment batches (cursor-paginated).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({ status: z.enum(PaymentBatchStatusValues).optional() }),
        response: {
          200: makeSuccessSchema(z.object({
            data: z.array(PaymentBatchRowSchema),
            cursor: z.string().nullable(),
            hasMore: z.boolean(),
          })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const { cursor, limit, status } = req.query as any;
      const result = await listPaymentBatches(app.db, orgId as OrgId, { cursor, limit, status });

      return {
        data: { ...result, data: result.data.map(toPaymentBatchResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/payment-batches/:id
  server.get(
    "/treasury/payment-batches/:id",
    {
      schema: {
        description: "Get a payment batch by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(PaymentBatchRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const found = await getPaymentBatchById(app.db, orgId as OrgId, req.params.id);
      if (!found) {
        return reply.status(404).send({ error: { code: "TREAS_PAYMENT_BATCH_NOT_FOUND", message: "Not found" }, correlationId: req.correlationId });
      }
      return { data: toPaymentBatchResponse(found), correlationId: req.correlationId };
    },
  );

  // GET /treasury/payment-batches/:id/items
  server.get(
    "/treasury/payment-batches/:id/items",
    {
      schema: {
        description: "List items in a payment batch.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({
            data: z.array(z.object({
              id: z.string().uuid(),
              orgId: z.string().uuid(),
              batchId: z.string().uuid(),
              paymentInstructionId: z.string().uuid(),
              amountMinor: z.string(),
              createdAt: z.string().datetime(),
            })),
          })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listPaymentBatchItems(app.db, orgId as OrgId, req.params.id);
      return {
        data: {
          data: rows.map((r) => ({
            ...r,
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
          })),
        },
        correlationId: req.correlationId,
      };
    },
  );

  // ── Wave 3: Cash Position Snapshot ─────────────────────────────────────────

  const CashPositionSnapshotRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    snapshotDate: z.string(),
    asOfAt: z.string().datetime(),
    baseCurrencyCode: z.string(),
    status: z.enum(CashPositionSnapshotStatusValues),
    sourceVersion: z.string(),
    totalBookBalanceMinor: z.string(),
    totalAvailableBalanceMinor: z.string(),
    totalPendingInflowMinor: z.string(),
    totalPendingOutflowMinor: z.string(),
    totalProjectedAvailableMinor: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const CashPositionSnapshotLineRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    snapshotId: z.string().uuid(),
    bankAccountId: z.string().uuid().nullable(),
    currencyCode: z.string(),
    bucketType: z.enum(CashPositionBucketTypeValues),
    amountMinor: z.string(),
    sourceType: z.enum(CashPositionSourceTypeValues),
    sourceId: z.string().uuid().nullable(),
    lineDescription: z.string().nullable(),
    createdAt: z.string().datetime(),
  });

  const CashPositionSnapshotLineageRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    snapshotId: z.string().uuid(),
    snapshotLineId: z.string().uuid(),
    liquiditySourceFeedId: z.string().uuid(),
    createdAt: z.string().datetime(),
  });

  function toCashPositionSnapshotResponse(row: any) {
    const toIso = (d: Date | string | null) => !d ? null : (d instanceof Date ? d.toISOString() : d);
    return {
      ...row,
      asOfAt: toIso(row.asOfAt),
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  // POST /commands/request-cash-position-snapshot
  server.post(
    "/commands/request-cash-position-snapshot",
    {
      schema: {
        description: "Request and calculate a cash position snapshot (Wave 3).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RequestCashPositionSnapshotCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await requestCashPositionSnapshot(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // GET /treasury/cash-position-snapshots
  server.get(
    "/treasury/cash-position-snapshots",
    {
      schema: {
        description: "List cash position snapshots (cursor-paginated).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          status: z.enum(CashPositionSnapshotStatusValues).optional(),
        }),
        response: {
          200: makeSuccessSchema(
            z.object({
              data: z.array(CashPositionSnapshotRowSchema),
              cursor: z.string().nullable(),
              hasMore: z.boolean(),
            }),
          ),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const { cursor, limit, status } = req.query as any;
      const result = await listCashPositionSnapshots(app.db, orgId as OrgId, {
        cursor,
        limit,
        status,
      });

      return {
        data: {
          ...result,
          data: result.data.map(toCashPositionSnapshotResponse),
        },
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/cash-position-snapshots/:id
  server.get(
    "/treasury/cash-position-snapshots/:id",
    {
      schema: {
        description: "Get cash position snapshot by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(CashPositionSnapshotRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const found = await getCashPositionSnapshotById(app.db, orgId as OrgId, req.params.id);
      if (!found) {
        return reply.status(404).send({
          error: { code: "TREAS_CASH_POSITION_SNAPSHOT_NOT_FOUND", message: "Not found" },
          correlationId: req.correlationId,
        });
      }

      return { data: toCashPositionSnapshotResponse(found), correlationId: req.correlationId };
    },
  );

  // GET /treasury/cash-position-snapshots/:id/lines
  server.get(
    "/treasury/cash-position-snapshots/:id/lines",
    {
      schema: {
        description: "List lines for a cash position snapshot.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(CashPositionSnapshotLineRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listCashPositionSnapshotLines(app.db, orgId as OrgId, req.params.id);
      return {
        data: {
          data: rows.map((r) => ({
            ...r,
            bucketType: r.bucketType as (typeof CashPositionBucketTypeValues)[number],
            sourceType: r.sourceType as (typeof CashPositionSourceTypeValues)[number],
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
          })),
        },
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/cash-position-snapshots/:id/lineage
  server.get(
    "/treasury/cash-position-snapshots/:id/lineage",
    {
      schema: {
        description: "List persistent source lineage rows for a cash position snapshot.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(CashPositionSnapshotLineageRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listCashPositionSnapshotLineage(app.db, orgId as OrgId, req.params.id);
      return {
        data: {
          data: rows.map((r) => ({
            ...r,
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
          })),
        },
        correlationId: req.correlationId,
      };
    },
  );

  // ── Wave 3.2: Liquidity Forecast ───────────────────────────────────────────

  const LiquiditySourceFeedRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    sourceType: z.enum(LiquiditySourceFeedTypeValues),
    sourceId: z.string().uuid(),
    sourceDocumentNumber: z.string().nullable(),
    bankAccountId: z.string().uuid().nullable(),
    currencyCode: z.string(),
    amountMinor: z.string(),
    dueDate: z.string(),
    direction: z.enum(LiquiditySourceDirectionValues),
    confidenceScore: z.number().nullable(),
    status: z.enum(LiquiditySourceFeedStatusValues),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  function toLiquiditySourceFeedResponse(row: any) {
    const toIso = (d: Date | string | null) => !d ? null : (d instanceof Date ? d.toISOString() : d);
    return {
      ...row,
      sourceType: row.sourceType as (typeof LiquiditySourceFeedTypeValues)[number],
      direction: row.direction as (typeof LiquiditySourceDirectionValues)[number],
      status: row.status as (typeof LiquiditySourceFeedStatusValues)[number],
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  const LiquidityScenarioRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    scenarioType: z.enum(LiquidityScenarioTypeValues),
    status: z.enum(LiquidityScenarioStatusValues),
    horizonDays: z.number().int(),
    assumptionSetVersion: z.string(),
    assumptionsJson: z.record(z.string(), z.unknown()),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const LiquidityForecastRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    liquidityScenarioId: z.string().uuid(),
    cashPositionSnapshotId: z.string().uuid(),
    forecastDate: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    bucketGranularity: z.enum(LiquidityForecastBucketGranularityValues),
    baseCurrencyCode: z.string(),
    status: z.enum(LiquidityForecastStatusValues),
    sourceVersion: z.string(),
    assumptionSetVersion: z.string(),
    openingLiquidityMinor: z.string(),
    closingLiquidityMinor: z.string(),
    totalExpectedInflowsMinor: z.string(),
    totalExpectedOutflowsMinor: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const LiquidityForecastBucketRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    liquidityForecastId: z.string().uuid(),
    bucketIndex: z.number().int().nonnegative(),
    bucketStartDate: z.string(),
    bucketEndDate: z.string(),
    expectedInflowsMinor: z.string(),
    expectedOutflowsMinor: z.string(),
    openingBalanceMinor: z.string(),
    closingBalanceMinor: z.string(),
    varianceMinor: z.string().nullable(),
    createdAt: z.string().datetime(),
  });

  const LiquidityForecastBucketLineageRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    liquidityForecastId: z.string().uuid(),
    bucketId: z.string().uuid(),
    liquiditySourceFeedId: z.string().uuid(),
    createdAt: z.string().datetime(),
  });

  function toLiquidityScenarioResponse(row: any) {
    const toIso = (d: Date | string | null) => !d ? null : (d instanceof Date ? d.toISOString() : d);
    return {
      ...row,
      scenarioType: row.scenarioType as (typeof LiquidityScenarioTypeValues)[number],
      status: row.status as (typeof LiquidityScenarioStatusValues)[number],
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  function toLiquidityForecastResponse(row: any) {
    const toIso = (d: Date | string | null) => !d ? null : (d instanceof Date ? d.toISOString() : d);
    return {
      ...row,
      bucketGranularity:
        row.bucketGranularity as (typeof LiquidityForecastBucketGranularityValues)[number],
      status: row.status as (typeof LiquidityForecastStatusValues)[number],
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  // POST /commands/create-liquidity-scenario
  server.post(
    "/commands/create-liquidity-scenario",
    {
      schema: {
        description: "Create a liquidity scenario.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateLiquidityScenarioCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await createLiquidityScenario(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/activate-liquidity-scenario
  server.post(
    "/commands/activate-liquidity-scenario",
    {
      schema: {
        description: "Activate a liquidity scenario.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ActivateLiquidityScenarioCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await activateLiquidityScenario(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        { liquidityScenarioId: (req.body as any).liquidityScenarioId },
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // GET /treasury/liquidity-scenarios
  server.get(
    "/treasury/liquidity-scenarios",
    {
      schema: {
        description: "List liquidity scenarios.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(LiquidityScenarioRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listLiquidityScenarios(app.db, orgId as OrgId);
      return {
        data: { data: rows.map(toLiquidityScenarioResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  // POST /commands/request-liquidity-forecast
  server.post(
    "/commands/request-liquidity-forecast",
    {
      schema: {
        description: "Request and calculate liquidity forecast from scenario + snapshot.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RequestLiquidityForecastCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await requestLiquidityForecast(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // POST /commands/upsert-liquidity-source-feed
  server.post(
    "/commands/upsert-liquidity-source-feed",
    {
      schema: {
        description: "Upsert treasury liquidity source feed row (AP/AR/manual projection).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpsertLiquiditySourceFeedCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await upsertLiquiditySourceFeed(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // GET /treasury/liquidity-source-feeds
  server.get(
    "/treasury/liquidity-source-feeds",
    {
      schema: {
        description: "List treasury liquidity source feed rows.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          status: z.enum(LiquiditySourceFeedStatusValues).optional(),
          dueDateLte: z.string().date().optional(),
        }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(LiquiditySourceFeedRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listLiquiditySourceFeeds(app.db, orgId as OrgId, req.query as any);
      return {
        data: { data: rows.map(toLiquiditySourceFeedResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/liquidity-forecasts
  server.get(
    "/treasury/liquidity-forecasts",
    {
      schema: {
        description: "List liquidity forecasts (cursor-paginated).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema.extend({
          status: z.enum(LiquidityForecastStatusValues).optional(),
        }),
        response: {
          200: makeSuccessSchema(
            z.object({
              data: z.array(LiquidityForecastRowSchema),
              cursor: z.string().nullable(),
              hasMore: z.boolean(),
            }),
          ),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const { cursor, limit, status } = req.query as any;
      const result = await listLiquidityForecasts(app.db, orgId as OrgId, { cursor, limit, status });

      return {
        data: {
          ...result,
          data: result.data.map(toLiquidityForecastResponse),
        },
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/liquidity-forecasts/:id
  server.get(
    "/treasury/liquidity-forecasts/:id",
    {
      schema: {
        description: "Get liquidity forecast by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(LiquidityForecastRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const found = await getLiquidityForecastById(app.db, orgId as OrgId, req.params.id);
      if (!found) {
        return reply.status(404).send({
          error: { code: "TREASURY_LIQUIDITY_FORECAST_NOT_FOUND", message: "Not found" },
          correlationId: req.correlationId,
        });
      }

      return { data: toLiquidityForecastResponse(found), correlationId: req.correlationId };
    },
  );

  // GET /treasury/liquidity-forecasts/:id/buckets
  server.get(
    "/treasury/liquidity-forecasts/:id/buckets",
    {
      schema: {
        description: "List liquidity forecast buckets for a forecast.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(LiquidityForecastBucketRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listLiquidityForecastBuckets(app.db, orgId as OrgId, req.params.id);
      return {
        data: {
          data: rows.map((r) => ({
            ...r,
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
          })),
        },
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/liquidity-forecasts/:id/lineage
  server.get(
    "/treasury/liquidity-forecasts/:id/lineage",
    {
      schema: {
        description: "List persistent source lineage rows for a liquidity forecast.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(LiquidityForecastBucketLineageRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listLiquidityForecastBucketLineage(app.db, orgId as OrgId, req.params.id);
      return {
        data: {
          data: rows.map((r) => ({
            ...r,
            createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
          })),
        },
        correlationId: req.correlationId,
      };
    },
  );

  // ── Wave 3.3: Forecast Variance ──────────────────────────────────────────

  const ForecastVarianceRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    liquidityForecastId: z.string().uuid(),
    bucketId: z.string().uuid(),
    actualInflowsMinor: z.string(),
    actualOutflowsMinor: z.string(),
    actualClosingBalanceMinor: z.string(),
    inflowVarianceMinor: z.string(),
    outflowVarianceMinor: z.string(),
    closingBalanceVarianceMinor: z.string(),
    measuredAt: z.string().datetime(),
    createdAt: z.string().datetime(),
  });

  function toForecastVarianceResponse(row: any) {
    const toIso = (d: Date | string | null) => !d ? null : (d instanceof Date ? d.toISOString() : d);
    return {
      ...row,
      measuredAt: toIso(row.measuredAt),
      createdAt: toIso(row.createdAt),
    };
  }

  // POST /commands/record-forecast-variance
  server.post(
    "/commands/record-forecast-variance",
    {
      schema: {
        description: "Record actuals and computed variance for one liquidity forecast bucket.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RecordForecastVarianceCommandSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          401: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const ctx: OrgScopedContext = { activeContext: { orgId: orgId as OrgId } };
      const result = await recordForecastVariance(
        app.db,
        ctx,
        { principalId: auth.principalId as PrincipalId },
        req.correlationId as CorrelationId,
        req.body as any,
      );

      if (!result.ok) {
        return reply.status(422).send({ error: result.error, correlationId: req.correlationId });
      }

      return { data: result.data, correlationId: req.correlationId };
    },
  );

  // GET /treasury/liquidity-forecasts/:id/variance
  server.get(
    "/treasury/liquidity-forecasts/:id/variance",
    {
      schema: {
        description: "List variance records for a liquidity forecast.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(ForecastVarianceRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listForecastVarianceByForecastId(app.db, orgId as OrgId, req.params.id);
      return {
        data: { data: rows.map(toForecastVarianceResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  // GET /treasury/forecast-variance/:id
  server.get(
    "/treasury/forecast-variance/:id",
    {
      schema: {
        description: "Get a forecast variance record by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(ForecastVarianceRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const found = await getForecastVarianceById(app.db, orgId as OrgId, req.params.id);
      if (!found) {
        return reply.status(404).send({
          error: { code: "TREASURY_FORECAST_VARIANCE_NOT_FOUND", message: "Not found" },
          correlationId: req.correlationId,
        });
      }

      return { data: toForecastVarianceResponse(found), correlationId: req.correlationId };
    },
  );
}
