# Build artifacts and cache locations

Where build outputs and caches live in this repo (and what was removed during recovery).

## In this repo

| Location | What it is | In .gitignore? |
|----------|------------|-----------------|
| **`.turbo/`** (root) | Turborepo **task cache** (hashes + metadata so tasks can be skipped). Not the actual build output. | Yes |
| **`apps/web/.next/`** | Next.js build output (compiled pages, chunks, cache). | Yes |
| **`apps/web/.turbo/`** | Turbo cache for the `web` app. | Yes (via root .turbo) |
| **`apps/api/dist/`** | Compiled API (tsup output). | Yes (`dist`) |
| **`apps/worker/dist/`** | Compiled worker (tsup output). | Yes (`dist`) |
| **`packages/contracts/dist/`** | Compiled contracts (tsc output). | Yes (`dist`) |
| **`packages/core/dist/`** | Compiled core (tsc output). | Yes (`dist`) |
| **`packages/db/dist/`** | Compiled db (tsc output). | Yes (`dist`) |
| **`packages/ui/dist/`** | Compiled UI (tsup output). | Yes (`dist`) |
| **`packages/*/dist/`** | Any other package build output. | Yes (`dist`) |
| **`packages/<pkg>/.turbo/`** | Per-package Turbo cache. | Yes |
| **`coverage/`** | Test coverage reports. | Yes |
| **`packages/db/drizzle/`** | Drizzle migration artifacts. | Yes |

So: **all real build artifacts** are under `dist/`, `.next/`, and (for DB) `drizzle/`.  
**Turbo** only stores cache metadata under `.turbo/` so it can skip re-running tasks when inputs haven’t changed.

## What “many builds” produced and where it went

- **Turbo cache** (root `.turbo/` and app/package `.turbo/`):  
  We **removed** the root `.turbo/` and `apps/web/.next` and `apps/web/.turbo` during the first recovery.  
  Turbo’s cache is **content-addressed** (input hash → “task already ran”). It does **not** store your source or a full copy of build output; it only lets Turbo skip re-running the same task. So there is nothing to “recover” from it.

- **Next.js** (`apps/web/.next/`):  
  We **removed** this during recovery. It’s **regenerated** by `pnpm build` or `pnpm dev` in `apps/web`. There is no other backup of it unless you had a copy elsewhere.

- **`dist/`** (api, worker, contracts, core, db, ui):  
  These were **not** deleted. If you had run `pnpm build` before, the current `dist/` folders are from the last build in this tree. They are **not** in Git (`.gitignore` has `dist`).

## pnpm and Node

- **`node_modules/`**  
  Dependencies only (installed from lockfile). No copy of your app’s build artifacts.

- **pnpm store** (e.g. `~/.local/share/pnpm/store` or Windows equivalent)  
  Global store of **packages** (tarballs). No Turborepo or Next.js cache, no `dist/` or `.next/` from this repo.

So: **build artifacts** = what’s under `dist/`, `.next/`, and (for DB) `drizzle/`.  
**Caches** = `.turbo/` (and similar). After the recovery, root `.turbo` and `apps/web/.next` were cleared; the only way to get “many builds” again is to run the builds again (`pnpm build` or `pnpm dev`).

## Regenerating everything

From repo root:

```bash
pnpm install
pnpm build
```

This repopulates all `dist/` and `apps/web/.next/`, and Turbo will refill `.turbo/` as tasks run.
