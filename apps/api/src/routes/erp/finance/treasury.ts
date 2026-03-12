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
  UpsertFxRateSnapshotCommandSchema,
  // Wave 3.3 — Forecast Variance
  RecordForecastVarianceCommandSchema,
  // Wave 3.5 — AP/AR → Treasury Bridge
  UpsertApDuePaymentProjectionCommandSchema,
  ApDuePaymentProjectionStatusValues,
  ApDuePaymentMethodValues,
  UpsertArExpectedReceiptProjectionCommandSchema,
  ArExpectedReceiptProjectionStatusValues,
  ArExpectedReceiptMethodValues,
  // Wave 4.1 — In-house Banking + Intercompany Transfers
  createInternalBankAccountCommandSchema,
  activateInternalBankAccountCommandSchema,
  deactivateInternalBankAccountCommandSchema,
  createIntercompanyTransferCommandSchema,
  submitIntercompanyTransferCommandSchema,
  approveIntercompanyTransferCommandSchema,
  rejectIntercompanyTransferCommandSchema,
  settleIntercompanyTransferCommandSchema,
  internalBankAccountStatusValues,
  internalBankAccountTypeValues,
  intercompanyTransferStatusValues,
  intercompanyTransferPurposeValues,
  // Wave 4.2 — Netting + Internal Interest
  createNettingSessionCommandSchema,
  addNettingSessionItemsCommandSchema,
  closeNettingSessionCommandSchema,
  settleNettingSessionCommandSchema,
  createInternalInterestRateCommandSchema,
  activateInternalInterestRateCommandSchema,
  nettingSessionStatusValues,
  nettingObligationStatusValues,
  nettingSourceTypeValues,
  internalInterestRateStatusValues,
  internalInterestDayCountValues,
  // Wave 5.2 — Treasury Accounting Bridge
  createTreasuryAccountingPolicyCommandSchema,
  activateTreasuryAccountingPolicyCommandSchema,
  requestTreasuryPostingCommandSchema,
  // Wave 6.1 — Treasury Policy + Limits
  createTreasuryPolicyCommandSchema,
  activateTreasuryPolicyCommandSchema,
  createTreasuryLimitCommandSchema,
  activateTreasuryLimitCommandSchema,
  approveTreasuryLimitOverrideCommandSchema,
  // Wave 6.2 — Integrations + Market Data
  createBankConnectorCommandSchema,
  activateBankConnectorCommandSchema,
  requestBankConnectorSyncCommandSchema,
  createMarketDataFeedCommandSchema,
  activateMarketDataFeedCommandSchema,
  requestMarketDataRefreshCommandSchema,
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
  upsertFxRateSnapshot,
  listFxRateSnapshots,
  // Wave 3.3 — Forecast Variance
  recordForecastVariance,
  listForecastVarianceByForecastId,
  getForecastVarianceById,
  // Wave 3.5 — AP/AR → Treasury Bridge
  upsertApDuePaymentProjection,
  listApDuePaymentProjections,
  upsertArExpectedReceiptProjection,
  listArExpectedReceiptProjections,
  InternalBankAccountService,
  InternalBankAccountQueries,
  IntercompanyTransferService,
  IntercompanyTransferQueries,
  NettingSessionService,
  NettingSessionQueries,
  InternalInterestRateService,
  createFxExposure,
  closeFxExposure,
  getFxExposureById,
  listFxExposures,
  createHedgeDesignation,
  updateHedgeDesignationStatus,
  getHedgeDesignationById,
  listHedgeDesignations,
  createRevaluationEvent,
  updateRevaluationEventStatus,
  getRevaluationEventById,
  listRevaluationEvents,
  TreasuryAccountingBridgeService,
  TreasuryAccountingBridgeQueries,
  TreasuryPolicyService,
  TreasuryPolicyQueries,
  BankConnectorService,
  BankConnectorQueries,
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
  lines: z
    .array(
      z.object({
        lineNumber: z.number().int().positive(),
        transactionDate: UtcDateTimeSchema,
        valueDate: UtcDateTimeSchema.optional().nullable(),
        description: z.string().trim().min(1).max(512),
        reference: z.string().trim().max(128).optional().nullable(),
        amount: z.coerce.bigint().positive(),
        direction: z.enum(CashMovementDirectionValues),
      }),
    )
    .min(1)
    .max(5000),
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
  const internalBankAccountService = new InternalBankAccountService({
    db: app.db,
    logger: app.log,
  });
  const internalBankAccountQueries = new InternalBankAccountQueries({ db: app.db });
  const intercompanyTransferService = new IntercompanyTransferService({
    db: app.db,
    logger: app.log,
  });
  const intercompanyTransferQueries = new IntercompanyTransferQueries({ db: app.db });
  const nettingSessionService = new NettingSessionService({
    db: app.db,
    logger: app.log,
  });
  const nettingSessionQueries = new NettingSessionQueries({ db: app.db });
  const internalInterestRateService = new InternalInterestRateService({
    db: app.db,
    logger: app.log,
  });
  const treasuryAccountingBridgeService = new TreasuryAccountingBridgeService({
    db: app.db,
    logger: app.log,
  });
  const treasuryAccountingBridgeQueries = new TreasuryAccountingBridgeQueries({ db: app.db });
  const treasuryPolicyService = new TreasuryPolicyService({
    db: app.db,
    logger: app.log,
  });
  const treasuryPolicyQueries = new TreasuryPolicyQueries({ db: app.db });
  const bankConnectorService = new BankConnectorService({
    db: app.db,
    logger: app.log,
  });
  const bankConnectorQueries = new BankConnectorQueries({ db: app.db });

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
    id: string;
    orgId: string;
    bankAccountId: string;
    sourceRef: string;
    statementDate: Date;
    openingBalance: bigint;
    closingBalance: bigint;
    currencyCode: string;
    status: string;
    lineCount: number;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const status = row.status as (typeof BankStatementStatusValues)[number];
    return {
      id: row.id,
      orgId: row.orgId,
      bankAccountId: row.bankAccountId,
      sourceRef: row.sourceRef,
      statementDate: row.statementDate.toISOString(),
      openingBalance: String(row.openingBalance),
      closingBalance: String(row.closingBalance),
      currencyCode: row.currencyCode,
      status,
      lineCount: row.lineCount,
      failureReason: row.failureReason,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  function toStatementLineResponse(row: {
    id: string;
    orgId: string;
    statementId: string;
    lineNumber: number;
    transactionDate: Date;
    valueDate: Date | null;
    description: string;
    reference: string | null;
    amount: bigint;
    direction: string;
    status: string;
    createdAt: Date;
  }) {
    const direction = row.direction as (typeof CashMovementDirectionValues)[number];
    const status = row.status as (typeof StatementLineStatusValues)[number];
    return {
      id: row.id,
      orgId: row.orgId,
      statementId: row.statementId,
      lineNumber: row.lineNumber,
      transactionDate: row.transactionDate.toISOString(),
      valueDate: row.valueDate?.toISOString() ?? null,
      description: row.description,
      reference: row.reference,
      amount: String(row.amount),
      direction,
      status,
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
          200: makeSuccessSchema(
            z.object({ domain: z.literal("treasury"), status: z.literal("ok") }),
          ),
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
      closedAt: row.closedAt
        ? row.closedAt instanceof Date
          ? row.closedAt.toISOString()
          : row.closedAt
        : null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }

  function toReconMatchResponse(row: any) {
    return {
      ...row,
      matchedAt: row.matchedAt instanceof Date ? row.matchedAt.toISOString() : row.matchedAt,
      unmatchedAt: row.unmatchedAt
        ? row.unmatchedAt instanceof Date
          ? row.unmatchedAt.toISOString()
          : row.unmatchedAt
        : null,
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
        querystring: CursorParamsSchema.extend({
          status: z.enum(ReconciliationSessionStatusValues).optional(),
        }),
        response: {
          200: makeSuccessSchema(
            z.object({
              data: z.array(ReconciliationSessionRowSchema),
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
      const result = await listReconciliationSessions(app.db, orgId as OrgId, {
        cursor,
        limit,
        status,
      });

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
        return reply.status(404).send({
          error: { code: "TREAS_RECONCILIATION_SESSION_NOT_FOUND", message: "Not found" },
          correlationId: req.correlationId,
        });
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
      submittedAt: row.submittedAt
        ? row.submittedAt instanceof Date
          ? row.submittedAt.toISOString()
          : row.submittedAt
        : null,
      approvedAt: row.approvedAt
        ? row.approvedAt instanceof Date
          ? row.approvedAt.toISOString()
          : row.approvedAt
        : null,
      rejectedAt: row.rejectedAt
        ? row.rejectedAt instanceof Date
          ? row.rejectedAt.toISOString()
          : row.rejectedAt
        : null,
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
        querystring: CursorParamsSchema.extend({
          status: z.enum(PaymentInstructionStatusValues).optional(),
        }),
        response: {
          200: makeSuccessSchema(
            z.object({
              data: z.array(PaymentInstructionRowSchema),
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
      const result = await listPaymentInstructions(app.db, orgId as OrgId, {
        cursor,
        limit,
        status,
      });

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
        return reply.status(404).send({
          error: { code: "TREAS_PAYMENT_INSTRUCTION_NOT_FOUND", message: "Not found" },
          correlationId: req.correlationId,
        });
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
    const toIso = (d: Date | string | null) =>
      !d ? null : d instanceof Date ? d.toISOString() : d;
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
        querystring: CursorParamsSchema.extend({
          status: z.enum(PaymentBatchStatusValues).optional(),
        }),
        response: {
          200: makeSuccessSchema(
            z.object({
              data: z.array(PaymentBatchRowSchema),
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
        return reply.status(404).send({
          error: { code: "TREAS_PAYMENT_BATCH_NOT_FOUND", message: "Not found" },
          correlationId: req.correlationId,
        });
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
          200: makeSuccessSchema(
            z.object({
              data: z.array(
                z.object({
                  id: z.string().uuid(),
                  orgId: z.string().uuid(),
                  batchId: z.string().uuid(),
                  paymentInstructionId: z.string().uuid(),
                  amountMinor: z.string(),
                  createdAt: z.string().datetime(),
                }),
              ),
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
    nativeCurrencyCode: z.string(),
    bucketType: z.enum(CashPositionBucketTypeValues),
    amountMinor: z.string(),
    nativeAmountMinor: z.string(),
    normalizedAmountMinor: z.string(),
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
    const toIso = (d: Date | string | null) =>
      !d ? null : d instanceof Date ? d.toISOString() : d;
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
    const toIso = (d: Date | string | null) =>
      !d ? null : d instanceof Date ? d.toISOString() : d;
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
    nativeExpectedInflowsMinor: z.string(),
    nativeExpectedOutflowsMinor: z.string(),
    normalizedExpectedInflowsMinor: z.string(),
    normalizedExpectedOutflowsMinor: z.string(),
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

  const FxRateSnapshotRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    rateDate: z.string().date(),
    fromCurrencyCode: z.string(),
    toCurrencyCode: z.string(),
    rateScaled: z.string(),
    scale: z.number().int().positive(),
    providerCode: z.string(),
    sourceVersion: z.string(),
    createdAt: z.string().datetime(),
  });

  function toLiquidityScenarioResponse(row: any) {
    const toIso = (d: Date | string | null) =>
      !d ? null : d instanceof Date ? d.toISOString() : d;
    return {
      ...row,
      scenarioType: row.scenarioType as (typeof LiquidityScenarioTypeValues)[number],
      status: row.status as (typeof LiquidityScenarioStatusValues)[number],
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  function toLiquidityForecastResponse(row: any) {
    const toIso = (d: Date | string | null) =>
      !d ? null : d instanceof Date ? d.toISOString() : d;
    return {
      ...row,
      bucketGranularity:
        row.bucketGranularity as (typeof LiquidityForecastBucketGranularityValues)[number],
      status: row.status as (typeof LiquidityForecastStatusValues)[number],
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  function toFxRateSnapshotResponse(row: any) {
    const toIso = (d: Date | string | null) =>
      !d ? null : d instanceof Date ? d.toISOString() : d;
    return {
      ...row,
      createdAt: toIso(row.createdAt),
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

  // POST /commands/upsert-fx-rate-snapshot
  server.post(
    "/commands/upsert-fx-rate-snapshot",
    {
      schema: {
        description: "Upsert FX rate snapshot used for treasury base-currency normalization.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpsertFxRateSnapshotCommandSchema,
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
      const result = await upsertFxRateSnapshot(
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

  // GET /treasury/fx-rate-snapshots
  server.get(
    "/treasury/fx-rate-snapshots",
    {
      schema: {
        description: "List FX rate snapshots for treasury normalization.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          rateDate: z.string().date().optional(),
          fromCurrencyCode: z.string().length(3).optional(),
          toCurrencyCode: z.string().length(3).optional(),
          sourceVersion: z.string().optional(),
        }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(FxRateSnapshotRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listFxRateSnapshots(app.db, orgId as OrgId, req.query as any);
      return {
        data: { data: rows.map(toFxRateSnapshotResponse) },
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
      const result = await listLiquidityForecasts(app.db, orgId as OrgId, {
        cursor,
        limit,
        status,
      });

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
          200: makeSuccessSchema(
            z.object({ data: z.array(LiquidityForecastBucketLineageRowSchema) }),
          ),
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
    const toIso = (d: Date | string | null) =>
      !d ? null : d instanceof Date ? d.toISOString() : d;
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

  // ─── Wave 3.5: AP/AR → Treasury Bridge ───────────────────────────────────

  const ApDuePaymentProjectionRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    sourcePayableId: z.string().uuid(),
    supplierId: z.string().uuid(),
    supplierName: z.string(),
    paymentTermCode: z.string().nullable(),
    dueDate: z.string(),
    expectedPaymentDate: z.string(),
    currencyCode: z.string(),
    grossAmountMinor: z.string(),
    openAmountMinor: z.string(),
    paymentMethod: z.enum(ApDuePaymentMethodValues).nullable(),
    status: z.enum(ApDuePaymentProjectionStatusValues),
    sourceVersion: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const ArExpectedReceiptProjectionRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    sourceReceivableId: z.string().uuid(),
    customerId: z.string().uuid(),
    customerName: z.string(),
    dueDate: z.string(),
    expectedReceiptDate: z.string(),
    currencyCode: z.string(),
    grossAmountMinor: z.string(),
    openAmountMinor: z.string(),
    receiptMethod: z.enum(ArExpectedReceiptMethodValues).nullable(),
    status: z.enum(ArExpectedReceiptProjectionStatusValues),
    sourceVersion: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  // POST /commands/upsert-ap-due-payment-projection
  server.post(
    "/commands/upsert-ap-due-payment-projection",
    {
      schema: {
        description: "Upsert an AP due payment projection (AP → Treasury bridge).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpsertApDuePaymentProjectionCommandSchema,
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

      const ctx = req.ctx as OrgScopedContext;
      const result = await upsertApDuePaymentProjection(
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

  // GET /treasury/ap-due-payment-projections
  function toApDuePaymentProjectionResponse(row: any) {
    return {
      ...row,
      paymentMethod: row.paymentMethod as (typeof ApDuePaymentMethodValues)[number] | null,
      status: row.status as (typeof ApDuePaymentProjectionStatusValues)[number],
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }

  server.get(
    "/treasury/ap-due-payment-projections",
    {
      schema: {
        description: "List AP due payment projections.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          status: z.enum(ApDuePaymentProjectionStatusValues).optional(),
          dueDateLte: z.string().date().optional(),
          supplierId: z.string().uuid().optional(),
        }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(ApDuePaymentProjectionRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listApDuePaymentProjections(app.db, orgId as OrgId, req.query as any);
      return {
        data: { data: rows.map(toApDuePaymentProjectionResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  // POST /commands/upsert-ar-expected-receipt-projection
  server.post(
    "/commands/upsert-ar-expected-receipt-projection",
    {
      schema: {
        description: "Upsert an AR expected receipt projection (AR → Treasury bridge).",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpsertArExpectedReceiptProjectionCommandSchema,
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

      const ctx = req.ctx as OrgScopedContext;
      const result = await upsertArExpectedReceiptProjection(
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

  // GET /treasury/ar-expected-receipt-projections
  function toArExpectedReceiptProjectionResponse(row: any) {
    return {
      ...row,
      receiptMethod: row.receiptMethod as (typeof ArExpectedReceiptMethodValues)[number] | null,
      status: row.status as (typeof ArExpectedReceiptProjectionStatusValues)[number],
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }

  server.get(
    "/treasury/ar-expected-receipt-projections",
    {
      schema: {
        description: "List AR expected receipt projections.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          status: z.enum(ArExpectedReceiptProjectionStatusValues).optional(),
          dueDateLte: z.string().date().optional(),
          customerId: z.string().uuid().optional(),
        }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(ArExpectedReceiptProjectionRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await listArExpectedReceiptProjections(app.db, orgId as OrgId, req.query as any);
      return {
        data: { data: rows.map(toArExpectedReceiptProjectionResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  // ─── Wave 4.1: In-house Banking + Intercompany Transfers ───────────────

  const CreateInternalBankAccountApiSchema = createInternalBankAccountCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const ActivateInternalBankAccountApiSchema = activateInternalBankAccountCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const DeactivateInternalBankAccountApiSchema = deactivateInternalBankAccountCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const CreateIntercompanyTransferApiSchema = createIntercompanyTransferCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const SubmitIntercompanyTransferApiSchema = submitIntercompanyTransferCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const ApproveIntercompanyTransferApiSchema = approveIntercompanyTransferCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const RejectIntercompanyTransferApiSchema = rejectIntercompanyTransferCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const SettleIntercompanyTransferApiSchema = settleIntercompanyTransferCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const InternalBankAccountRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    legalEntityId: z.string().uuid(),
    code: z.string(),
    accountName: z.string(),
    accountType: z.enum(internalBankAccountTypeValues),
    currencyCode: z.string(),
    externalBankAccountId: z.string().uuid().nullable(),
    status: z.enum(internalBankAccountStatusValues),
    isPrimaryFundingAccount: z.boolean(),
    activatedAt: z.string().datetime().nullable(),
    deactivatedAt: z.string().datetime().nullable(),
    closedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const IntercompanyTransferRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    transferNumber: z.string(),
    fromLegalEntityId: z.string().uuid(),
    toLegalEntityId: z.string().uuid(),
    fromInternalBankAccountId: z.string().uuid(),
    toInternalBankAccountId: z.string().uuid(),
    purpose: z.enum(intercompanyTransferPurposeValues),
    currencyCode: z.string(),
    transferAmountMinor: z.string(),
    debitLegAmountMinor: z.string(),
    creditLegAmountMinor: z.string(),
    requestedExecutionDate: z.string().date(),
    status: z.enum(intercompanyTransferStatusValues),
    makerUserId: z.string().uuid(),
    checkerUserId: z.string().uuid().nullable(),
    approvedAt: z.string().datetime().nullable(),
    rejectedAt: z.string().datetime().nullable(),
    settledAt: z.string().datetime().nullable(),
    rejectionReason: z.string().nullable(),
    sourceVersion: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  function toInternalBankAccountResponse(row: any) {
    const toIso = (value: Date | string | null) =>
      !value ? null : value instanceof Date ? value.toISOString() : value;
    return {
      ...row,
      accountType: row.accountType as (typeof internalBankAccountTypeValues)[number],
      status: row.status as (typeof internalBankAccountStatusValues)[number],
      activatedAt: toIso(row.activatedAt),
      deactivatedAt: toIso(row.deactivatedAt),
      closedAt: toIso(row.closedAt),
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  function toIntercompanyTransferResponse(row: any) {
    const toIso = (value: Date | string | null) =>
      !value ? null : value instanceof Date ? value.toISOString() : value;
    return {
      ...row,
      purpose: row.purpose as (typeof intercompanyTransferPurposeValues)[number],
      status: row.status as (typeof intercompanyTransferStatusValues)[number],
      approvedAt: toIso(row.approvedAt),
      rejectedAt: toIso(row.rejectedAt),
      settledAt: toIso(row.settledAt),
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  function mapWave41ErrorStatus(code: string) {
    switch (code) {
      case "TREASURY_INTERNAL_BANK_ACCOUNT_NOT_FOUND":
      case "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND":
      case "TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_NOT_FOUND":
        return 404 as const;
      case "TREASURY_INTERNAL_BANK_ACCOUNT_CODE_EXISTS":
      case "TREASURY_INTERCOMPANY_TRANSFER_NUMBER_EXISTS":
        return 409 as const;
      case "TREASURY_INTERCOMPANY_TRANSFER_ACCOUNT_INACTIVE":
      case "TREASURY_INTERCOMPANY_TRANSFER_ENTITY_ACCOUNT_MISMATCH":
      case "TREASURY_INTERCOMPANY_TRANSFER_CURRENCY_MISMATCH":
      case "TREASURY_INTERCOMPANY_TRANSFER_DEBIT_MISMATCH":
      case "TREASURY_INTERCOMPANY_TRANSFER_CREDIT_MISMATCH":
      case "TREASURY_INTERCOMPANY_TRANSFER_UNBALANCED":
      case "TREASURY_INTERCOMPANY_TRANSFER_SAME_ENTITY":
      case "TREASURY_INTERNAL_BANK_ACCOUNT_ILLEGAL_TRANSITION":
      case "TREASURY_INTERCOMPANY_TRANSFER_ILLEGAL_TRANSITION":
      case "TREASURY_INTERCOMPANY_TRANSFER_SOD_VIOLATION":
        return 422 as const;
      default:
        return 400 as const;
    }
  }

  server.post(
    "/commands/create-internal-bank-account",
    {
      schema: {
        description: "Create an internal bank account in draft state.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateInternalBankAccountApiSchema,
        response: {
          201: makeSuccessSchema(InternalBankAccountRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await internalBankAccountService.createInternalBankAccount({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave41ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: toInternalBankAccountResponse(result.data),
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/activate-internal-bank-account",
    {
      schema: {
        description: "Activate an internal bank account.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ActivateInternalBankAccountApiSchema,
        response: {
          200: makeSuccessSchema(InternalBankAccountRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await internalBankAccountService.activateInternalBankAccount({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave41ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: toInternalBankAccountResponse(result.data), correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/deactivate-internal-bank-account",
    {
      schema: {
        description: "Deactivate an internal bank account.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DeactivateInternalBankAccountApiSchema,
        response: {
          200: makeSuccessSchema(InternalBankAccountRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await internalBankAccountService.deactivateInternalBankAccount({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave41ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: toInternalBankAccountResponse(result.data), correlationId: req.correlationId };
    },
  );

  server.get(
    "/treasury/internal-bank-accounts",
    {
      schema: {
        description: "List internal bank accounts.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          legalEntityId: z.string().uuid().optional(),
          status: z.enum(internalBankAccountStatusValues).optional(),
        }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(InternalBankAccountRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows =
        req.query.legalEntityId && req.query.status === "active"
          ? await internalBankAccountQueries.listActiveByLegalEntity(orgId, req.query.legalEntityId)
          : await internalBankAccountQueries.listByOrg(orgId);

      const filtered = req.query.status
        ? rows.filter((row) => row.status === req.query.status)
        : rows;

      return {
        data: { data: filtered.map(toInternalBankAccountResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/internal-bank-accounts/:id",
    {
      schema: {
        description: "Get an internal bank account by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(InternalBankAccountRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const found = await internalBankAccountQueries.getById(orgId, req.params.id);
      if (!found || found.orgId !== orgId) {
        return reply.status(404).send({
          error: {
            code: "TREASURY_INTERNAL_BANK_ACCOUNT_NOT_FOUND",
            message: "Internal bank account not found",
          },
          correlationId: req.correlationId,
        });
      }

      return { data: toInternalBankAccountResponse(found), correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/create-intercompany-transfer",
    {
      schema: {
        description: "Create an intercompany transfer in draft state.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateIntercompanyTransferApiSchema,
        response: {
          201: makeSuccessSchema(IntercompanyTransferRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await intercompanyTransferService.createIntercompanyTransfer({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave41ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: toIntercompanyTransferResponse(result.data),
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/submit-intercompany-transfer",
    {
      schema: {
        description: "Submit an intercompany transfer for approval.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SubmitIntercompanyTransferApiSchema,
        response: {
          200: makeSuccessSchema(IntercompanyTransferRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await intercompanyTransferService.submitIntercompanyTransfer({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave41ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return {
        data: toIntercompanyTransferResponse(result.data),
        correlationId: req.correlationId,
      };
    },
  );

  server.post(
    "/commands/approve-intercompany-transfer",
    {
      schema: {
        description: "Approve an intercompany transfer.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ApproveIntercompanyTransferApiSchema,
        response: {
          200: makeSuccessSchema(IntercompanyTransferRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await intercompanyTransferService.approveIntercompanyTransfer({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave41ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return {
        data: toIntercompanyTransferResponse(result.data),
        correlationId: req.correlationId,
      };
    },
  );

  server.post(
    "/commands/reject-intercompany-transfer",
    {
      schema: {
        description: "Reject an intercompany transfer.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RejectIntercompanyTransferApiSchema,
        response: {
          200: makeSuccessSchema(IntercompanyTransferRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await intercompanyTransferService.rejectIntercompanyTransfer({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave41ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return {
        data: toIntercompanyTransferResponse(result.data),
        correlationId: req.correlationId,
      };
    },
  );

  server.post(
    "/commands/settle-intercompany-transfer",
    {
      schema: {
        description: "Settle an approved intercompany transfer.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SettleIntercompanyTransferApiSchema,
        response: {
          200: makeSuccessSchema(IntercompanyTransferRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await intercompanyTransferService.settleIntercompanyTransfer({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave41ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return {
        data: toIntercompanyTransferResponse(result.data),
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/intercompany-transfers",
    {
      schema: {
        description: "List intercompany transfers.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          status: z.enum(intercompanyTransferStatusValues).optional(),
        }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(IntercompanyTransferRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = req.query.status
        ? await intercompanyTransferQueries.listByStatus(orgId, req.query.status)
        : await intercompanyTransferQueries.listByOrg(orgId);

      return {
        data: { data: rows.map(toIntercompanyTransferResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/intercompany-transfers/:id",
    {
      schema: {
        description: "Get an intercompany transfer by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(IntercompanyTransferRowSchema),
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const found = await intercompanyTransferQueries.getById(orgId, req.params.id);
      if (!found || found.orgId !== orgId) {
        return reply.status(404).send({
          error: {
            code: "TREASURY_INTERCOMPANY_TRANSFER_NOT_FOUND",
            message: "Intercompany transfer not found",
          },
          correlationId: req.correlationId,
        });
      }

      return { data: toIntercompanyTransferResponse(found), correlationId: req.correlationId };
    },
  );

  // ─── Wave 4.2: Netting + Internal Interest ───────────────────────────────

  const CreateNettingSessionApiSchema = createNettingSessionCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const AddNettingSessionItemsApiSchema = addNettingSessionItemsCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const CloseNettingSessionApiSchema = closeNettingSessionCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const SettleNettingSessionApiSchema = settleNettingSessionCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const CreateInternalInterestRateApiSchema = createInternalInterestRateCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const ActivateInternalInterestRateApiSchema = activateInternalInterestRateCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const NettingSessionRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    sessionNumber: z.string(),
    currencyCode: z.string(),
    nettingDate: z.string().date(),
    settlementDate: z.string().date(),
    status: z.enum(nettingSessionStatusValues),
    totalObligationCount: z.number().int().nonnegative(),
    totalGrossPayableMinor: z.string(),
    totalGrossReceivableMinor: z.string(),
    totalNettableMinor: z.string(),
    sourceVersion: z.string(),
    closedAt: z.string().datetime().nullable(),
    settledAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const NettingSessionItemRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    nettingSessionId: z.string().uuid(),
    sourceType: z.enum(nettingSourceTypeValues),
    sourceId: z.string().uuid(),
    fromLegalEntityId: z.string().uuid(),
    toLegalEntityId: z.string().uuid(),
    currencyCode: z.string(),
    amountMinor: z.string(),
    status: z.enum(nettingObligationStatusValues),
    createdAt: z.string().datetime(),
  });

  const InternalInterestRateRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    code: z.string(),
    legalEntityId: z.string().uuid().nullable(),
    currencyCode: z.string(),
    annualRateBps: z.number().int().nonnegative(),
    dayCountConvention: z.enum(internalInterestDayCountValues),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date().nullable(),
    status: z.enum(internalInterestRateStatusValues),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  function toNettingSessionResponse(row: any) {
    const toIso = (value: Date | string | null) =>
      !value ? null : value instanceof Date ? value.toISOString() : value;
    return {
      ...row,
      status: row.status as (typeof nettingSessionStatusValues)[number],
      closedAt: toIso(row.closedAt),
      settledAt: toIso(row.settledAt),
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  function toNettingSessionItemResponse(row: any) {
    const toIso = (value: Date | string | null) =>
      !value ? null : value instanceof Date ? value.toISOString() : value;
    return {
      ...row,
      sourceType: row.sourceType as (typeof nettingSourceTypeValues)[number],
      status: row.status as (typeof nettingObligationStatusValues)[number],
      createdAt: toIso(row.createdAt),
    };
  }

  function toInternalInterestRateResponse(row: any) {
    const toIso = (value: Date | string | null) =>
      !value ? null : value instanceof Date ? value.toISOString() : value;
    return {
      ...row,
      dayCountConvention: row.dayCountConvention as (typeof internalInterestDayCountValues)[number],
      status: row.status as (typeof internalInterestRateStatusValues)[number],
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  function mapWave42ErrorStatus(code: string) {
    switch (code) {
      case "TREASURY_NETTING_SESSION_NOT_FOUND":
      case "TREASURY_INTERNAL_INTEREST_RATE_NOT_FOUND":
        return 404 as const;
      case "TREASURY_NETTING_SESSION_NUMBER_EXISTS":
      case "TREASURY_INTERNAL_INTEREST_RATE_CODE_EXISTS":
        return 409 as const;
      case "TREASURY_NETTING_SESSION_ILLEGAL_TRANSITION":
      case "TREASURY_NETTING_SOURCE_TRANSFER_NOT_SETTLED":
      case "TREASURY_NETTING_SESSION_CURRENCY_MISMATCH":
      case "TREASURY_NETTING_SESSION_UNBALANCED":
        return 422 as const;
      default:
        return 400 as const;
    }
  }

  server.post(
    "/commands/create-netting-session",
    {
      schema: {
        description: "Create a netting session in draft state.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateNettingSessionApiSchema,
        response: {
          201: makeSuccessSchema(NettingSessionRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await nettingSessionService.createNettingSession({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave42ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: toNettingSessionResponse(result.data),
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/add-netting-session-items",
    {
      schema: {
        description: "Add settled intercompany transfers into a netting session.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AddNettingSessionItemsApiSchema,
        response: {
          200: makeSuccessSchema(NettingSessionRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await nettingSessionService.addNettingSessionItems({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave42ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: toNettingSessionResponse(result.data), correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/close-netting-session",
    {
      schema: {
        description: "Close an open netting session after position reconciliation.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CloseNettingSessionApiSchema,
        response: {
          200: makeSuccessSchema(NettingSessionRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await nettingSessionService.closeNettingSession({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave42ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: toNettingSessionResponse(result.data), correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/settle-netting-session",
    {
      schema: {
        description: "Settle a closed netting session.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: SettleNettingSessionApiSchema,
        response: {
          200: makeSuccessSchema(NettingSessionRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await nettingSessionService.settleNettingSession({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave42ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: toNettingSessionResponse(result.data), correlationId: req.correlationId };
    },
  );

  server.get(
    "/treasury/netting-sessions",
    {
      schema: {
        description: "List netting sessions.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(NettingSessionRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await nettingSessionQueries.listNettingSessions(orgId);
      return {
        data: { data: rows.map(toNettingSessionResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/netting-sessions/:id/items",
    {
      schema: {
        description: "List netting session items.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(NettingSessionItemRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await nettingSessionQueries.listNettingSessionItems(orgId, req.params.id);
      return {
        data: { data: rows.map(toNettingSessionItemResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  server.post(
    "/commands/create-internal-interest-rate",
    {
      schema: {
        description: "Create an internal interest rate policy in draft state.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateInternalInterestRateApiSchema,
        response: {
          201: makeSuccessSchema(InternalInterestRateRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await internalInterestRateService.createInternalInterestRate({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave42ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: toInternalInterestRateResponse(result.data),
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/activate-internal-interest-rate",
    {
      schema: {
        description: "Activate an internal interest rate policy.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ActivateInternalInterestRateApiSchema,
        response: {
          200: makeSuccessSchema(InternalInterestRateRowSchema),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await internalInterestRateService.activateInternalInterestRate({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(mapWave42ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return {
        data: toInternalInterestRateResponse(result.data),
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/internal-interest-rates",
    {
      schema: {
        description: "List internal interest rates.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(InternalInterestRateRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await nettingSessionQueries.listInternalInterestRates(orgId);
      return {
        data: { data: rows.map(toInternalInterestRateResponse) },

        correlationId: req.correlationId,
      };
    },
  );

  // ─── Wave 5.1: FX Management + Revaluation ───────────────────────────────

  const FxExposureRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    exposureNumber: z.string(),
    exposureDate: z.string().date(),
    valueDate: z.string().date(),
    sourceType: z.string(),
    sourceId: z.string().uuid(),
    baseCurrencyCode: z.string(),
    quoteCurrencyCode: z.string(),
    direction: z.enum(["buy", "sell"]),
    grossAmountMinor: z.string(),
    status: z.enum(["open", "partially_hedged", "fully_hedged", "closed", "cancelled"]),
    sourceVersion: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const HedgeDesignationRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    fxExposureId: z.string().uuid(),
    hedgeNumber: z.string(),
    hedgeInstrumentType: z.enum(["fx_forward", "fx_swap", "natural_hedge", "manual_proxy"]),
    hedgeRelationshipType: z.enum(["cash_flow_hedge", "fair_value_hedge", "economic_hedge"]),
    designatedAmountMinor: z.string(),
    status: z.enum(["draft", "designated", "de-designated", "expired"]),
    startDate: z.string().date(),
    endDate: z.string().date().nullable(),
    designationMemo: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const RevaluationEventRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    fxExposureId: z.string().uuid(),
    hedgeDesignationId: z.string().uuid().nullable(),
    valuationDate: z.string().date(),
    priorRateSnapshotId: z.string().uuid().nullable(),
    currentRateSnapshotId: z.string().uuid(),
    carryingAmountMinor: z.string(),
    revaluedAmountMinor: z.string(),
    revaluationDeltaMinor: z.string(),
    status: z.enum(["pending", "calculated", "posted", "failed"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  // Omit orgId from API schemas (auto-populated from auth context)
  const CreateFxExposureApiSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(128),
    sourceType: z.enum([
      "ap_due_payment_projection",
      "ar_expected_receipt_projection",
      "intercompany_transfer",
      "manual_exposure",
    ]),
    sourceId: z.string().uuid(),
    exposureNumber: z.string().trim().min(1).max(64),
    exposureDate: z.string().date(),
    valueDate: z.string().date(),
    baseCurrencyCode: z.string().trim().length(3),
    quoteCurrencyCode: z.string().trim().length(3),
    direction: z.enum(["buy", "sell"]),
    grossAmountMinor: z.string(),
    sourceVersion: z.string().trim().min(1).max(128),
  });

  const CloseFxExposureApiSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(128),
    fxExposureId: z.string().uuid(),
  });

  const DesignateHedgeApiSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(128),
    hedgeNumber: z.string().trim().min(1).max(64),
    fxExposureId: z.string().uuid(),
    hedgeInstrumentType: z.enum(["fx_forward", "fx_swap", "natural_hedge", "manual_proxy"]),
    hedgeRelationshipType: z.enum(["cash_flow_hedge", "fair_value_hedge", "economic_hedge"]),
    designatedAmountMinor: z.string(),
    startDate: z.string().date(),
    endDate: z.string().date().nullable().optional(),
    designationMemo: z.string().trim().max(1000).nullable().optional(),
  });

  const DeDesignateHedgeApiSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(128),
    hedgeDesignationId: z.string().uuid(),
  });

  const CreateRevaluationEventApiSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(128),
    fxExposureId: z.string().uuid(),
    hedgeDesignationId: z.string().uuid().nullable().optional(),
    valuationDate: z.string().date(),
    priorRateSnapshotId: z.string().uuid().nullable().optional(),
    currentRateSnapshotId: z.string().uuid(),
    carryingAmountMinor: z.string(),
    revaluedAmountMinor: z.string(),
    revaluationDeltaMinor: z.string(),
  });

  const UpdateRevaluationEventApiSchema = z.object({
    idempotencyKey: z.string().trim().min(8).max(128),
    revaluationEventId: z.string().uuid(),
    status: z.enum(["pending", "calculated", "posted", "failed"]),
  });

  function toFxExposureResponse(row: any) {
    return {
      id: row.id,
      orgId: row.orgId,
      exposureNumber: row.exposureNumber,
      exposureDate: row.exposureDate,
      valueDate: row.valueDate,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      baseCurrencyCode: row.baseCurrencyCode,
      quoteCurrencyCode: row.quoteCurrencyCode,
      direction: row.direction,
      grossAmountMinor: row.grossAmountMinor,
      status: row.status,
      sourceVersion: row.sourceVersion,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  function toHedgeDesignationResponse(row: any) {
    return {
      id: row.id,
      orgId: row.orgId,
      fxExposureId: row.fxExposureId,
      hedgeNumber: row.hedgeNumber,
      hedgeInstrumentType: row.hedgeInstrumentType,
      hedgeRelationshipType: row.hedgeRelationshipType,
      designatedAmountMinor: row.designatedAmountMinor,
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
      designationMemo: row.designationMemo,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  function toRevaluationEventResponse(row: any) {
    return {
      id: row.id,
      orgId: row.orgId,
      fxExposureId: row.fxExposureId,
      hedgeDesignationId: row.hedgeDesignationId,
      valuationDate: row.valuationDate,
      priorRateSnapshotId: row.priorRateSnapshotId,
      currentRateSnapshotId: row.currentRateSnapshotId,
      carryingAmountMinor: row.carryingAmountMinor,
      revaluedAmountMinor: row.revaluedAmountMinor,
      revaluationDeltaMinor: row.revaluationDeltaMinor,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  function mapWave51ErrorStatus(code: string) {
    switch (code) {
      case "TREAS_FX_EXPOSURE_INVALID_CURRENCY_PAIR":
      case "TREAS_FX_EXPOSURE_NOT_FOUND":
      case "TREAS_FX_EXPOSURE_CANNOT_CLOSE":
      case "TREAS_HEDGE_DESIGNATION_NOT_FOUND":
      case "TREAS_HEDGE_INVALID_STATUS_TRANSITION":
      case "TREAS_HEDGE_ALREADY_ACTIVE":
      case "TREAS_REVALUATION_EVENT_NOT_FOUND":
      case "TREAS_REVALUATION_INVALID_STATUS_TRANSITION":
      case "TREAS_REVALUATION_INVALID_DELTA":
        return 400 as const;
      default:
        return 400 as const;
    }
  }

  // FX Exposure Routes
  server.post(
    "/commands/create-fx-exposure",
    {
      schema: {
        description: "Create a new FX exposure.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateFxExposureApiSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
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

      const result = await createFxExposure(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        { ...req.body, orgId } as any,
      );

      if (!result.ok) {
        return reply.status(mapWave51ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/close-fx-exposure",
    {
      schema: {
        description: "Close an FX exposure.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CloseFxExposureApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await closeFxExposure(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        { ...req.body, orgId } as any,
      );

      if (!result.ok) {
        return reply.status(mapWave51ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return {
        data: { id: result.data.id },
        correlationId: req.correlationId,
      };
    },
  );

  // Hedge Designation Routes
  server.post(
    "/commands/designate-hedge",
    {
      schema: {
        description: "Create a hedge designation for an FX exposure.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DesignateHedgeApiSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
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

      const result = await createHedgeDesignation(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        { ...req.body, orgId } as any,
      );

      if (!result.ok) {
        return reply.status(mapWave51ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/de-designate-hedge",
    {
      schema: {
        description: "Remove a hedge designation.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: DeDesignateHedgeApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await updateHedgeDesignationStatus(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        { ...req.body, orgId } as any,
      );

      if (!result.ok) {
        return reply.status(mapWave51ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return {
        data: { id: result.data.id },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/fx-exposures",
    {
      schema: {
        description: "List FX exposures.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          status: z.string().optional(),
          sourceType: z.string().optional(),
          baseCurrencyCode: z.string().optional(),
          quoteCurrencyCode: z.string().optional(),
        }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(FxExposureRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listFxExposures(app.db, orgId as OrgId, req.query);
      return {
        data: { data: rows.map(toFxExposureResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/fx-exposures/:id",
    {
      schema: {
        description: "Get FX exposure by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(FxExposureRowSchema),
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

      const row = await getFxExposureById(app.db, orgId as OrgId, req.params.id);
      if (!row) {
        return reply.status(404).send({
          error: {
            code: "TREAS_FX_EXPOSURE_NOT_FOUND",
            message: "FX exposure not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: toFxExposureResponse(row),
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/hedge-designations",
    {
      schema: {
        description: "List hedge designations.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          fxExposureId: z.string().uuid().optional(),
          status: z.string().optional(),
          hedgeInstrumentType: z.string().optional(),
          hedgeRelationshipType: z.string().optional(),
        }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(HedgeDesignationRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listHedgeDesignations(app.db, orgId as OrgId, req.query);
      return {
        data: { data: rows.map(toHedgeDesignationResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/hedge-designations/:id",
    {
      schema: {
        description: "Get hedge designation by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(HedgeDesignationRowSchema),
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

      const row = await getHedgeDesignationById(app.db, orgId as OrgId, req.params.id);
      if (!row) {
        return reply.status(404).send({
          error: {
            code: "TREAS_HEDGE_DESIGNATION_NOT_FOUND",
            message: "Hedge designation not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: toHedgeDesignationResponse(row),
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/revaluation-events",
    {
      schema: {
        description: "List revaluation events.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          fxExposureId: z.string().uuid().optional(),
          status: z.string().optional(),
          valuationDateFrom: z.string().date().optional(),
          valuationDateTo: z.string().date().optional(),
        }),
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(RevaluationEventRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const rows = await listRevaluationEvents(app.db, orgId as OrgId, req.query);
      return {
        data: { data: rows.map(toRevaluationEventResponse) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/revaluation-events/:id",
    {
      schema: {
        description: "Get revaluation event by ID.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: makeSuccessSchema(RevaluationEventRowSchema),
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

      const row = await getRevaluationEventById(app.db, orgId as OrgId, req.params.id);
      if (!row) {
        return reply.status(404).send({
          error: {
            code: "TREAS_REVALUATION_EVENT_NOT_FOUND",
            message: "Revaluation event not found",
          },
          correlationId: req.correlationId,
        });
      }

      return {
        data: toRevaluationEventResponse(row),
        correlationId: req.correlationId,
      };
    },
  );

  // Revaluation Event Routes
  server.post(
    "/commands/create-revaluation-event",
    {
      schema: {
        description: "Create a revaluation event for FX exposure.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateRevaluationEventApiSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
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

      const result = await createRevaluationEvent(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        { ...req.body, orgId } as any,
      );

      if (!result.ok) {
        return reply.status(mapWave51ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/update-revaluation-event-status",
    {
      schema: {
        description: "Update revaluation event status.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateRevaluationEventApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await updateRevaluationEventStatus(
        app.db,
        buildCtx(orgId),
        buildPolicyCtx(req),
        req.correlationId as CorrelationId,
        { ...req.body, orgId } as any,
      );

      if (!result.ok) {
        return reply.status(mapWave51ErrorStatus(result.error.code)).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return {
        data: { id: result.data.id },
        correlationId: req.correlationId,
      };
    },
  );

  // ─── Wave 5.2: Treasury Accounting Bridge ───────────────────────────────

  const CreateTreasuryAccountingPolicyApiSchema = createTreasuryAccountingPolicyCommandSchema.omit({
    orgId: true,
  });

  const ActivateTreasuryAccountingPolicyApiSchema =
    activateTreasuryAccountingPolicyCommandSchema.omit({
      orgId: true,
    });

  const RequestTreasuryPostingApiSchema = requestTreasuryPostingCommandSchema.omit({
    orgId: true,
  });

  const TreasuryAccountingPolicyRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    policyCode: z.string(),
    name: z.string(),
    scopeType: z.string(),
    debitAccountCode: z.string(),
    creditAccountCode: z.string(),
    status: z.string(),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const TreasuryPostingBridgeRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    sourceType: z.string(),
    sourceId: z.string().uuid(),
    treasuryAccountingPolicyId: z.string().uuid(),
    debitAccountCode: z.string(),
    creditAccountCode: z.string(),
    amountMinor: z.string(),
    currencyCode: z.string(),
    status: z.string(),
    correlationId: z.string(),
    postedJournalEntryId: z.string().uuid().nullable(),
    failureReason: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  function toWave52Response(row: any) {
    const toIso = (value: Date | string | null) =>
      !value ? null : value instanceof Date ? value.toISOString() : value;
    const toDateOnly = (value: Date | string | null) => {
      if (!value) return null;
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return value;
    };

    return {
      ...row,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      effectiveFrom: toDateOnly(row.effectiveFrom),
      effectiveTo: toDateOnly(row.effectiveTo),
    };
  }

  server.post(
    "/commands/create-treasury-accounting-policy",
    {
      schema: {
        description: "Create a treasury accounting policy in draft state.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateTreasuryAccountingPolicyApiSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await treasuryAccountingBridgeService.createPolicy({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        const status = result.error.code === "TREASURY_ACCOUNTING_POLICY_CODE_EXISTS" ? 409 : 400;
        return reply.status(status).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/activate-treasury-accounting-policy",
    {
      schema: {
        description: "Activate a treasury accounting policy.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ActivateTreasuryAccountingPolicyApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
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

      const result = await treasuryAccountingBridgeService.activatePolicy({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        const status = result.error.code === "TREASURY_ACCOUNTING_POLICY_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: { id: result.data.id }, correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/request-treasury-posting",
    {
      schema: {
        description: "Request asynchronous treasury posting to GL.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RequestTreasuryPostingApiSchema,
        response: {
          202: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
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

      const result = await treasuryAccountingBridgeService.requestPosting({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        const status = result.error.code === "TREASURY_ACCOUNTING_POLICY_NOT_ACTIVE" ? 422 : 400;
        return reply.status(status).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(202).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  server.get(
    "/treasury/accounting-policies",
    {
      schema: {
        description: "List treasury accounting policies.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(TreasuryAccountingPolicyRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await treasuryAccountingBridgeQueries.listPolicies(orgId);
      return {
        data: { data: rows.map(toWave52Response) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/posting-bridges",
    {
      schema: {
        description: "List treasury posting bridge requests.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(TreasuryPostingBridgeRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await treasuryAccountingBridgeQueries.listPostingRequests(orgId);
      return {
        data: { data: rows.map(toWave52Response) },
        correlationId: req.correlationId,
      };
    },
  );

  // ─── Wave 6.1: Treasury Policy + Limits ──────────────────────────────────

  const CreateTreasuryPolicyApiSchema = createTreasuryPolicyCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const ActivateTreasuryPolicyApiSchema = activateTreasuryPolicyCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const CreateTreasuryLimitApiSchema = createTreasuryLimitCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const ActivateTreasuryLimitApiSchema = activateTreasuryLimitCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const ApproveTreasuryLimitOverrideApiSchema = approveTreasuryLimitOverrideCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const TreasuryPolicyRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    code: z.string(),
    name: z.string(),
    scopeType: z.string(),
    legalEntityId: z.string().uuid().nullable(),
    currencyCode: z.string().nullable(),
    allowOverride: z.boolean(),
    status: z.enum(["draft", "active", "inactive"]),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const TreasuryLimitRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    policyId: z.string().uuid(),
    code: z.string(),
    scopeType: z.string(),
    legalEntityId: z.string().uuid().nullable(),
    currencyCode: z.string().nullable(),
    metric: z.string(),
    thresholdMinor: z.string(),
    hardBlock: z.boolean(),
    status: z.enum(["draft", "active", "inactive"]),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const TreasuryLimitBreachRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    treasuryLimitId: z.string().uuid(),
    sourceType: z.string(),
    sourceId: z.string().uuid(),
    measuredValueMinor: z.string(),
    thresholdMinor: z.string(),
    hardBlock: z.boolean(),
    overrideRequested: z.boolean(),
    overrideApprovedByUserId: z.string().uuid().nullable(),
    overrideReason: z.string().nullable(),
    correlationId: z.string(),
    createdAt: z.string().datetime(),
  });

  function toWave61Response(row: any) {
    const toIso = (value: Date | string | null) =>
      !value ? null : value instanceof Date ? value.toISOString() : value;
    const toDateOnly = (value: Date | string | null) => {
      if (!value) return null;
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return value;
    };

    return {
      ...row,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      effectiveFrom: toDateOnly(row.effectiveFrom),
      effectiveTo: toDateOnly(row.effectiveTo),
    };
  }

  server.post(
    "/commands/create-treasury-policy",
    {
      schema: {
        description: "Create a treasury policy in draft state.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateTreasuryPolicyApiSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await treasuryPolicyService.createPolicy({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(400).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/activate-treasury-policy",
    {
      schema: {
        description: "Activate a treasury policy.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ActivateTreasuryPolicyApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
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

      const result = await treasuryPolicyService.activatePolicy({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(400).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: { id: result.data.id }, correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/create-treasury-limit",
    {
      schema: {
        description: "Create a treasury limit in draft state.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateTreasuryLimitApiSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await treasuryPolicyService.createLimit({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(400).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/activate-treasury-limit",
    {
      schema: {
        description: "Activate a treasury limit.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ActivateTreasuryLimitApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
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

      const result = await treasuryPolicyService.activateLimit({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(400).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: { id: result.data.id }, correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/approve-treasury-limit-override",
    {
      schema: {
        description: "Approve an override on a non-hard-block treasury limit breach.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ApproveTreasuryLimitOverrideApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          404: ApiErrorResponseSchema,
          422: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await treasuryPolicyService.approveOverride({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        return reply.status(400).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: { id: result.data.id }, correlationId: req.correlationId };
    },
  );

  server.get(
    "/treasury/policies",
    {
      schema: {
        description: "List treasury policies.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(TreasuryPolicyRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await treasuryPolicyQueries.listPolicies(orgId);
      return {
        data: { data: rows.map(toWave61Response) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/limits",
    {
      schema: {
        description: "List treasury limits.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(TreasuryLimitRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await treasuryPolicyQueries.listLimits(orgId);
      return {
        data: { data: rows.map(toWave61Response) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/limit-breaches",
    {
      schema: {
        description: "List treasury limit breaches.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(TreasuryLimitBreachRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await treasuryPolicyQueries.listBreaches(orgId);
      return {
        data: { data: rows.map(toWave61Response) },
        correlationId: req.correlationId,
      };
    },
  );

  // ─── Wave 6.2: Integrations + Market Data ────────────────────────────────

  const CreateBankConnectorApiSchema = createBankConnectorCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const ActivateBankConnectorApiSchema = activateBankConnectorCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const RequestBankConnectorSyncApiSchema = requestBankConnectorSyncCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const CreateMarketDataFeedApiSchema = createMarketDataFeedCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const ActivateMarketDataFeedApiSchema = activateMarketDataFeedCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const RequestMarketDataRefreshApiSchema = requestMarketDataRefreshCommandSchema.omit({
    orgId: true,
    actorUserId: true,
    correlationId: true,
  });

  const BankConnectorRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    code: z.string(),
    connectorType: z.string(),
    bankName: z.string(),
    legalEntityId: z.string().uuid().nullable(),
    status: z.string(),
    health: z.string(),
    endpointRef: z.string().nullable(),
    lastSyncRequestedAt: z.string().datetime().nullable(),
    lastSyncSucceededAt: z.string().datetime().nullable(),
    lastSyncFailedAt: z.string().datetime().nullable(),
    lastErrorCode: z.string().nullable(),
    lastErrorMessage: z.string().nullable(),
    consecutiveFailureCount: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const BankConnectorExecutionRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    bankConnectorId: z.string().uuid(),
    executionType: z.string(),
    direction: z.string(),
    correlationId: z.string(),
    status: z.string(),
    retryCount: z.number().int().nonnegative(),
    requestPayloadRef: z.string().nullable(),
    responsePayloadRef: z.string().nullable(),
    errorCode: z.string().nullable(),
    errorMessage: z.string().nullable(),
    startedAt: z.string().datetime().nullable(),
    finishedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  });

  const MarketDataFeedRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    code: z.string(),
    providerCode: z.string(),
    feedType: z.string(),
    baseCurrencyCode: z.string().nullable(),
    quoteCurrencyCode: z.string().nullable(),
    status: z.string(),
    freshnessMinutes: z.number().int().positive(),
    lastRefreshRequestedAt: z.string().datetime().nullable(),
    lastRefreshSucceededAt: z.string().datetime().nullable(),
    lastRefreshFailedAt: z.string().datetime().nullable(),
    lastErrorCode: z.string().nullable(),
    lastErrorMessage: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });

  const MarketDataObservationRowSchema = z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    marketDataFeedId: z.string().uuid(),
    observationDate: z.string().date(),
    valueScaled: z.string(),
    scale: z.number().int().positive(),
    sourceVersion: z.string(),
    createdAt: z.string().datetime(),
  });

  function toWave62Response(row: any) {
    const toIso = (value: Date | string | null) =>
      !value ? null : value instanceof Date ? value.toISOString() : value;
    const toDateOnly = (value: Date | string | null) => {
      if (!value) return null;
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return value;
    };

    return {
      ...row,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      startedAt: toIso(row.startedAt),
      finishedAt: toIso(row.finishedAt),
      lastSyncRequestedAt: toIso(row.lastSyncRequestedAt),
      lastSyncSucceededAt: toIso(row.lastSyncSucceededAt),
      lastSyncFailedAt: toIso(row.lastSyncFailedAt),
      lastRefreshRequestedAt: toIso(row.lastRefreshRequestedAt),
      lastRefreshSucceededAt: toIso(row.lastRefreshSucceededAt),
      lastRefreshFailedAt: toIso(row.lastRefreshFailedAt),
      observationDate: toDateOnly(row.observationDate),
    };
  }

  server.post(
    "/commands/create-bank-connector",
    {
      schema: {
        description: "Create a bank connector in draft state.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateBankConnectorApiSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await bankConnectorService.createBankConnector({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        const status = result.error.code === "TREASURY_BANK_CONNECTOR_CODE_EXISTS" ? 409 : 400;
        return reply.status(status).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/activate-bank-connector",
    {
      schema: {
        description: "Activate a bank connector.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ActivateBankConnectorApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
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

      const result = await bankConnectorService.activateBankConnector({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        const status = result.error.code === "TREASURY_BANK_CONNECTOR_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: { id: result.data.id }, correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/request-bank-connector-sync",
    {
      schema: {
        description: "Request a connector execution and enqueue async processing.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RequestBankConnectorSyncApiSchema,
        response: {
          202: makeSuccessSchema(
            z.object({ id: z.string().uuid(), executionId: z.string().uuid() }),
          ),
          400: ApiErrorResponseSchema,
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

      const result = await bankConnectorService.requestBankConnectorSync({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        const status = result.error.code === "TREASURY_BANK_CONNECTOR_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(202).send({
        data: result.data,
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/create-market-data-feed",
    {
      schema: {
        description: "Create a market data feed in draft state.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: CreateMarketDataFeedApiSchema,
        response: {
          201: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          409: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const result = await bankConnectorService.createMarketDataFeed({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        const status = result.error.code === "TREASURY_MARKET_DATA_FEED_CODE_EXISTS" ? 409 : 400;
        return reply.status(status).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(201).send({
        data: { id: result.data.id },
        correlationId: req.correlationId,
      });
    },
  );

  server.post(
    "/commands/activate-market-data-feed",
    {
      schema: {
        description: "Activate a market data feed.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: ActivateMarketDataFeedApiSchema,
        response: {
          200: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
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

      const result = await bankConnectorService.activateMarketDataFeed({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        const status = result.error.code === "TREASURY_MARKET_DATA_FEED_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return { data: { id: result.data.id }, correlationId: req.correlationId };
    },
  );

  server.post(
    "/commands/request-market-data-refresh",
    {
      schema: {
        description: "Request market data feed refresh and enqueue async processing.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RequestMarketDataRefreshApiSchema,
        response: {
          202: makeSuccessSchema(z.object({ id: z.string().uuid() })),
          400: ApiErrorResponseSchema,
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

      const result = await bankConnectorService.requestMarketDataRefresh({
        ...req.body,
        orgId,
        actorUserId: auth.principalId,
        correlationId: req.correlationId,
      });

      if (!result.ok) {
        const status = result.error.code === "TREASURY_MARKET_DATA_FEED_NOT_FOUND" ? 404 : 400;
        return reply.status(status).send({
          error: result.error,
          correlationId: req.correlationId,
        });
      }

      return reply.status(202).send({ data: result.data, correlationId: req.correlationId });
    },
  );

  server.get(
    "/treasury/bank-connectors",
    {
      schema: {
        description: "List bank connectors.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(BankConnectorRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await bankConnectorQueries.listBankConnectors(orgId);
      return {
        data: { data: rows.map(toWave62Response) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/bank-connector-executions",
    {
      schema: {
        description: "List bank connector executions.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(BankConnectorExecutionRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await bankConnectorQueries.listBankConnectorExecutions(orgId);
      return {
        data: { data: rows.map(toWave62Response) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/market-data-feeds",
    {
      schema: {
        description: "List market data feeds.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(MarketDataFeedRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await bankConnectorQueries.listMarketDataFeeds(orgId);
      return {
        data: { data: rows.map(toWave62Response) },
        correlationId: req.correlationId,
      };
    },
  );

  server.get(
    "/treasury/market-data-observations",
    {
      schema: {
        description: "List market data observations.",
        tags: ["Treasury"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        response: {
          200: makeSuccessSchema(z.object({ data: z.array(MarketDataObservationRowSchema) })),
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      requireAuth(req, reply);

      const rows = await bankConnectorQueries.listMarketDataObservations(orgId);
      return {
        data: { data: rows.map(toWave62Response) },
        correlationId: req.correlationId,
      };
    },
  );
}
