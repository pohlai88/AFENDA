# Treasury Final Gaps Validation

Date: 2026-03-13
Validator: GitHub Copilot (GPT-5.3-Codex)
Scope: Validate previously listed treasury gaps against current AFENDA codebase state before sign-off.

## Summary

- Total prior gaps reviewed: 6
- Confirmed still open: 0
- Confirmed closed: 6
- Sign-off recommendation: Ready to sign off, with no remaining items from this gap list.

## Gap Validation Matrix

### Gap 1: Treasury pages bypass api-client auth pattern
Status: Closed

Evidence:
- Governance uses api-client wrappers: apps/web/src/app/(erp)/finance/treasury/governance/page.tsx
- In-house bank uses api-client wrappers: apps/web/src/app/(erp)/finance/treasury/inhouse-bank/page.tsx
- Integrations uses api-client wrappers: apps/web/src/app/(erp)/finance/treasury/integrations/page.tsx
- Netting uses api-client wrappers: apps/web/src/app/(erp)/finance/treasury/netting/page.tsx
- No `API_BASE_URL` or `API_TOKEN` usage found in treasury page files.

### Gap 2: api-client only covered waves 1-3
Status: Closed

Evidence in api-client:
- Wave 4 wrappers present (internal bank, intercompany, netting, internal interest):
  - apps/web/src/lib/api-client.ts
- Wave 6 wrappers present (policies, limits, breaches, connectors, executions, market feeds/observations):
  - apps/web/src/lib/api-client.ts
- Wave 5.2 wrappers present (accounting policies, posting bridges, create/activate/request posting commands):
  - apps/web/src/lib/api-client.ts

### Gap 3: Worker handlers were log-only stubs
Status: Closed

Evidence:
- Bank connector sync handler now performs DB status transitions:
  - apps/worker/src/jobs/erp/finance/treasury/handle-bank-connector-sync-requested.ts
- Market data refresh handler now validates feed, inserts observation, updates feed status:
  - apps/worker/src/jobs/erp/finance/treasury/handle-market-data-refresh-requested.ts
- Treasury posting handler now resolves posting bridge and marks posted/failed:
  - apps/worker/src/jobs/erp/finance/treasury/handle-treasury-posting-requested.ts

### Gap 4: Lifecycle transitions emitted no outbox events
Status: Closed

Evidence:
- Policy and limit lifecycle outbox events emitted in service:
  - TREAS.POLICY_ACTIVATED, TREAS.LIMIT_CREATED, TREAS.LIMIT_ACTIVATED
  - packages/core/src/erp/finance/treasury/treasury-policy.service.ts
- Connector/feed lifecycle outbox events emitted in service:
  - TREAS.BANK_CONNECTOR_ACTIVATED, TREAS.MARKET_DATA_FEED_ACTIVATED
  - packages/core/src/erp/finance/treasury/bank-connector.service.ts

### Gap 5: Accounting bridge page was static stub
Status: Closed

Evidence:
- Accounting page performs live data fetches via api-client:
  - fetchTreasuryAccountingPolicies
  - fetchTreasuryPostingBridges
  - apps/web/src/app/(erp)/finance/treasury/accounting/page.tsx
- Route loading state exists for async page-state compliance:
  - apps/web/src/app/(erp)/finance/treasury/accounting/loading.tsx

### Gap 6: Missing calculator barrel exports
Status: Closed

Evidence:
- Barrel now exports all previously missing calculators:
  - ./fx-revaluation
  - ./payment-routing
  - ./reconciliation-match
  - ./treasury-accounting-posting
  - packages/core/src/erp/finance/treasury/calculators/index.ts

## Cross-check: Accounting bridge API routes

Status: Present

Routes found:
- /commands/create-treasury-accounting-policy
- /commands/activate-treasury-accounting-policy
- /commands/request-treasury-posting
- /treasury/accounting-policies
- /treasury/posting-bridges

File:
- apps/api/src/routes/erp/finance/treasury.ts

## Final Recommendation

All six previously documented gaps are now closed in the codebase. The prior gap list should be treated as historical context, not active blockers.
