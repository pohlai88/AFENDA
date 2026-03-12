/**
 * Treasury domain barrel — bank accounts, statements, reconciliation, payments.
 *
 * Functions are auto-instrumented via `instrumentService()` — every call
 * produces an OTel span named `treasury.<fn_name>` with org/principal/correlation
 * attributes derived from the argument shapes.
 */

import { instrumentService } from "../../../kernel/infrastructure/tracing";
import * as rawBankAccountService from "./bank-account.service";
import * as rawBankAccountQueries from "./bank-account.queries";
import * as rawBankStatementService from "./bank-statement.service";
import * as rawBankStatementQueries from "./bank-statement.queries";
import * as rawReconciliationSessionService from "./reconciliation-session.service";
import * as rawReconciliationSessionQueries from "./reconciliation-session.queries";
import * as rawPaymentInstructionService from "./treasury-payment-instruction.service";
import * as rawPaymentInstructionQueries from "./treasury-payment-instruction.queries";
import * as rawPaymentBatchService from "./treasury-payment-batch.service";
import * as rawPaymentBatchQueries from "./treasury-payment-batch.queries";
import * as rawCashPositionSnapshotService from "./cash-position-snapshot.service";
import * as rawCashPositionSnapshotQueries from "./cash-position-snapshot.queries";
import * as rawLiquidityForecastService from "./liquidity-forecast.service";
import * as rawLiquidityForecastQueries from "./liquidity-forecast.queries";
import * as rawLiquiditySourceFeedService from "./liquidity-source-feed.service";
import * as rawLiquiditySourceFeedQueries from "./liquidity-source-feed.queries";
import * as rawFxNormalizationService from "./fx-normalization.service";
import * as rawFxRateSnapshotService from "./fx-rate-snapshot.service";
import * as rawFxRateSnapshotQueries from "./fx-rate-snapshot.queries";
import * as rawLineageQueries from "./lineage.queries";
import * as rawForecastVarianceService from "./forecast-variance.service";
import * as rawForecastVarianceQueries from "./forecast-variance.queries";
import * as rawApDuePaymentProjectionService from "./ap-due-payment-projection.service";
import * as rawApDuePaymentProjectionQueries from "./ap-due-payment-projection.queries";
import * as rawArExpectedReceiptProjectionService from "./ar-expected-receipt-projection.service";
import * as rawArExpectedReceiptProjectionQueries from "./ar-expected-receipt-projection.queries";
import * as rawInternalBankAccountService from "./internal-bank-account.service";
import * as rawInternalBankAccountQueries from "./internal-bank-account.queries";
import * as rawIntercompanyTransferService from "./intercompany-transfer.service";
import * as rawIntercompanyTransferQueries from "./intercompany-transfer.queries";

export type {
	BankAccountServiceError,
	BankAccountServiceResult,
	CreateBankAccountParams,
	UpdateBankAccountParams,
	TransitionBankAccountParams,
} from "./bank-account.service";

export type { BankAccountRow, BankAccountListParams } from "./bank-account.queries";

export type { BankStatementServiceError, BankStatementServiceResult } from "./bank-statement.service";

export type {
	BankStatementRow,
	BankStatementLineRow,
	BankStatementListParams,
} from "./bank-statement.queries";

// Wave 2 — Reconciliation
export type {
	ReconciliationSessionServiceError,
	ReconciliationSessionServiceResult,
	OpenReconciliationSessionParams,
	AddReconciliationMatchParams,
	RemoveReconciliationMatchParams,
	CloseReconciliationSessionParams,
} from "./reconciliation-session.service";

export type {
	ReconciliationSessionRow,
	ReconciliationMatchRow,
	ReconciliationSessionListParams,
} from "./reconciliation-session.queries";

// Wave 2 — Payment Instructions
export type {
	PaymentInstructionServiceError,
	PaymentInstructionServiceResult,
	CreatePaymentInstructionParams,
	SubmitPaymentInstructionParams,
	ApprovePaymentInstructionParams,
	RejectPaymentInstructionParams,
} from "./treasury-payment-instruction.service";

export type {
	PaymentInstructionRow,
	PaymentInstructionListParams,
} from "./treasury-payment-instruction.queries";

// Wave 2 — Payment Batches
export type {
	PaymentBatchServiceError,
	PaymentBatchServiceResult,
	CreatePaymentBatchParams,
	RequestPaymentBatchReleaseParams,
	ReleasePaymentBatchParams,
} from "./treasury-payment-batch.service";

export type {
	PaymentBatchRow,
	PaymentBatchItemRow,
	PaymentBatchListParams,
} from "./treasury-payment-batch.queries";

// Wave 3 — Cash Position Snapshot
export type {
	CashPositionSnapshotServiceError,
	CashPositionSnapshotServiceResult,
	RequestCashPositionSnapshotParams,
} from "./cash-position-snapshot.service";

export type {
	CashPositionSnapshotRow,
	CashPositionSnapshotLineRow,
	CashPositionSnapshotListParams,
} from "./cash-position-snapshot.queries";

// Wave 3 — Liquidity Forecast
export type {
	LiquidityForecastServiceError,
	LiquidityForecastServiceResult,
	CreateLiquidityScenarioParams,
	ActivateLiquidityScenarioParams,
	RequestLiquidityForecastParams,
} from "./liquidity-forecast.service";

export type {
	LiquidityScenarioRow,
	LiquidityForecastRow,
	LiquidityForecastBucketRow,
	LiquidityForecastListParams,
} from "./liquidity-forecast.queries";

