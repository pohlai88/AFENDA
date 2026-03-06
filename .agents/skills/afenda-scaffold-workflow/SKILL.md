# Skill: AFENDA Scaffold Workflow

> **Enforces the schema-is-truth workflow** for adding new domain entities to AFENDA. Guides developers through scaffolding, schema definition, contract registration, wiring, testing, and gate verification with automated progress tracking.

## Invocation triggers

Use this skill when the user:
- Says "scaffold a new entity" or "create new domain entity"
- Runs or asks about `pnpm scaffold <domain> <entity>`
- Wants to add a new feature following the schema-is-truth workflow
- Asks "how do I add a new entity?" or "what's the workflow for new features?"
- Mentions "scaffold workflow", "new code workflow", or "schema-is-truth"

## Workflow state machine

```
┌─────────────────────┐
│ 1. Scaffold         │ ← pnpm scaffold <domain> <entity>
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 2. Define Schemas   │ ← Zod entity + command schemas
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 3. Drizzle Table    │ ← pgTable + migration
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 4. Register Shared  │ ← errors, audit, permissions, outbox
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 5. Sync Pair        │ ← contract-db-sync.mjs
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 6. Wire Barrels     │ ← contracts/index.ts, core/index.ts
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 7. Wire Routes      │ ← api/index.ts, worker/index.ts
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 8. Write Tests      │ ← __vitest_test__/
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 9. Update OWNERS    │ ← OWNERS.md files
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 10. Verify Gates    │ ← pnpm check:all
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 11. PR Ready        │ ← All gates pass
└─────────────────────┘
```

## Implementation rules

### Mandatory use of todo list

You MUST use `manage_todo_list` to track progress through the workflow. Create todos for all 16 steps (matching the scaffold.mjs checklist), mark each in-progress before starting, and mark completed immediately after finishing.

### Step sequence enforcement

DO NOT proceed to the next step until the current step is completed and verified. Each step has entry conditions and exit criteria.

### Verification before proceeding

After each step, verify the changes are correct:
- Read the files to confirm changes
- Check for TypeScript errors with `get_errors`
- Run relevant checks (e.g., `pnpm typecheck` for schema changes)

### File naming patterns

Strictly follow these conventions:
- Contracts: `<domain>/<entity-kebab>.entity.ts`, `<domain>/<entity-kebab>.commands.ts`
- DB schema: `schema/<domain>.ts`
- Core: `<domain>/<entity-kebab>.service.ts`, `<domain>/<entity-kebab>.queries.ts`
- API: `routes/<entity-kebab>.ts`
- Worker: `jobs/handle-<entity-kebab>.ts`
- Tests: `<domain>/__vitest_test__/<entity-kebab>.test.ts`

### Import direction enforcement

Respect the Import Direction Law (PROJECT.md §4):
```
contracts  → zod only (no monorepo deps)
db         → drizzle-orm + pg + *Values from contracts
core       → contracts + db (THE ONLY JOIN POINT)
ui         → contracts only (no core, no db)
api        → contracts + core (never db)
web        → contracts + ui (never core, never db)
worker     → contracts + core + db
```

## Workflow step details

### Step 1: Scaffold files

**Entry condition:** User provides `<domain>` and `<entity>` names

**Actions:**
1. Run `pnpm scaffold <domain> <entity>` in terminal
2. Capture the output checklist
3. Create todo list with all 16 steps from the checklist
4. Mark step 1 as completed

**Exit criteria:** Scaffold completes successfully, files created

**Files created:**
- `packages/contracts/src/<domain>/<entity>.entity.ts`
- `packages/contracts/src/<domain>/<entity>.commands.ts`
- `packages/core/src/<domain>/<entity>.service.ts`
- `packages/core/src/<domain>/<entity>.queries.ts`
- `apps/api/src/routes/<entity>.ts`
- `apps/worker/src/jobs/handle-<entity>.ts`
- Barrel index files

---

### Step 2: Define Zod schemas

**Entry condition:** Step 1 complete (scaffold files exist)

