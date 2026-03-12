# ADR-0008: Neon Auth Production Deployment

**Status:** Active  
**Context:** AFENDA is deploying Neon Auth as the managed identity provider for production  
**Decision:** Use Neon Auth (Better Auth 1.4.18) with branch-aware authentication and production-hardened configuration  
**Consequences:** Auth data branches with database; org limits enforced; email invitations required

---

## Overview

Neon Auth provides managed authentication integrated with your Neon database. Authentication data lives in the `neon_auth` schema and branches with your database.

**Key Features:**
- Identity in Postgres (neon_auth schema)
- Branch-aware auth states
- Email invitations for org membership
- Row-Level Security (RLS) compatible
- JWT tokens for Data API integration

---

## Configuration

### Organization Limits

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Org Limit per User** | 10 | Typical business has 1-3 orgs; 10 is a safe ceiling |
| **Membership Limit per Org** | **500** | Enterprise AP teams need 100-500+ members; audit/compliance access included |
| **Creator Role** | Owner | Org creator must be owner for audit trail |
| **Invitations** | Required | Email invitations provide explicit access approval (audit requirement) |

### Environment Variables

**Required in production:**
```env
# Neon Auth (from Neon Console → Auth tab)
NEON_AUTH_BASE_URL=https://your-domain.neonauth.region.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=<32-byte base64 secret>

# Public URL (for client-side redirects)
NEXT_PUBLIC_NEON_AUTH_URL=https://your-domain.neonauth.region.aws.neon.tech/neondb/auth

# JWT validation (for Data API)
NEON_AUTH_JWKS_URL=https://your-domain.neonauth.region.aws.neon.tech/neondb/auth/.well-known/jwks.json

# Email sender
DEFAULT_FROM_EMAIL=no-reply@nexuscanon.com
DEFAULT_FROM_NAME=AFENDA
```

---

## Pre-Deployment Checklist

### Neon Console Configuration

- [ ] **Org Limits Updated**
  - [ ] Membership Limit: 100 → **500**
  - [ ] Creator Role: **Owner**
  - [ ] Invitations: **Enabled** (email required)

- [ ] **Email Provider Configured**
  - [ ] Type: Custom SMTP (Zoho)
  - [ ] Host: `smtp.zoho.com`
  - [ ] Port: `465`
  - [ ] Username: `no-reply@nexuscanon.com` ← **Full email address, not just "AFENDA"**
  - [ ] Sender Email: `no-reply@nexuscanon.com`
  - [ ] Sender Name: `AFENDA`
  - [ ] Test email sent successfully ✓

- [ ] **OAuth Providers** (if using social login)
  - [ ] Google OAuth configured
  - [ ] GitHub OAuth configured
  - [ ] Callback URLs set to production domain

### Application Setup

- [ ] **Dependencies Installed**
  ```bash
  pnpm --filter @afenda/web add @neondatabase/auth better-auth
  ```

- [ ] **Server Auth Configured**
  - [ ] `apps/web/src/lib/auth/server.ts` ✓ (already implemented)
  - [ ] `apps/web/src/app/api/auth/[...auth]/route.ts` ✓ (already implemented)

- [ ] **Client Auth Configured**
  - [ ] `apps/web/src/lib/auth/client.ts` ✓ (already implemented)
  - [ ] React hook `useAuth()` available ✓

- [ ] **Auth Pages Ready**
  - [ ] Sign in page: `/auth/signin` ✓
  - [ ] Sign up page: `/auth/signup` ✓
  - [ ] Password reset: `/auth/reset-password` ✓
  - [ ] Email verification: `/auth/verify` ✓
  - [ ] Org invitations: `/auth/invite` ✓

- [ ] **Environment Variables Set**
  - [ ] `NEON_AUTH_BASE_URL` production value
  - [ ] `NEON_AUTH_COOKIE_SECRET` 32-byte secret
  - [ ] `NEXT_PUBLIC_NEON_AUTH_URL` matches base URL
  - [ ] `NEON_AUTH_JWKS_URL` set correctly

### Security Hardening

- [ ] **Session Security**
  - [ ] `NEON_AUTH_COOKIE_SECRET` is 32+ bytes (base64)
  - [ ] Cookies marked `Secure, HttpOnly` (Neon Auth default)
  - [ ] Session timeout appropriate (24h default)

- [ ] **JWT Validation**
  - [ ] Data API configured to validate NEON_AUTH_JWKS_URL
  - [ ] Bearer token validation working
  - [ ] Test endpoint with invalid token returns 401

- [ ] **Email Security**
  - [ ] Zoho SMTP credentials stored in env (not code)
  - [ ] Test email delivery from no-reply address
  - [ ] SPF/DKIM/DMARC records configured for nexuscanon.com

- [ ] **RLS Policies**
  - [ ] `neon_auth` schema tables locked down
  - [ ] User can only see their own data
  - [ ] Org members see org-scoped data only

### Monitoring & Observability

- [ ] **Auth Logs Enabled**
  - [ ] Neon Auth logs in Neon Console accessible
  - [ ] Failed login attempts visible
  - [ ] Invitation sent/accepted tracked

