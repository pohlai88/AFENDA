# Phase 1 — Restore Correctness of Auth Truth

**Status:** Planning  
**Last Updated:** March 10, 2026  
**Purpose:** Blocking fixes to eliminate split-brain auth and restore API as source of truth

---

## Overview

These items are **blocking**. They must be completed in order before auth can be considered correct.

---

## Order of Execution

### 1. Build ApiAfendaAuthService

**Keystone fix.** Without it, you will keep shipping split-brain auth.

- Web must call API for all auth operations instead of duplicating logic or using mock rules
- Single abstraction: `AfendaAuthService` with API-backed implementation
- All methods return normalized `AuthFlowResult<T>` shape

---

### 2. Add API Verification Endpoints

At minimum:

- **verify reset token** — validate token before showing reset form
- **verify invite token** — validate invite before showing accept form
- **verify MFA challenge** — validate or finalize MFA login

---

### 3. Fix MFA Finalization

After MFA success, **establish session before redirect**.

This is a hard bug, and very visible. Users complete MFA but land on sign-in again because session is not established before the redirect.

---

### 4. Fix Invite Acceptance Finalization

Invite accept must **not** depend on mock password validation rules that are unrelated to the invited user's chosen password.

- Remove any hardcoded or mock-specific password checks
- Use API-backed invite acceptance flow
- Session grant or credential exchange must succeed for valid invited-user passwords

---

## Dependencies

```
1. ApiAfendaAuthService  ← keystone (blocks 2–4)
       ↓
2. API verification endpoints  ← enables token/invite/MFA verification
       ↓
3. MFA finalization  ← session before redirect
4. Invite acceptance finalization  ← no mock password rules
```

Items 3 and 4 can proceed in parallel once 1 and 2 are done.

---

## Definition of Done

- [ ] `ApiAfendaAuthService` is the default/primary implementation when API is available
- [ ] All verification endpoints exist and return `AuthFlowResult<T>`
- [ ] MFA success establishes session before redirect (no re-sign-in)
- [ ] Invite accept works for any valid password chosen by the invited user (no mock rules)

---

## Phase 2 — Restore Route Protection

### 5. Fix portal/layout.tsx

This cannot remain public if portal data is meaningful.

### 6. Fix middleware / proxy

Use middleware for broad route gatekeeping, but keep page/layout-level protection too.

**Reason:**

- Middleware is coarse
- Server components/layouts are authoritative
- Defense in depth matters for ERP

---

## Phase 3 — Restore Operational Integrity

### 7. Fix verifySession

If DAL auth helpers return null forever, your app cannot build trustworthy server-side access control. See [Validation §6. DAL verifySession](#6-dal-verifysession) for the target shape.

### 8. Fix client-side API auth

This is a serious architectural issue. Hardcoded `x-dev-user-email` in client components is acceptable only as temporary local scaffolding, not as an auth model.

**Best pattern:**

- Client calls Next.js route handler / server action
- Server reads session
- Server injects bearer/org context
- Server calls API

For AFENDA, this is cleaner than pushing access tokens into browser code everywhere.

---

## Phase 5.5 — Compliance and Evidence Management

### 9. Review attestations

Control owners attest to effectiveness; audit trail of who attested, when, and for which control.

### 10. Periodic control checks

Scheduled verification of auth controls (e.g. quarterly); results recorded and linked to attestations.

### 11. Evidence retention policies by jurisdiction

Retention rules per region (GDPR, CCPA, SOX, etc.); automated purge or archive based on policy.

### 12. Signed exports

Incident evidence, audit logs, and governance snapshots exported with cryptographic signatures (e.g. HMAC-SHA256 or Ed25519) so integrity is verifiable.

### 13. Chain-of-custody metadata

Each evidence artifact carries: created_at, exported_at, exported_by, signature, previous_hash (for chained integrity).

### 14. SOX / ISO / audit review workflows

Structured workflows for external audit review: evidence package assembly, reviewer access, sign-off, and archival.

---

## Phase 5.6 — Governance Execution

### 15. Scheduled quarterly review creation

Automated creation of review cases on a quarterly cadence; linked to control definitions and attestation cycles.

### 16. Reviewer reminders

Notifications to reviewers when reviews are assigned, due soon, or overdue.

### 17. Overdue control escalation

Escalation path when controls or reviews exceed due dates; notify owners, then escalate to internal audit.

### 18. Approval matrix

Role-based approval rules: who can approve which framework, control, or evidence package; multi-level sign-off where required.

### 19. Evidence package bundles for auditors

Assemble incident evidence, audit events, attestations, and control runs into a single downloadable bundle with manifest.

### 20. Read-only auditor portal views

Dedicated portal or views for external auditors: evidence packages, attestations, chain-of-custody — no write access.

### 21. Immutable export manifests

Export manifests (file list, hashes, signatures) stored append-only; no update or delete once created.

---

## Validation — Correct Patterns

### 1. Password Reset

**Diagnosis:** Correct.

**Advice:** Do not verify reset token through Mock/HTTP abstractions disconnected from the issuing API.

**Correct pattern:**

- API issues hashed reset token
- API verifies raw token
- API consumes token on successful reset
- API emits audit events
- Web only renders form and submits password

### 2. MFA Success

**Diagnosis:** Yes, this must be fixed immediately.

**Advice:** Do not just "add signIn()" blindly.

**Better implementation:**

After MFA verification:

- Either call a dedicated session-finalization endpoint
- Or receive a one-time auth grant
- Then sign in with that grant

That avoids awkward re-submission of credential state.

### 6. DAL verifySession

This should be rebuilt around your actual session source.

**Session sources (examples):**

- NextAuth session
- Internal auth cookie
- Server-side decoded grant

But it must return a **normalized AFENDA auth context**, not raw library output.

**Example:**

```typescript
type VerifiedSession = {
  userId: string;
  tenantId: string;
  portal: string;
  roles: string[];
  permissions: string[];
  orgIds: string[];
};
```

That becomes the trusted object for layouts, DAL, and API wrappers.