**Actions:**
1. Mark todo #2 in-progress
2. Read the entity contract template
3. Guide user to define:
   - Entity status enum with Zod `.enum()` and exported `Values`
   - Entity schema with all fields (id, orgId, status, timestamps, metadata)
   - EntityId schema for references
4. Verify schema exports both type and runtime values
5. Mark todo #2 completed

**Exit criteria:**
- Entity schema is complete with proper types
- StatusValues exported for DB enum
- No TypeScript errors in the file

**Template example:**
```typescript
// Status enum
export const EntityStatusSchema = z.enum(["draft", "active", "archived"]);
export const EntityStatusValues = EntityStatusSchema.options;
export type EntityStatus = z.infer<typeof EntityStatusSchema>;

// Entity schema
export const EntitySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  status: EntityStatusSchema,
  name: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  metadata: z.record(z.unknown()).optional(),
});
```

---

### Step 3: Define command schemas

**Entry condition:** Step 2 complete (entity schema defined)

**Actions:**
1. Mark todo #3 in-progress
2. Read the commands contract template
3. Guide user to define:
   - CreateEntityCommandSchema (input fields only, no id/timestamps)
   - UpdateEntityCommandSchema (partial fields + id)
   - Any domain-specific commands (e.g., Approve, Reject, Void)
4. Ensure all commands accept `idempotencyKey`
5. Mark todo #3 completed

**Exit criteria:**
- All command schemas defined
- Commands properly typed
- No TypeScript errors

**Template example:**
```typescript
export const CreateEntityCommandSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().uuid(),
});

export const UpdateEntityCommandSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().uuid(),
});
```

---

### Step 4: Write Drizzle table

**Entry condition:** Steps 2-3 complete (schemas defined with StatusValues exported)

**Actions:**
1. Mark todo #4 in-progress
2. Read `packages/db/src/schema/<domain>.ts` (or determine it needs creation)
3. Import `<Entity>StatusValues` from `@afenda/contracts`
4. Create pgEnum for status
5. Define pgTable with:
   - `id` (uuid, primaryKey)
   - `org_id` (uuid, references orgs, notNull)
   - `status` (enum, notNull)
   - All entity fields (snake_case)
   - `created_at` / `updated_at` (timestamptz)
   - `metadata` (jsonb)
6. Add indexes on all FKs and frequently queried columns
7. Add unique constraint on org-scoped natural keys if applicable
8. Use `rlsOrg()` helper and `tsz()` for timestamps
9. Mark todo #4 completed

**Exit criteria:**
- Table defined with proper columns
- Enum uses imported Values from contract
- Indexes created for FKs
- No TypeScript errors

**Template example:**
```typescript
import { EntityStatusValues } from "@afenda/contracts";

export const entityStatusEnum = pgEnum("entity_status", EntityStatusValues);

export const entities = pgTable("entity", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => orgs.id).notNull(),
  status: entityStatusEnum("status").notNull(),
  name: text("name").notNull(),
  createdAt: tsz("created_at").defaultNow().notNull(),
  updatedAt: tsz("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
}, (t) => [
  index("entity_org_idx").on(t.orgId),
  uniqueIndex("entity_org_name_uniq").on(t.orgId, t.name),
]);
```

---

### Step 5: Generate migration

**Entry condition:** Step 4 complete (table defined)

**Actions:**
1. Mark todo #5 in-progress
2. Run `pnpm db:generate` to create SQL migration
3. Read the generated migration file in `packages/db/drizzle/`
4. Verify the migration creates the table and indexes correctly
5. Mark todo #5 completed

**Exit criteria:**
- Migration SQL file created
- Migration contains CREATE TABLE, CREATE INDEX, CREATE TYPE
- No syntax errors

---

### Step 6: Add error codes

**Entry condition:** Step 5 complete (migration generated)

**Actions:**
1. Mark todo #6 in-progress
2. Read `packages/contracts/src/shared/errors.ts`
3. Add domain-specific error codes following pattern:
   - `<DOMAIN>_<ENTITY>_NOT_FOUND`
   - `<DOMAIN>_<ENTITY>_ALREADY_EXISTS`
   - `<DOMAIN>_<ENTITY>_INVALID_STATUS_TRANSITION`
   - Any domain-specific errors
