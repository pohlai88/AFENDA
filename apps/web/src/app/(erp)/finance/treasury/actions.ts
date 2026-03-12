"use server";

/**
 * Treasury server actions.
 *
 * These wrappers keep treasury mutations available from server components and
 * forms while the interactive clients continue using the API client directly.
 */
import {
	activateTreasuryBankAccount,
	approveTreasuryPaymentInstruction,
	closeReconciliationSession,
	createTreasuryBankAccount,
	createTreasuryPaymentBatch,
	createTreasuryPaymentInstruction,
	createTreasuryLiquidityScenario,
	deactivateTreasuryBankAccount,
	fetchTreasuryBankAccounts,
	fetchTreasuryBankStatement,
	fetchTreasuryBankStatementLines,
	fetchTreasuryBankStatements,
	fetchTreasuryLiquidityForecast,
	fetchTreasuryForecastVariance,
	fetchTreasuryForecastVarianceByForecast,
	fetchTreasuryLiquidityForecastBuckets,
	fetchTreasuryLiquidityForecasts,
	fetchTreasuryLiquiditySourceFeeds,
	fetchTreasuryLiquidityScenarios,
	fetchTreasuryPaymentBatches,
	fetchTreasuryPaymentInstructions,
	fetchTreasuryCashPositionSnapshot,
	fetchTreasuryCashPositionSnapshotLines,
	fetchTreasuryCashPositionSnapshots,
	fetchTreasuryReconciliationMatches,
	fetchTreasuryReconciliationSessions,
	ingestTreasuryBankStatement,
	openTreasuryReconciliationSession,
	requestTreasuryCashPositionSnapshot,
	requestTreasuryLiquidityForecast,
	upsertTreasuryLiquiditySourceFeed,
	recordTreasuryForecastVariance,
	rejectTreasuryPaymentInstruction,
	releaseTreasuryPaymentBatch,
	requestTreasuryPaymentBatchRelease,
	submitTreasuryPaymentInstruction,
	updateTreasuryBankAccount,
	activateTreasuryLiquidityScenario,
} from "@/lib/api-client";

export async function listTreasuryBankAccountsAction(
	params?: Parameters<typeof fetchTreasuryBankAccounts>[0],
) {
	return fetchTreasuryBankAccounts(params);
}

export async function createTreasuryBankAccountAction(
	command: Parameters<typeof createTreasuryBankAccount>[0],
) {
	return createTreasuryBankAccount(command);
}

export async function updateTreasuryBankAccountAction(
	command: Parameters<typeof updateTreasuryBankAccount>[0],
) {
	return updateTreasuryBankAccount(command);
}

export async function activateTreasuryBankAccountAction(id: string) {
	return activateTreasuryBankAccount(id);
}

export async function deactivateTreasuryBankAccountAction(id: string) {
	return deactivateTreasuryBankAccount(id);
}

export async function listTreasuryBankStatementsAction(
	params?: Parameters<typeof fetchTreasuryBankStatements>[0],
) {
	return fetchTreasuryBankStatements(params);
}

export async function getTreasuryBankStatementAction(id: string) {
	return fetchTreasuryBankStatement(id);
}

export async function listTreasuryBankStatementLinesAction(
	statementId: string,
	params?: Parameters<typeof fetchTreasuryBankStatementLines>[1],
) {
	return fetchTreasuryBankStatementLines(statementId, params);
}

export async function ingestTreasuryBankStatementAction(
	command: Parameters<typeof ingestTreasuryBankStatement>[0],
) {
	return ingestTreasuryBankStatement(command);
}

// ── Reconciliation Sessions ───────────────────────────────────────────────────

export async function listTreasuryReconciliationSessionsAction(
	params?: Parameters<typeof fetchTreasuryReconciliationSessions>[0],
) {
	return fetchTreasuryReconciliationSessions(params);
}

export async function openTreasuryReconciliationSessionAction(
	command: Parameters<typeof openTreasuryReconciliationSession>[0],
) {
	return openTreasuryReconciliationSession(command);
}

export async function closeTreasuryReconciliationSessionAction(sessionId: string) {
	return closeReconciliationSession(sessionId);
}

export async function listTreasuryReconciliationMatchesAction(sessionId: string) {
	return fetchTreasuryReconciliationMatches(sessionId);
}

// ── Payment Instructions ──────────────────────────────────────────────────────

export async function listTreasuryPaymentInstructionsAction(
	params?: Parameters<typeof fetchTreasuryPaymentInstructions>[0],
) {
	return fetchTreasuryPaymentInstructions(params);
}

