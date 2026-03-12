# Neon Auth Integration Implementation Plan

**Status:** Ready for Phase 0 (Prerequisites)  
**Skill Location:** `.agents/skills/neon-auth-integration/SKILL.md`  
**Validation Document:** `docs/adr/neon-auth-validation.md`  
**Last Updated:** March 12, 2026  

---

## Phase 0: Prerequisites ✅ READY

**Duration:** 1-2 hours | **Blocker:** None

- [ ] **0.1 - Add env variable to schema**
  - File: `packages/core/src/kernel/infrastructure/env.ts`
  - Action: Add `NEXT_PUBLIC_NEON_AUTH_URL` to `WebEnvSchema`
  - Verify: `pnpm typecheck` passes

- [ ] **0.2 - Update `.env.example`**
  - File: `.env.example`
  - Action: Uncomment and document:
    ```bash
    NEON_AUTH_BASE_URL=https://...neonauth.../db/auth
    NEON_AUTH_COOKIE_SECRET=...base64-32-byte-secret...
    NEXT_PUBLIC_NEON_AUTH_URL=https://...neonauth.../db/auth
    ```
  - Verify: `.env` updated with real values from Neon console

- [ ] **0.3 - Check Neon project readiness**
  - [ ] Project exists in https://console.neon.tech
  - [ ] AWS region confirmed (not Azure)
  - [ ] No IP Allow lists OR Private Networking
  - [ ] Plan verified (Free/Launch/Scale)
  - [ ] Database name noted (default: `neondb`)

- [ ] **0.4 - Install dependencies**
  - Command: `pnpm add -W @neondatabase/auth @neondatabase/neon-js`
  - Verify: `pnpm list @neondatabase/auth` shows latest

---

## Phase 1: Provision Neon Auth 🔌 BLOCKED (User action)

**Duration:** 5-15 minutes | **Blocker:** Requires Neon console access

- [ ] **1.1 - Enable Neon Auth in console**
  - URL: https://console.neon.tech → Project → **Auth** tab
  - Action: Click **Enable Neon Auth**
  - Select: database = `neondb` (or your database name)
  - Wait: `neon_auth` schema creation (2-5 min)

- [ ] **1.2 - Verify schema created**
  - Command: `psql $DATABASE_URL -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'neon_auth';"`
  - Expected: `neon_auth` row returned

- [ ] **1.3 - Get Auth endpoint details**
  - Console path: Project → Auth → **Settings**
  - Note down:
    - ✏️ `NEON_AUTH_BASE_URL` (e.g., `https://ep-xxx.neonauth.region.aws.neon.tech/neondb/auth`)
    - ✏️ `NEON_AUTH_COOKIE_SECRET` (generate: `openssl rand -base64 32`)
  - Action: Update `.env` with these values

---

## Phase 2: Server-Side SDK Setup 💻 READY

**Duration:** 1-2 hours | **Blocker:** Phase 1 complete

- [ ] **2.1 - Create server auth module**
  - File: `apps/web/src/lib/auth/server.ts` (NEW)
  - Copy from: Skill section "Phase 2A"
  - Verify: TypeScript compilation passes

- [ ] **2.2 - Create route handler**
  - File: `apps/web/src/app/api/auth/[...auth]/route.ts` (NEW)
  - Copy from: Skill section "Phase 2B"
  - Action: Delete old `[...nextauth]` folder if exists
  - Verify: Route is accessible at `GET /api/auth/session`

- [ ] **2.3 - Update middleware (optional)**
  - File: `apps/web/middleware.ts`
  - Action: Import `auth` from lib; add optional session check
  - Verify: Middleware compiles; dev server starts

- [ ] **2.4 - Manual testing: Server SDK**
  - Terminal: `pnpm --filter @afenda/web dev`
  - Browser: `curl http://localhost:3000/api/auth/session`
  - Expected: `{ "session": null }` (no logged-in user yet)