4. Add to the ErrorCodeSchema enum
5. Mark todo #6 completed

**Exit criteria:**
- Error codes added to errors.ts
- Error codes follow UPPER_SNAKE naming
- No TypeScript errors

---

### Step 7: Add audit actions

**Entry condition:** Step 6 complete (error codes added)

**Actions:**
1. Mark todo #7 in-progress
2. Read `packages/contracts/src/shared/audit.ts`
3. Add audit action strings following pattern:
   - `<domain>.<entityCamel>.created`
   - `<domain>.<entityCamel>.updated`
   - `<domain>.<entityCamel>.deleted`
   - Domain-specific actions (e.g., `ap.invoice.approved`)
4. Add to AuditActionSchema enum
5. Mark todo #7 completed

**Exit criteria:**
- Audit actions added to audit.ts
- Actions follow dot.notation pattern
- No TypeScript errors

---

### Step 8: Add permissions

**Entry condition:** Step 7 complete (audit actions added)

**Actions:**
1. Mark todo #8 in-progress
2. Read `packages/contracts/src/shared/permissions.ts`
3. Add permission keys following pattern:
   - `<domain>.<entityCamel>.create`
   - `<domain>.<entityCamel>.read`
   - `<domain>.<entityCamel>.update`
   - `<domain>.<entityCamel>.delete`
   - Domain-specific permissions (e.g., `ap.invoice.approve`)
4. Add to PermissionKeySchema enum
5. Mark todo #8 completed

**Exit criteria:**
- Permissions added to permissions.ts
- Permissions follow dot.notation pattern
- No TypeScript errors

---

### Step 9: Add outbox event types

**Entry condition:** Step 8 complete (permissions added)

**Actions:**
1. Mark todo #9 in-progress
2. Read `packages/contracts/src/shared/outbox.ts`
3. Add event type constants following pattern:
   - `<DOMAIN>.<ENTITY>_CREATED`
   - `<DOMAIN>.<ENTITY>_UPDATED`
   - `<DOMAIN>.<ENTITY>_STATUS_CHANGED`
4. Add to OutboxEventTypeSchema enum
5. Mark todo #9 completed

**Exit criteria:**
- Event types added to outbox.ts
- Event types follow DOMAIN.UPPER_SNAKE pattern
- No TypeScript errors

---

### Step 10: Add sync pair to contract-db-sync gate

**Entry condition:** Step 9 complete (outbox events added)

**Actions:**
1. Mark todo #10 in-progress
2. Read `tools/gates/contract-db-sync.mjs`
3. Add sync pair to the `SYNC_PAIRS` array:
   ```javascript
   { table: "<entity_snake>", schema: "<EntityPascal>Schema" }
   ```
4. Ensure table name matches DB table and schema name matches Zod schema
5. Mark todo #10 completed

**Exit criteria:**
- Sync pair added to contract-db-sync.mjs
- Table and schema names are correct
- Gate passes when run

---

### Step 11: Wire contract barrel exports

**Entry condition:** Step 10 complete (sync pair added)

**Actions:**
1. Mark todo #11 in-progress
2. Read `packages/contracts/src/index.ts`
3. Add `export * from "./<domain>/index.js";` if not already present
4. Verify domain-level barrel exports entity and command schemas
5. Mark todo #11 completed

**Exit criteria:**
- Domain re-exported in contracts/index.ts
- All schemas accessible via `@afenda/contracts`
- No TypeScript errors

---

### Step 12: Wire core barrel exports

**Entry condition:** Step 11 complete (contract barrel wired)

**Actions:**
1. Mark todo #12 in-progress
2. Read `packages/core/src/index.ts`
3. Add `export * from "./<domain>/index.js";` if not already present
4. Verify domain-level barrel exports service and queries
5. Mark todo #12 completed

**Exit criteria:**
- Domain re-exported in core/index.ts
- All services accessible via `@afenda/core`
- No TypeScript errors