export async function createTreasuryPaymentInstructionAction(
	command: Parameters<typeof createTreasuryPaymentInstruction>[0],
) {
	return createTreasuryPaymentInstruction(command);
}

export async function submitTreasuryPaymentInstructionAction(id: string) {
	return submitTreasuryPaymentInstruction(id);
}

export async function approveTreasuryPaymentInstructionAction(id: string) {
	return approveTreasuryPaymentInstruction(id);
}

export async function rejectTreasuryPaymentInstructionAction(id: string, reason: string) {
	return rejectTreasuryPaymentInstruction(id, reason);
}

// ── Payment Batches ───────────────────────────────────────────────────────────

export async function listTreasuryPaymentBatchesAction(
	params?: Parameters<typeof fetchTreasuryPaymentBatches>[0],
) {
	return fetchTreasuryPaymentBatches(params);
}

export async function createTreasuryPaymentBatchAction(
	command: Parameters<typeof createTreasuryPaymentBatch>[0],
) {
	return createTreasuryPaymentBatch(command);
}

export async function requestTreasuryPaymentBatchReleaseAction(batchId: string) {
	return requestTreasuryPaymentBatchRelease(batchId);
}

export async function releaseTreasuryPaymentBatchAction(batchId: string) {
	return releaseTreasuryPaymentBatch(batchId);
}

// ── Wave 3 — Cash Position Snapshot ─────────────────────────────────────────

export async function listTreasuryCashPositionSnapshotsAction(
	params?: Parameters<typeof fetchTreasuryCashPositionSnapshots>[0],
) {
	return fetchTreasuryCashPositionSnapshots(params);
}

export async function getTreasuryCashPositionSnapshotAction(snapshotId: string) {
	return fetchTreasuryCashPositionSnapshot(snapshotId);
}

export async function listTreasuryCashPositionSnapshotLinesAction(snapshotId: string) {
	return fetchTreasuryCashPositionSnapshotLines(snapshotId);
}

export async function requestTreasuryCashPositionSnapshotAction(
	command: Parameters<typeof requestTreasuryCashPositionSnapshot>[0],
) {
	return requestTreasuryCashPositionSnapshot(command);
}

// ── Wave 3.2 — Liquidity Forecast ─────────────────────────────────────────

export async function listTreasuryLiquidityScenariosAction() {
	return fetchTreasuryLiquidityScenarios();
}

export async function createTreasuryLiquidityScenarioAction(
	command: Parameters<typeof createTreasuryLiquidityScenario>[0],
) {
	return createTreasuryLiquidityScenario(command);
}

export async function activateTreasuryLiquidityScenarioAction(liquidityScenarioId: string) {
	return activateTreasuryLiquidityScenario(liquidityScenarioId);
}

export async function listTreasuryLiquidityForecastsAction(
	params?: Parameters<typeof fetchTreasuryLiquidityForecasts>[0],
) {
	return fetchTreasuryLiquidityForecasts(params);
}

export async function getTreasuryLiquidityForecastAction(forecastId: string) {
	return fetchTreasuryLiquidityForecast(forecastId);
}

export async function listTreasuryLiquidityForecastBucketsAction(forecastId: string) {
	return fetchTreasuryLiquidityForecastBuckets(forecastId);
}

export async function requestTreasuryLiquidityForecastAction(
	command: Parameters<typeof requestTreasuryLiquidityForecast>[0],
) {
	return requestTreasuryLiquidityForecast(command);
}

export async function upsertTreasuryLiquiditySourceFeedAction(
	command: Parameters<typeof upsertTreasuryLiquiditySourceFeed>[0],
) {
	return upsertTreasuryLiquiditySourceFeed(command);
}

export async function listTreasuryLiquiditySourceFeedsAction(
	params?: Parameters<typeof fetchTreasuryLiquiditySourceFeeds>[0],
) {
	return fetchTreasuryLiquiditySourceFeeds(params);
}

export async function recordTreasuryForecastVarianceAction(
	command: Parameters<typeof recordTreasuryForecastVariance>[0],
) {
	return recordTreasuryForecastVariance(command);
}

export async function listTreasuryForecastVarianceByForecastAction(liquidityForecastId: string) {
	return fetchTreasuryForecastVarianceByForecast(liquidityForecastId);
}

export async function getTreasuryForecastVarianceAction(id: string) {
	return fetchTreasuryForecastVariance(id);
}
