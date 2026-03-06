# AFENDA Scaffold Workflow Automation

> **Automated IDE agent enforcement** of the schema-is-truth workflow from scaffold to PR.

## Overview

This automation system guides developers through the 18-step process of adding new domain entities to AFENDA, ensuring compliance with all architectural rules and CI gates.

## Components

### 1. Scaffold Workflow Skill
**Location:** `.agents/skills/afenda-scaffold-workflow/SKILL.md`

The skill activates automatically when you:
- Run or mention `pnpm scaffold <domain> <entity>`
- Ask "how do I add a new entity?"
- Say "scaffold a new domain"
- Mention "schema-is-truth workflow"

**What it does:**
- Creates a todo list with all 18 workflow steps
- Guides you through each step sequentially
- Verifies TypeScript errors after each change
- Runs CI gates to ensure compliance
- Blocks proceeding until current step is complete
- Generates PR checklist when finished

### 2. Scaffold Guide Agent
**Location:** `.agents/scaffold-guide.agent.md`

Invoke explicitly with:
```
@scaffold-guide procurement purchase-order
```

Or ask:
```
Guide me through adding a new invoice entity
```

**Benefits:**
- Dedicated agent mode focused on scaffold workflow
- Persistent progress tracking through session
- Explains architecture rules and conventions
- Fixes gate violations automatically

### 3. Copilot Instructions Integration
**Location:** `.github/copilot-instructions.md`

The scaffold workflow is referenced in the main copilot instructions, so the agent knows when to activate the skill automatically.

## The 18-Step Workflow

```
 1. Run scaffold command          → pnpm scaffold <domain> <entity>
 2. Define entity Zod schemas      → packages/contracts/src/<domain>/<entity>.entity.ts
 3. Define command Zod schemas     → packages/contracts/src/<domain>/<entity>.commands.ts
 4. Write Drizzle table           → packages/db/src/schema/<domain>.ts
 5. Generate SQL migration        → pnpm db:generate
 6. Add error codes              → packages/contracts/src/shared/errors.ts
 7. Add audit actions            → packages/contracts/src/shared/audit.ts
 8. Add permissions              → packages/contracts/src/shared/permissions.ts
 9. Add outbox event types       → packages/contracts/src/shared/outbox.ts
10. Add sync pair                → tools/gates/contract-db-sync.mjs
11. Wire contract barrel         → packages/contracts/src/index.ts
12. Wire core barrel             → packages/core/src/index.ts
13. Register API route           → apps/api/src/index.ts
14. Register worker handler      → apps/worker/src/index.ts
15. Update OWNERS.md files       → Document exports and ownership
16. Write integration tests      → packages/core/src/<domain>/__vitest_test__/
17. Run all gates                → pnpm typecheck && pnpm test && pnpm check:all
18. PR ready                     → Generate checklist, commit, push
```

## Usage Examples

### Example 1: Add a new purchase order entity

```
You: I need to add a purchase order entity to the procurement domain

Agent: I'll guide you through the AFENDA scaffold workflow. Let me start 
by running the scaffold command for procurement/purchase-order.

[Agent creates 18-step todo list]
[Agent runs: pnpm scaffold procurement purchase-order]
[Agent marks step 1 complete, moves to step 2]

Agent: Scaffold complete! 8 files created. Now let's define the Zod schemas.
I've opened the entity contract template. Please define:
- PurchaseOrderStatus enum (draft, submitted, approved, etc.)
- PurchaseOrderSchema with all fields
- PurchaseOrderIdSchema for references

[User edits schema]

Agent: Schema looks good! Moving to command schemas...

[Continues through all 18 steps]

Agent: All gates pass! Here's your PR checklist:
✅ Zod schemas defined
✅ Drizzle table created
✅ Migration generated
✅ Error codes registered
...
✅ All 10 CI gates pass

Ready to commit with: feat(procurement): add purchase order entity
```

### Example 2: Resume workflow mid-process

```
You: I've finished the Zod schemas, what's next?

Agent: Checking your progress... I see you've completed steps 1-3.
Next is step 4: Write the Drizzle table.

I'll read your entity schema to get the StatusValues export, then 
guide you through creating the pgTable in packages/db/src/schema/procurement.ts.

[Agent marks step 4 in-progress]
[Agent reads entity schema]
[Agent generates Drizzle table template]

Agent: Here's the table definition. I've:
- Imported PurchaseOrderStatusValues from @afenda/contracts
- Created purchaseOrderStatusEnum
- Defined the table with org_id, status, timestamps
- Added indexes on foreign keys
- Applied rlsOrg() and tsz() helpers

[Shows code]

Would you like me to create this file?
```

### Example 3: Gate failure handling

```
[Agent running step 17: verify gates]

Agent: Running: pnpm check:all

❌ Gate failure: contract-db-sync
Error: Table 'purchase_order' missing sync pair in contract-db-sync.mjs

I'll fix this. The sync pair is missing from step 10. Let me add it now.

[Agent opens tools/gates/contract-db-sync.mjs]
[Agent adds: { table: "purchase_order", schema: "PurchaseOrderSchema" }]

Agent: Fixed. Re-running gates...

✅ All gates pass!

Continuing to step 18: PR ready.
```

## Architecture Rules Enforced