---

### Step 13: Register API route

**Entry condition:** Step 12 complete (core barrel wired)

**Actions:**
1. Mark todo #13 in-progress
2. Read `apps/api/src/index.ts`
3. Import the route: `import <entity>Routes from "./routes/<entity>.js";`
4. Register route in plugin order: `await app.register(<entity>Routes);`
5. Ensure registration happens in correct order (after auth, before graceful shutdown)
6. Mark todo #13 completed

**Exit criteria:**
- Route imported and registered in api/index.ts
- Route appears in OpenAPI docs when server starts
- No TypeScript errors

---

### Step 14: Register worker handler

**Entry condition:** Step 13 complete (API route registered)

**Actions:**
1. Mark todo #14 in-progress
2. Read `apps/worker/src/index.ts`
3. Import the handler: `import { handle<Entity> } from "./jobs/handle-<entity>.js";`
4. Add task to runner.addTask list with event type from outbox
5. Mark todo #14 completed

**Exit criteria:**
- Handler imported and registered in worker/index.ts
- Task type matches outbox event enum
- No TypeScript errors

---

### Step 15: Update OWNERS.md files

**Entry condition:** Step 14 complete (worker handler registered)

**Actions:**
1. Mark todo #15 in-progress
2. Read generated OWNERS.md files in contracts/<domain>/ and core/<domain>/
3. Update with actual exports and descriptions:
   - List all exported schemas/services
   - Document domain responsibilities
   - Add team ownership
4. Mark todo #15 completed

**Exit criteria:**
- OWNERS.md files have meaningful content
- Exports match actual code
- Passes owners-lint gate

---

### Step 16: Write tests

**Entry condition:** Step 15 complete (OWNERS updated)

**Actions:**
1. Mark todo #16 in-progress
2. Create `packages/core/src/<domain>/__vitest_test__/<entity>.test.ts`
3. Write tests for:
   - Happy path: create, update, query
   - Validation: invalid inputs rejected
   - State transitions: status changes enforced
   - SoD rules: permission checks
   - Idempotency: duplicate commands handled
4. Ensure tests use real Postgres (integration tests)
5. Run `pnpm test --filter @afenda/core` to verify
6. Mark todo #16 completed

**Exit criteria:**
- Test file exists in __vitest_test__/
- All tests pass
- Coverage includes critical paths

---

### Step 17: Run all gates

**Entry condition:** Step 16 complete (tests written and passing)

**Actions:**
1. Mark todo #17 in-progress
2. Run `pnpm typecheck` - verify no type errors
3. Run `pnpm test` - verify all tests pass
4. Run `pnpm check:all` - verify all 10 CI gates pass:
   - boundaries.mjs (import direction)
   - catalog.mjs (pnpm workspace deps)
   - contract-db-sync.mjs (schema-table parity)
   - migration-lint.mjs (migration quality)
   - owners-lint.mjs (OWNERS.md completeness)
   - schema-invariants.mjs (DB schema rules)
   - server-clock.mjs (no new Date() with db imports)
   - test-location.mjs (tests in __vitest_test__)
   - token-compliance.mjs (no hardcoded secrets)
   - ui-meta.mjs (UI component metadata)
5. If any gate fails, fix the issue and re-run
6. Mark todo #17 completed

**Exit criteria:**
- All gates pass
- No type errors
- All tests pass

---

### Step 18: PR ready

**Entry condition:** Step 17 complete (all gates pass)

**Actions:**
1. Mark todo #18 in-progress
2. Review all changed files
3. Generate PR checklist from completed todos
4. Summarize what was implemented
5. Suggest PR title: `feat(<domain>): add <entity> entity`
6. Mark todo #18 completed
7. Display completion message with next steps

**Exit criteria:**
- All steps completed
- All gates pass
- PR checklist ready

## Usage examples

### Example 1: User starts scaffold workflow

**User:** "I need to add a new purchase order entity to the procurement domain"

**Agent response:**
```
I'll guide you through the AFENDA scaffold workflow for adding a new entity. 
Let me start by running the scaffold command.

Running: pnpm scaffold procurement purchase-order
```

