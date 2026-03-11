---
mode: ask
description: Optimize and stabilize AFENDA frontend auth UX with shadcn-first patterns
---

Goal
- Repair and stabilize auth-related frontend flows end to end.
- Keep UX clean and enterprise-grade, inspired by Stripe and Notion clarity.
- Use existing shadcn primitives/components and existing project patterns only.

Inputs
- Current workspace state, especially apps/web auth routes and shared UI packages.
- Existing CI gates and architecture constraints in AGENTS.md and copilot instructions.

Requirements
1. Do not introduce custom design systems, ad-hoc component libraries, or hardcoded visual tokens.
2. Prefer @afenda/ui primitives and existing auth shell/components.
3. Preserve import-direction rules and monorepo boundaries.
4. Keep changes small, explicit, and testable.
5. Fix regressions first, then polish UX.

Execution Checklist
1. Discover auth entry points and flow pages:
- signin, signup, forgot-password, reset-password, verify, invite, signout
2. Identify breakpoints:
- type errors, hydration issues, broken routes, inaccessible form states, inconsistent layout behavior
3. Implement stabilization:
- unify shell structure
- remove raw form controls where project policy requires shadcn components
- ensure pending/loading and error/success messaging are consistent
4. Verify:
- run targeted file error checks
- run relevant tests when available
- summarize residual risks

Output Format
- Summary of fixes (behavioral and UX)
- Files changed and why
- Validation performed and results
- Follow-up recommendations (small, actionable)

Constraints
- No destructive git operations.
- No unrelated refactors.
- Keep API and domain behavior unchanged unless a bug fix requires it.
