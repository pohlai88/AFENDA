/**
 * GL domain barrel — journal posting service, trial balance, queries.
 *
 * Auto-instrumented: every function call produces an OTel span `gl.<fn_name>`.
 */
import { instrumentService } from "../../../kernel/infrastructure/tracing";
import * as rawService from "./posting.service";
import * as rawQueries from "./gl.queries";

// Types — compile-time only
export type { GLServiceError, GLServiceResult, PostToGLParams } from "./posting.service";
export type { JournalEntryRow, JournalLineRow, AccountRow, TrialBalanceRow, ListParams, JournalEntryWithLines } from "./gl.queries";

// Functions — auto-wrapped with OTel spans
const instrumented = instrumentService("gl", { ...rawService, ...rawQueries });

export const {
  postToGL,
  reverseJournalEntry,
  listJournalEntries,
  getJournalEntryById,
  listAccounts,
  getTrialBalance,
} = instrumented;