- [ ] **Error Tracking**
  - [ ] Sentry/GlitchTip configured for auth errors
  - [ ] Test: Create invalid session, verify error logged
  - [ ] Test: Token expiry, verify refresh works

- [ ] **Performance**
  - [ ] Auth token refresh < 100ms (local)
  - [ ] Session creation < 500ms (includes email send)
  - [ ] Test under load with concurrent sign-ins

### Data Integrity

- [ ] **Database Backups**
  - [ ] Pre-deployment backup of neon_auth schema
  - [ ] Recovery plan if neon_auth data corrupted
  - [ ] Point-in-time restore tested

- [ ] **Schema Consistency**
  - [ ] `neon_auth` tables match Better Auth 1.4.18
  - [ ] RLS policies updated if schema changes
  - [ ] Indexes created for performance

---

## Production Deployment Steps

### 1. Pre-flight (1 hour before go-live)

```bash
# Verify all env vars are set
node scripts/validate-neon-auth-env.mjs

# Test auth flows in staging
pnpm --filter @afenda/web test:e2e:auth

# Verify email sending works
curl -X POST http://localhost:3000/api/auth/send-reset-password-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### 2. Cutover (10 minutes)

```bash
# Deploy to production
vercel deploy --prod

# Verify DNS resolves to production
nslookup app.nexuscanon.com

# Test sign-in flow manually
# 1. Go to app.nexuscanon.com/auth/signin
# 2. Create account with test@example.com
# 3. Verify email sent
# 4. Click email link and set password
# 5. Sign in
```

### 3. Post-flight (30 minutes after)

```bash
# Monitor auth error dashboard
# Check Sentry for any failures
# Verify session tokens in browser DevTools
# Test org invitation flow with colleague email
```

---

## Rollback Plan

If Neon Auth fails in production:

### Option 1: Keep Neon Database, Use Self-Hosted Better Auth

If you want to preserve data:
```typescript
// Fall back to self-hosted Better Auth
// Still uses same neon_auth schema tables
// Just run Better Auth server locally/on Railway instead
```

### Option 2: Restore from Backup

```bash
# Neon restore to pre-deployment point
neon projects restore --project-id lucky-silence-39754997 --timestamp 2026-03-12T18:00:00Z
```

### Option 3: Pause Auth Operations

```bash
# Set maintenance mode if critical issues
echo "Auth maintenance - try again in 15 minutes" > maintenance.html
```

---

## Troubleshooting

### "Neon Auth Not Configured" Error

**Symptoms:** 503 response from /api/auth/..., "NEON_AUTH_NOT_CONFIGURED"

**Causes:**
- `NEON_AUTH_BASE_URL` not set
- `NEON_AUTH_COOKIE_SECRET` not set
- Secret is not 32-byte base64

**Fix:**
```bash
# Verify env vars
echo $NEON_AUTH_BASE_URL
echo $NEON_AUTH_COOKIE_SECRET | base64 -d | wc -c  # Should be 32 bytes

# Regenerate secret if invalid
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### "Invalid Email Body" from Neon Auth

**Symptoms:** Invitations fail with auth error

**Causes:**
- Email service not configured
- SMTP credentials wrong
- Email from address doesn't match

**Fix:**
1. Go to Neon Console → Project → Auth tab
2. Test email provider:
   - Click "Test" button
   - Verify test email received
3. If failed:
   - Check SMTP host/port/credentials
   - Ensure no firewall blocks SMTP (port 465 or 587)
   - Test with `telnet smtp.zoho.com 465`

### "Session Expired" on Every Page

**Symptoms:** User logs in, immediately redirected to /auth/signin

**Causes:**
- Cookie secret mismatch
- Session TTL too short
- Neon Auth API unreachable

**Fix:**
```typescript
// In apps/web/src/lib/auth/server.ts, verify:
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!, // Must be 32 bytes
    // sessionCookie: { maxAge: 60 * 60 * 24 } // 24 hours default
  },
});
```

### "JWT Invalid" When Using Data API

**Symptoms:** Authenticated request to Data API returns 401

**Causes:**
- JWKS URL unreachable
- Token format wrong
- Clock skew between servers

**Fix:**
```bash
# Verify JWKS endpoint accessible
curl https://your-domain.neonauth.region.aws.neon.tech/neondb/auth/.well-known/jwks.json

# Check your server's clock is NTP-synced
ntpq -p

# Test JWT in debugger: jwt.io
# Paste token from browser cookie
```

---

## After Deployment

### Monitor

- [ ] **Daily** (first week):
  - Check auth error rates in Sentry
  - Verify email delivery from Zoho
  - Monitor session churn (logins vs logouts)

- [ ] **Weekly** (ongoing):
  - Review failed login attempts
  - Check slow query logs for auth tables
  - Verify backup retention policies

### Scale

As user base grows, track:
- Monthly Active Users (MAU) against plan limits
- Org member counts (should stay under 500)
- Session refresh rate (indicates timeout issues)

---

## References

- [Neon Auth Docs](https://neon.com/docs/neon-auth)
- [Better Auth 1.4.18 Docs](https://www.better-auth.com/)
- [AFENDA Organization Patterns](./adr_0005_module_architecture_restructure.md)

