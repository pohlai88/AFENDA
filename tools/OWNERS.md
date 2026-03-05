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
│   ├── boundaries.mjs       # Import Direction Law enforcement
│   ├── catalog.mjs          # pnpm catalog version hygiene
│   ├── test-location.mjs    # Test file placement convention
│   ├── schema-invariants.mjs # Drizzle schema structural rules
│   ├── migration-lint.mjs   # SQL migration pattern linting
│   ├── contract-db-sync.mjs # Contract DTO ↔ DB column alignment
│   ├── server-clock.mjs     # Bans new Date() in DB-touching code
│   └── owners-lint.mjs      # OWNERS.md Files table validation
├── run-gates.mjs     # Unified runner — executes all gates, exits 1 on any fail
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