---

## Phase 3: Client-Side SDK Setup 🌐 READY

**Duration:** 1.5-2 hours | **Blocker:** Phase 2 complete

- [ ] **3.1 - Create client auth module**
  - File: `apps/web/src/lib/auth/client.ts` (NEW)
  - Copy from: Skill section "Phase 3A"
  - Verify: TypeScript compilation passes

- [ ] **3.2 - Create auth provider component**
  - File: `apps/web/src/components/auth-provider.tsx` (NEW)
  - Copy from: Skill section "Phase 3B"
  - Verify: Component export correct

- [ ] **3.3 - Update root layout**
  - File: `apps/web/src/app/layout.tsx`
  - Action: Wrap children with `<AuthProvider>`
  - Verify: Layout compiles

- [ ] **3.4 - Create sign-in page**
  - File: `apps/web/src/app/(public)/signin/page.tsx` (NEW)
  - Choose one:
    - [ ] Option A: Pre-built Neon Auth UI (recommended for speed)
    - [ ] Option B: Custom shadcn form (recommended for branding)
  - Verify: Page renders without errors

- [ ] **3.5 - Manual testing: Client SDK**
  - Terminal: Ensure dev server running
  - Browser: Navigate to `http://localhost:3000/signin`
  - Expected: Sign-in form appears (either pre-built or custom)
  - Action: Attempt email signup (dev only, data doesn't persist yet)

---

## Phase 4: API Bearer Token Verification 🔐 READY

**Duration:** 1.5-2 hours | **Blocker:** Phase 2 complete (Phase 3 optional for this)

- [ ] **4.1 - Update API auth plugin**
  - File: `apps/api/src/plugins/auth.ts`
  - Action: Replace bearer stub with JWKS verification code
  - Reference: Skill section "Phase 4A"
  - Verify: Plugin compiles

- [ ] **4.2 - Install JWT library**
  - Command: `pnpm add -W jose`
  - Verify: Installed in `pnpm-lock.yaml`

- [ ] **4.3 - Implement verifyNeonAuthToken()**
  - File: `apps/api/src/plugins/auth.ts` (same file as 4.1)
  - Copy full implementation from: Skill section "Phase 4B"
  - Verify: Function compiles and types correctly

- [ ] **4.4 - Manual testing: Bearer verification**
  - Prerequisite: User signed up via Phase 3 (has session)
  - Terminal: `pnpm --filter @afenda/api dev`
  - Test: Sign in via web app → Get session token from cookie
  - Command: 
    ```bash
    curl -H "Authorization: Bearer <token>" \
      http://localhost:3001/v1/invoices
    ```
  - Expected: 200 OK (or domain-specific response) instead of 401

---

## Phase 5: Database Schema Alignment 🗄️ READY

**Duration:** 2-3 hours | **Blocker:** Phase 1 complete; DB setup

- [ ] **5.1 - Create sync trigger**
  - File: `packages/db/drizzle/migrations/0001_neon_auth_sync.sql` (NEW)
  - Copy from: Skill section "Phase 5A"
  - Action: Review trigger logic; adjust demo org UUID if needed
  - Verify: SQL syntax valid

- [ ] **5.2 - Run migration**
  - Command: `pnpm db:migrate`
  - Verify: Trigger created (check in Cloud Console or with `SELECT proname FROM pg_proc WHERE proname = 'sync_neon_auth_to_afenda'`)

- [ ] **5.3 - Update resolvePrincipalContext**
  - File: `packages/core/src/kernel/identity/resolve-principal.ts`
  - Action: Create `resolvePrincipalFromNeonAuth()` function per Skill Phase 5B
  - Verify: Function signature matches expected usage

- [ ] **5.4 - Create RLS policies**
  - File: `packages/db/drizzle/migrations/0002_neon_auth_rls.sql` (NEW)
  - Action: Create RLS policies linking `neon_auth.user.id` → org access
  - Reference: Skill section "Phase 5C"
  - Verify: Policies created and enabled

- [ ] **5.5 - Manual testing: DB linking**
  - Action: Sign up new user via Phase 3 web app
  - Verify: Check database:
    ```sql
    SELECT id, email, created_at FROM neon_auth."user" LIMIT 1;
    SELECT party_id, party_type FROM auth_principal WHERE id = <neon_auth.user.id>;
    SELECT org_id FROM party_membership WHERE party_id = <party_id>;
    ```
  - Expected: All three rows exist and linked correctly

---

## Phase 6: Remove Dev Shim 🗑️ READY (Final cleanup)

**Duration:** 30 minutes | **Blocker:** Phases 1-5 complete & verified working

- [ ] **6.1 - Update imports across codebase**
  - Files: All files importing `import { auth } from "@/auth"`
  - Action: Replace with `import { getSession } from "@/lib/auth/server"`
  - Command: `grep -r "from ['\"]@/auth['\"]" apps/web/src`
  - Verify: All references updated; typecheck passes

- [ ] **6.2 - Delete temporary shim**
  - File: `apps/web/auth.ts` (DELETE)
  - Verify: No import errors; web app still compiles

- [ ] **6.3 - Remove dev-header bypass loop (optional)**
  - File: `apps/api/src/plugins/auth.ts`
  - Action: After Production validation, remove X-Dev-User-Email path or gate-check it
  - Verify: API still works with real Neon Auth tokens

- [ ] **6.4 - Final E2E test**
  - Command: `pnpm test`
  - Action: Run full test suite
  - Expected: All tests pass

---

## Rollback Plan (If Needed)

Each phase has an exit strategy:

- **Phase 1 fails:** Delete Neon Auth from console; revert to temp dev shim
- **Phase 2 fails:** Delete `/api/auth/[...auth]/` and revert `middleware.ts`; keep dev shim
- **Phase 3 fails:** Delete sign-in page and auth provider; users still auth via API
- **Phase 4 fails:** Keep dev-header bypass; users auth via web sessions only
- **Phase 5 fails:** Don't run trigger/RLS migrations; manually map users in dev/test
- **Phase 6 fails:** Keep dev shim and imports; just don't delete `auth.ts`

**Feature flag (optional):**
```typescript
// In auth.ts or via environment
if (process.env.USE_NEON_AUTH === "false") {
  return devShimSession; // fallback
}
```

---

## Success Criteria

After all phases:

- ✅ User can sign up at `/signin`
- ✅ Session cookie set and validated
- ✅ API requests with Bearer token work (401 without it)
- ✅ DB: neon_auth.user linked to AFENDA party/principal
- ✅ RLS: User in Org A cannot see Org B data
- ✅ Multi-org: All 67 auth modules still function
- ✅ Dev shim deleted; all imports updated
- ✅ Tests pass; E2E tests verify signup/login/logout
- ✅ Production deployment ready

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| Phase 0 | 1-2 hours | 1-2h |
| Phase 1 | 5-15 min | 1.5-2.25h |
| Phase 2 | 1-2 hours | 2.5-4.25h |
| Phase 3 | 1.5-2 hours | 4-6.25h |
| Phase 4 | 1.5-2 hours | 5.5-8.25h |
| Phase 5 | 2-3 hours | 7.5-11.25h |
| Phase 6 | 30 min | **8-12 hours total** |

**Real-world:** 1-2 weeks (including testing, debugging, org-wide rollout).

---

## Support References

- Skill: `.agents/skills/neon-auth-integration/SKILL.md`
- Validation: `docs/adr/neon-auth-validation.md`
- Official Neon Auth Docs: https://neon.com/docs/auth/overview
- AFENDA Architecture: `PROJECT.md`
- Auth Modules: `apps/web/src/features/auth/server/STRUCTURE.md`

