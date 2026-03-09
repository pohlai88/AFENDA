# tools/ — OWNERS

## Scope

CI gate scripts, shared tooling libraries, and the gate runner.

## Layout

```
tools/
├── lib/              # Shared utilities (ANSI, file walkers, reporters)
│   ├── ansi.mjs      # Terminal color helpers
│   ├── walk.mjs      # Recursive TS file walker
│   ├── imports.mjs   # Import-statement extractor + bare-package normalizer
│   ├── workspace.mjs # pnpm-workspace.yaml loader + pkg.json discovery
│   └── reporter.mjs  # Grouped violation reporter + summary table
├── gates/            # Individual CI gate scripts (one concern per file)
│   ├── boundaries.mjs         # Import Direction Law enforcement
│   ├── catalog.mjs            # pnpm catalog version hygiene
│   ├── contract-db-sync.mjs   # Contract DTO ↔ DB column alignment
│   ├── domain-completeness.mjs # Domain-level contract/core/db/route consistency
│   ├── migration-lint.mjs     # SQL migration pattern linting
│   ├── module-boundaries.mjs  # Pillar + module dependency enforcement (ADR-0005)
│   ├── owners-lint.mjs        # OWNERS.md Files table validation
│   ├── schema-invariants.mjs  # Drizzle schema structural rules
│   ├── server-clock.mjs       # Bans new Date() in DB-touching code
│   ├── test-location.mjs      # Test file placement convention
│   ├── token-compliance.mjs   # No hardcoded color values in TSX/CSS
│   └── ui-meta.mjs            # Metadata registry completeness
├── modules/          # Per-module manifest files (domain completeness data)
├── eslint/
│   ├── no-hardcoded-colors.mjs  # ESLint rule: enforce design tokens (token-compliance)
│   ├── no-js-date-in-db.mjs     # ESLint rule: no new Date() in DB code (server-clock)
│   └── no-raw-form-elements.mjs # ESLint rule: shadcn components only (shadcn-enforcement)
├── run-gates.mjs     # Unified runner — executes all 12 gates, exits 1 on any fail
└── OWNERS.md         # This file
```

## Adding a new gate

1. Create `tools/gates/<name>.mjs`
2. Import shared helpers from `../lib/*.mjs`
3. Register the script in `tools/run-gates.mjs` → `GATES` array
4. Add a `check:<name>` script in the root `package.json`
5. Document the rule in `PROJECT.md §18`

## Owner

@ArtisanLabs / DX team