[Agent creates todo list with all 16 steps, marks step 1 in-progress, runs scaffold, marks step 1 completed, moves to step 2]

---

### Example 2: User asks about workflow

**User:** "What's the process for adding a new feature?"

**Agent response:**
```
AFENDA uses a schema-is-truth workflow enforced by CI gates. Here's the process:

1. **Scaffold** — Generate files with `pnpm scaffold <domain> <entity>`
2. **Define schemas** — Zod entity + command schemas
3. **DB table** — Drizzle pgTable + migration
4. **Register shared** — Error codes, audit actions, permissions, outbox events
5. **Sync pair** — Add to contract-db-sync.mjs
6. **Wire barrels** — Export from contracts and core
7. **Wire routes** — Register in API and worker
8. **Tests** — Write integration tests
9. **OWNERS** — Update OWNERS.md files
10. **Verify** — Run `pnpm typecheck && pnpm test && pnpm check:all`

Would you like me to guide you through this workflow for a specific entity?
```

---

### Example 3: User is mid-workflow

**User:** "I've finished the Zod schemas, what's next?"

**Agent response:**
```
Great! Next step is to create the Drizzle table definition.

I'll read your entity schema to get the StatusValues export, then guide you 
through creating the pgTable in packages/db/src/schema/<domain>.ts.

[Marks step 4 in-progress, reads entity schema, generates Drizzle table template]
```

## Error handling

### Gate failures

If any CI gate fails during step 17:
1. Identify which gate failed and why
2. Explain the violation to the user
3. Fix the issue (e.g., add missing sync pair, move test file)
4. Re-run the specific gate to verify fix
5. Continue with remaining gates

### TypeScript errors

After each step, check for TypeScript errors:
1. Run `get_errors` for the modified files
2. If errors exist, display them to the user
3. Fix the errors before proceeding to next step
4. Verify errors are resolved

### Test failures

If tests fail in step 16:
1. Show the test failure output
2. Analyze the error (e.g., validation issue, DB constraint violation)
3. Fix the test or underlying code
4. Re-run tests until they pass
5. Only then mark step 16 completed

## State persistence

Use session memory to track workflow state:
- Current step number
- Domain and entity names
- Completed steps
- Any manual notes from user

File pattern: `/memories/session/scaffold-<domain>-<entity>.md`

## Integration with existing tools

### Scaffold tool

Call the existing `tools/scaffold.mjs` to generate initial files. Do not reimplement this logic.

### CI gates

Call the existing `pnpm check:all` command. Do not reimplement gate logic. If a specific gate fails, suggest running it individually for faster feedback.

### Drizzle migrations

Use `pnpm db:generate` to create migrations. Do not write SQL manually unless the user explicitly requests it.

## Best practices

1. **One step at a time** — Complete and verify each step before moving to next
2. **Verify before proceed** — Read files, check errors, run checks
3. **Clear progress** — Use todo list so user can see progress
4. **Explain violations** — When gates fail, explain why and how to fix
5. **Respect conventions** — Follow naming patterns, import direction, file locations
6. **Document changes** — Update OWNERS.md with meaningful descriptions

## Anti-patterns to avoid

❌ **Don't skip steps** — Each step has dependencies on previous steps
❌ **Don't batch completions** — Mark todos completed immediately after finishing
❌ **Don't violate import direction** — Core can import contracts+db, API cannot import db
❌ **Don't hardcode colors/dates** — Use Tailwind tokens and `sql\`now()\``
❌ **Don't use floats for money** — Use bigint minor units
❌ **Don't skip tests** — Tests are required for gate compliance
❌ **Don't skip OWNERS.md** — Required for owners-lint gate

## References

- **PROJECT.md §18** — New Code Workflow
- **PROJECT.md §4** — Import Direction Law
- **PROJECT.md §11** — CI Gates
- **copilot-instructions.md** — Hard rules and conventions
- **tools/scaffold.mjs** — Scaffold tool source
- **tools/gates/** — CI gate implementations
