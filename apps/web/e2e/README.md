# Playwright Strategy (AFENDA Web)

## Test Layers

1. Web smoke (`smoke.spec.ts`)

- Goal: fast, deterministic route and UI availability checks.
- Dependency profile: web app only.
- Default runtime target: Chromium.

2. API guard checks (`admin-api-guards.spec.ts`)

- Goal: verify unauthenticated protection on critical admin mutation endpoints.
- Dependency profile: web + API running together.
- Gated by env var: `PLAYWRIGHT_REQUIRE_API=1`.

## Commands

From repo root:

```bash
pnpm e2e:smoke
pnpm e2e:smoke:matrix
pnpm e2e:auth
```

From `apps/web`:

```bash
pnpm e2e
pnpm e2e:smoke
pnpm e2e:smoke:matrix
pnpm e2e:api-guards
pnpm e2e:install
```

## Execution Policy

- Local default: run Chromium smoke only for fast feedback.
- CI default: full browser matrix (Chromium, Firefox, WebKit, mobile-chrome).
- Full-stack auth guard checks should run only when API services are available.

## Stability Notes

- Playwright config uses `reuseExistingServer: true` locally to prevent duplicate dev servers.
- Base URL defaults to `http://localhost:3100` to avoid cross-origin dev warnings.
- Use `PLAYWRIGHT_BASE_URL` to target an externally managed environment.