### Import Direction Law
```
contracts  → zod only (no monorepo deps)
db         → drizzle-orm + pg + *Values from contracts
core       → contracts + db (THE ONLY JOIN POINT)
ui         → contracts only (no core, no db)
api        → contracts + core (never db)
web        → contracts + ui (never core, never db)
worker     → contracts + core + db
```

The agent **blocks** any attempt to violate this law.

### Naming Conventions
- Files: `kebab-case.ts`
- DB columns: `snake_case`
- TS/JSON: `camelCase`
- Types: `PascalCase`
- Permissions: `dot.notation`
- Error codes: `UPPER_SNAKE`

### Hard Rules
- ❌ No `new Date()` in files importing db
- ❌ No floats for money (use bigint minor units)
- ❌ No hardcoded colors (use Tailwind tokens)
- ❌ No `console.*` (use Pino logger)
- ❌ Tests must be in `__vitest_test__/`
- ✅ All commands must accept `idempotencyKey`
- ✅ All mutations must write audit log
- ✅ All DB timestamps must be `timestamptz`

## CI Gates (10 gates)

The workflow runs these gates at step 17:

1. **boundaries.mjs** — Enforces import direction law
2. **catalog.mjs** — Verifies pnpm workspace dependencies
3. **contract-db-sync.mjs** — Ensures schema-table parity
4. **migration-lint.mjs** — Validates migration quality
5. **owners-lint.mjs** — Checks OWNERS.md completeness
6. **schema-invariants.mjs** — Enforces DB schema rules
7. **server-clock.mjs** — Detects `new Date()` violations
8. **test-location.mjs** — Ensures tests in `__vitest_test__/`
9. **token-compliance.mjs** — Detects hardcoded secrets
10. **ui-meta.mjs** — Validates UI component metadata

**All gates must pass** before step 17 is marked complete.

## Benefits

### For developers
- **No guessing** — Clear step-by-step guidance
- **No missed steps** — All 18 steps tracked in todo list
- **No gate failures in CI** — Gates verified locally first
- **Faster onboarding** — New developers learn the workflow by doing
- **Consistent code** — Everyone follows the same pattern

### For reviewers
- **PR checklist included** — Easy to verify completeness
- **All gates pre-verified** — No CI surprises
- **Conventional structure** — Code is where expected
- **Complete OWNERS.md** — Clear ownership documented

### For the codebase
- **Architectural integrity** — Import direction enforced
- **Schema-table parity** — Contracts always match DB
- **Complete test coverage** — Tests required for completion
- **Audit/permission compliance** — Shared contracts always updated

## Customization

### Modify workflow steps

Edit `.agents/skills/afenda-scaffold-workflow/SKILL.md` to:
- Add new steps
- Change verification criteria
- Update templates
- Add domain-specific checks

### Add domain-specific gates

Create new gate scripts in `tools/gates/` and add to the verification step.

### Customize scaffold templates

Modify files in `templates/` to change generated code:
- `entity.contract.template.ts`
- `commands.contract.template.ts`
- `service.template.ts`
- `route.template.ts`
- etc.

## Troubleshooting

### Agent doesn't activate skill

**Problem:** You mention scaffolding but agent doesn't use the skill

**Solution:** Explicitly say "use the afenda-scaffold-workflow skill" or invoke `@scaffold-guide`

### Gate fails but agent can't fix it

**Problem:** Gate failure requires manual intervention

**Solution:** Agent will explain the violation and pause. Fix manually, then tell agent to continue from that step.

### TypeScript errors after schema changes

**Problem:** Adding new schemas breaks existing code

**Solution:** Agent checks errors after each step. If errors occur, agent will suggest fixes or ask for guidance.

### Workflow interrupted

**Problem:** Session ends mid-workflow

**Solution:** Agent stores progress in session memory. Resume by saying "continue scaffold workflow for <domain>/<entity>"

## Advanced Usage

### Skip steps (not recommended)

If you've already completed some steps manually:

```
You: I've already written the Zod schemas and Drizzle table for purchase-order.
     Start from registering error codes.

Agent: I'll start from step 6 (error codes). Let me verify steps 1-5 are complete first...
[Agent reads files to verify]
Agent: Confirmed. Marking steps 1-5 complete. Starting step 6 now.
```

### Batch multiple entities

```
You: I need to add 3 entities: purchase-order, receipt, and payment

Agent: I'll guide you through each entity separately using the scaffold workflow.
Starting with purchase-order...

[Completes purchase-order workflow]

Agent: purchase-order complete! Moving to receipt...

[Continues with each entity]
```

### Custom domain setup

For the first entity in a new domain:

```
You: This is a new domain called "treasury"

Agent: New domain detected. I'll create the domain structure first:
- packages/contracts/src/treasury/
- packages/core/src/treasury/
- packages/db/src/schema/treasury.ts

Then proceed with the normal scaffold workflow.
```

## References

- **PROJECT.md §18** — New Code Workflow specification
- **PROJECT.md §4** — Import Direction Law
- **PROJECT.md §11** — CI Gates documentation
- **.github/copilot-instructions.md** — Hard rules
- **tools/scaffold.mjs** — Scaffold tool source code
- **tools/gates/** — Gate implementation scripts

## Feedback & Improvements

This workflow automation is versioned in the repository. To suggest improvements:

1. Create an issue describing the pain point
2. Propose changes to the skill or agent files
3. Test changes locally
4. Submit PR with updated documentation

---

**Version:** 1.0  
**Last updated:** 2026-03-06  
**Maintainer:** AFENDA Core Team
