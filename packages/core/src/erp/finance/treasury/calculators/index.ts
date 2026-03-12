/**
 * Treasury calculators barrel.
 *
 * Pure domain calculators — no DB access, no side effects, fully testable in isolation.
 *
 * Wave 1+ calculators added per sprint:
 *   Sprint 2.1: reconciliation-match.ts  — matching engine, tolerance checks
 *   Sprint 2.2: payment-routing.ts       — routing rule evaluation
 *   Sprint 3.1: cash-position.ts         — snapshot aggregation
 *   Sprint 3.2: liquidity-forecast.ts    — horizon forecast engine
 *   Sprint 4.1: intercompany-balancing.ts — debit/credit leg balancer
 *   Sprint 4.2: internal-interest.ts     — interest accrual calculator
 *   Sprint 5.1: fx-revaluation.ts        — mark-to-market revaluation
 *   Sprint 5.2: treasury-accounting-posting.ts — GL posting derivation
 *   Sprint 6.1: limit-breach.ts          — policy limit evaluator
 *   Sprint 6.2: connector-health.ts      — adapter health scoring
 */

// Sprint 1+ calculators exported here
export * from "./intercompany-balancing";

// Sprint 2.1: reconciliation matching engine
export * from "./reconciliation.calculator";
export * from "./reconciliation-match";
// Sprint 2.2: payment routing engine
export * from "./payment-routing";
// Sprint 3.1: cash position aggregation
export * from "./cash-position";
// Sprint 3.2: liquidity forecast engine
export * from "./liquidity-forecast";
// Wave 3.1: FX normalization seam
export * from "./fx-normalization";
// Wave 5.1: FX revaluation calculator
export * from "./fx-revaluation";
// Sprint 3.3: forecast variance backtesting
export * from "./forecast-variance";
// Wave 3.5: AP/AR → Treasury liquidity bridge — daily bucket allocation
export * from "./liquidity-bucket-allocation";
// Wave 4.2: netting positions + internal interest accrual
export * from "./internal-interest";
// Wave 6.1: policy threshold evaluation
export * from "./limit-breach";
// Wave 6.2: connector health scoring
export * from "./connector-health";
// Wave 5.2: posting bridge accounting derivation
export * from "./treasury-accounting-posting";
