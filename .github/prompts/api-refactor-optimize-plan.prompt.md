---
name: api-refactor-optimize-plan
description: Create a phased plan to evaluate, refactor, optimize, stabilize, and clean up AFENDA API with DRY improvements
argument-hint: Target path and constraints (example: apps/api, no behavior changes)
agent: plan
---

Create a practical, execution-ready modernization plan for the AFENDA API layer.

Primary objective

- Evaluate current state, analyze architecture and risks, refactor for clarity and reuse, optimize performance, stabilize behavior, and clean up unnecessary subdirectories/files while enriching missing essentials.

Inputs

- Target path: ${input:apps/api}
- Repository conventions in AGENTS.md and .github/copilot-instructions.md
- Current CI gates, tests, and package boundaries

Mandatory architecture rules

- Respect import direction law: api may import contracts and core only.
- Keep pillar/module structure and module-boundary expectations.
- No direct db imports in api.
- Preserve audit/idempotency/correlation patterns for mutations.

Planning method

1. Evaluate

- Inventory routes, plugins, shared helpers, schemas, and ownership boundaries.
- Identify dead code, duplicate patterns, oversized modules, and inconsistent naming.

2. Analyze

- Map hotspots: repeated validation logic, repeated response/error handling, repeated auth/permission checks, repeated route wiring.
- Assess risk by blast radius, coupling, and test coverage gaps.

3. Refactor (DRY-first)

- Propose targeted extraction opportunities for reusable helpers and route composition.
- Keep refactors incremental and behavior-preserving.
- Prioritize high-value duplication removal before broad stylistic changes.

4. Optimize

- Recommend concrete runtime and developer-experience optimizations.
- Include startup/plugin registration order checks, schema reuse opportunities, and request-path efficiency opportunities.

5. Stabilize

- Define regression-proofing tasks: contract checks, targeted tests, and guardrails.
- Include explicit verification commands and pass/fail criteria.

6. Clean up and enrich

- List candidates for removal/archive in subdirectories (only where safe and justified).
- List missing docs, tests, or registries that should be enriched.

Output requirements

- Provide a phased plan with this exact structure:
  1. Current-State Findings
  2. Risk Matrix
  3. Refactor Backlog (DRY)
  4. Optimization Backlog
  5. Stabilization Plan
  6. Cleanup and Enrichment Plan
  7. Execution Timeline (quick wins, medium, deep)
  8. Validation Checklist
- For each backlog item include: Scope, Why, Change size (S/M/L), Risk (Low/Med/High), Dependencies, Validation.
- Keep recommendations specific to the target path and monorepo rules.
- Avoid speculative rewrites and avoid changing public API behavior unless explicitly requested.

If information is missing

- Start with a minimal discovery checklist and clearly mark assumptions before proposing invasive changes.
