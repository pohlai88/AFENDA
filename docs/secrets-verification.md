# Secrets Verification — Rotate vs Non-Rotate

Verification of auth and signing secrets to prevent **silent fallback** to non-authenticated or broken state.

---

## Secret Categories

| Category | Meaning | Action on Rotate |
|----------|---------|------------------|
| **Non-rotatable** | Changing invalidates all existing tokens/sessions | Rotate only during maintenance; users must re-auth |
| **Rotatable** | Can change with grace period or no impact | Safe to rotate periodically |

---

## Auth & Signing Secrets

| Secret | Used By | Validated At | If Missing | Rotate Impact |
|--------|---------|--------------|------------|---------------|
| **NEXTAUTH_SECRET** | API (Bearer decrypt), Web (NextAuth JWT) | API startup (ApiEnvSchema) | API fails to start | All sessions invalid; users re-sign-in |
| **AUTH_CHALLENGE_SECRET** | API (MFA verify), Web (challenge create/verify) | API startup (ApiEnvSchema), Web (instrumentation.ts in prod) | API fails to start; Web fails to start in prod | Pending challenges invalid |
| **AUTH_EVIDENCE_SIGNING_SECRET** | Web (evidence export signing) | Web instrumentation.ts (prod only) | Web fails to start in prod | Existing signatures invalid |
| **SESSION_SECRET** | Unused in codebase | — | N/A | N/A |

---

## Current .env Status

| Secret | In .env | Value Type | Status |
|--------|---------|------------|--------|
| NEXTAUTH_SECRET | ✅ | 32-byte base64 | ✅ Finalized |
| AUTH_CHALLENGE_SECRET | ✅ | 32-byte hex | ✅ Finalized |
| AUTH_EVIDENCE_SIGNING_SECRET | ✅ | 32-byte hex | ✅ Finalized |
| SESSION_SECRET | ✅ | 32-byte base64 | ✅ (unused) |

---

## End-to-End Validation (Fail-Fast)

| App | Validation | Behavior |
|-----|------------|----------|
| **API** | ApiEnvSchema at startup | Fails to start if NEXTAUTH_SECRET or AUTH_CHALLENGE_SECRET missing/invalid |
| **Web** | instrumentation.ts (prod only) | Fails to start if AUTH_CHALLENGE_SECRET or AUTH_EVIDENCE_SIGNING_SECRET missing |

---

## Recommendations

1. Keep all three secrets in `.env` and deployment secrets.
2. Rotate only during maintenance: coordinate NEXTAUTH_SECRET + AUTH_CHALLENGE_SECRET + AUTH_EVIDENCE_SIGNING_SECRET.