export type {
	LiquiditySourceFeedServiceError,
	LiquiditySourceFeedServiceResult,
	UpsertLiquiditySourceFeedParams,
} from "./liquidity-source-feed.service";

export type {
	LiquiditySourceFeedRow,
	LiquiditySourceFeedListParams,
} from "./liquidity-source-feed.queries";

export type {
	FxNormalizationServiceError,
	FxNormalizationServiceResult,
	NormalizeToBaseParams,
} from "./fx-normalization.service";

export type {
	FxRateSnapshotServiceError,
	FxRateSnapshotServiceResult,
	UpsertFxRateSnapshotParams,
} from "./fx-rate-snapshot.service";

export type {
	FxRateSnapshotRow,
	FxRateSnapshotListParams,
} from "./fx-rate-snapshot.queries";

export type {
	CashPositionSnapshotLineageRow,
	LiquidityForecastBucketLineageRow,
} from "./lineage.queries";

// Wave 3.3 — Forecast Variance
export type {
	ForecastVarianceServiceError,
	ForecastVarianceServiceResult,
	RecordForecastVarianceParams,
} from "./forecast-variance.service";

export type { ForecastVarianceRow } from "./forecast-variance.queries";

// Wave 3.5 — AP/AR → Treasury Bridge
export type {
	ApDuePaymentProjectionServiceError,
	ApDuePaymentProjectionServiceResult,
	UpsertApDuePaymentProjectionParams,
} from "./ap-due-payment-projection.service";

export type {
	ApDuePaymentProjectionRow,
	ApDuePaymentProjectionListParams,
} from "./ap-due-payment-projection.queries";

export type {
	ArExpectedReceiptProjectionServiceError,
	ArExpectedReceiptProjectionServiceResult,
	UpsertArExpectedReceiptProjectionParams,
} from "./ar-expected-receipt-projection.service";

export type {
	ArExpectedReceiptProjectionRow,
	ArExpectedReceiptProjectionListParams,
} from "./ar-expected-receipt-projection.queries";

// Wave 4.1 — In-house Banking + Intercompany Transfers
export { InternalBankAccountService } from "./internal-bank-account.service";
export { InternalBankAccountQueries } from "./internal-bank-account.queries";
export { IntercompanyTransferService } from "./intercompany-transfer.service";
export { IntercompanyTransferQueries } from "./intercompany-transfer.queries";

// Calculators (pure functions)
export * from "./calculators/index";

const instrumented = instrumentService("treasury", {
	...rawBankAccountService,
	...rawBankAccountQueries,
	...rawBankStatementService,
	...rawBankStatementQueries,
	...rawReconciliationSessionService,
	...rawReconciliationSessionQueries,
	...rawPaymentInstructionService,
	...rawPaymentInstructionQueries,
	...rawPaymentBatchService,
	...rawPaymentBatchQueries,
	...rawCashPositionSnapshotService,
	...rawCashPositionSnapshotQueries,
	...rawLiquidityForecastService,
	...rawLiquidityForecastQueries,
	...rawLiquiditySourceFeedService,
	...rawLiquiditySourceFeedQueries,
	...rawFxNormalizationService,
	...rawFxRateSnapshotService,
	...rawFxRateSnapshotQueries,
	...rawLineageQueries,
	...rawForecastVarianceService,
	...rawForecastVarianceQueries,
	...rawApDuePaymentProjectionService,
	...rawApDuePaymentProjectionQueries,
	...rawArExpectedReceiptProjectionService,
	...rawArExpectedReceiptProjectionQueries,
	...rawInternalBankAccountService,
	...rawInternalBankAccountQueries,
	...rawIntercompanyTransferService,
	...rawIntercompanyTransferQueries,
});

export const {
	createBankAccount,
	updateBankAccount,
	activateBankAccount,
	deactivateBankAccount,
	listBankAccounts,
	getBankAccountById,
	ingestBankStatement,
	markStatementFailed,
	listBankStatements,
	getBankStatementById,
	listBankStatementLines,
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
	getPaymentInstructionsByIds,
	// Wave 2 — Payment Batches
	createPaymentBatch,
	requestPaymentBatchRelease,
	releasePaymentBatch,
	listPaymentBatches,
	getPaymentBatchById,
	listPaymentBatchItems,
	// Wave 3 — Cash Position Snapshot
	requestCashPositionSnapshot,
	supersedeCashPositionSnapshot,
	listCashPositionSnapshots,
	getCashPositionSnapshotById,
	listCashPositionSnapshotLines,
	// Wave 3 — Liquidity Forecast
	createLiquidityScenario,
	activateLiquidityScenario,
	requestLiquidityForecast,
	listLiquidityScenarios,
	listLiquidityForecasts,
	getLiquidityForecastById,
	listLiquidityForecastBuckets,
	upsertLiquiditySourceFeed,
	listLiquiditySourceFeeds,
	normalizeToBase,
	upsertFxRateSnapshot,
	listFxRateSnapshots,
	listCashPositionSnapshotLineage,
	listLiquidityForecastBucketLineage,
	// Wave 3.3 — Forecast Variance
	recordForecastVariance,
	listForecastVarianceByForecastId,
	getForecastVarianceById,
	// Wave 3.5 — AP/AR → Treasury Bridge
	upsertApDuePaymentProjection,
	listApDuePaymentProjections,
	upsertArExpectedReceiptProjection,
	listArExpectedReceiptProjections,
} = instrumented;

