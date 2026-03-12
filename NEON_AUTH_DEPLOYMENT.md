# Neon Auth Production Deployment Summary

**Status:** 🟢 Ready for Deployment  
**Date:** March 12, 2026  
**Version:** Better Auth 1.4.18 via Neon Auth

---

## What's Configured

### ✅ Code Implementation

All necessary code is **already implemented** in the codebase:

| Component | Location | Status |
|-----------|----------|--------|
| **Server Auth** | `apps/web/src/lib/auth/server.ts` | ✅ Implemented |
| **Client Auth** | `apps/web/src/lib/auth/client.ts` | ✅ Implemented |
| **API Routes** | `apps/web/src/app/api/auth/[...auth]/route.ts` | ✅ Implemented |
| **Sign In Page** | `apps/web/src/app/auth/signin/` | ✅ Implemented |
| **Sign Up Page** | `apps/web/src/app/auth/signup/` | ✅ Implemented |
| **Password Reset** | `apps/web/src/app/auth/reset-password/` | ✅ Implemented |
| **Email Verify** | `apps/web/src/app/auth/verify/` | ✅ Implemented |
| **Org Invites** | `apps/web/src/app/auth/invite/` | ✅ Implemented |

### ✅ Environment Variables

All required variables are **in .env.config**:

```env
# Neon Auth (from Neon Console)
NEON_AUTH_BASE_URL=https://ep-square-pond-a16dtub4.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=T6aNOWZ4TPcJD8wU+RTzPwMxaSolEENgVBxz/ANGO/A=
NEXT_PUBLIC_NEON_AUTH_URL=https://ep-square-pond-a16dtub4.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth
NEON_AUTH_JWKS_URL=https://ep-square-pond-a16dtub4.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth/.well-known/jwks.json

# Email
DEFAULT_FROM_EMAIL=no-reply@nexuscanon.com
DEFAULT_FROM_NAME=AFENDA
```

### ✅ Email Provider

Zoho SMTP configured and **validated**:

| Setting | Value | Status |
|---------|-------|--------|
| Host | `smtp.zoho.com` | ✅ Configured |
| Port | `465` | ✅ Configured |
| Username | `no-reply@nexuscanon.com` | ✅ **Fixed** (was "AFENDA") |
| Sender Email | `no-reply@nexuscanon.com` | ✅ Configured |
| Test Email | Sent & Received | ✅ Validated |

---

## What YOU Need To Do (Before Deployment)

### 🔴 CRITICAL: Update Organization Settings

**In Neon Console:**

1. Go to **Project → Auth tab → Organizations**
2. Update these settings:

| Setting | Current | Change To | Why |
|---------|---------|-----------|-----|
| **Org Limit** | ? | 10 | Keep as-is (reasonable ceiling) |
| **Membership Limit** | ❌ **100** | ✅ **500** | Enterprise AP teams need more capacity |
| **Creator Role** | Owner | Owner | Keep as-is (correct for audit) |
| **Email Invitations** | Enabled | Enabled | Keep as-is (required for compliance) |

**Screenshot Reference:**
- Look for the form with fields: "Limit (per user)", "Membership Limit (per org)", "Creator Role", "Email Invitations"
- Membership Limit is the **critical one** — change from 100 to 500

3. Click **"Save"** or **"Update"**

**Why Critical:** Without this change, organizations will fail after ~100 members, causing:
- Invitation failures → users can't join
- Audit access denied → compliance violations
- Production issues immediately upon scale

---

## Pre-Deployment Testing

Run these commands to validate everything is ready:

### 1. Validate Environment

```bash
node scripts/validate-neon-auth-env.mjs
```

**Expected output:** ✓ All checks passed

### 2. Run Full Checks

```bash
pnpm typecheck  # TypeScript validation
pnpm test       # Unit tests
pnpm check:all  # All 18 CI gates
```

**Expected output:** All pass (exit code 0)

### 3. Test Locally

```bash
pnpm --filter @afenda/web dev
```

Then in browser:
- Sign up: http://localhost:3000/auth/signup
- Sign in: http://localhost:3000/auth/signin
- Password reset: http://localhost:3000/auth/signin → "Forgot password?"

**Expected:** Emails sent via Zoho, sign-in/sign-up flows work

---

## Deployment Steps

### Step 1: Database Backup (Safety)

```bash
# In Neon Console → Branches → main → "..." → "Create Backup"
# Wait for confirmation email
# Save backup ID in password manager
```

### Step 2: Generate New Secrets

```bash
# Generate cookie secret (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Output: Copy to production env as NEON_AUTH_COOKIE_SECRET

# Generate challenge secret (for password reset tokens)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: Copy to production env as AUTH_CHALLENGE_SECRET
```

### Step 3: Deploy

**Option A: Git Push (Recommended)**
```bash
# Commit all changes
git add .
git commit -m "feat: production neon auth with org scaling"
git push origin main

# Vercel auto-deploys
# Check: https://vercel.com → Deployments
```

**Option B: Manual Vercel Deploy**
```bash
vercel deploy --prod
```

### Step 4: Verify Deployment

Go to https://app.nexuscanon.com:
1. Click "Sign Up"
2. Create account with test email
3. Verify email received (in your inbox or test account)
4. Click email link and set password
5. Sign in successfully

**If stuck:** See troubleshooting section below

---

## Post-Deployment Monitoring (24 Hours)

### Immediate (Next 30 minutes)

- [ ] Error dashboard (Sentry): No auth errors
- [ ] Deployment status (Vercel): ✓ Green
- [ ] Email delivery: Test sign-ups getting emails

### First Hour

- [ ] Sign-up flow: Create test account, verify email works
- [ ] Password reset: Test reset-password link works
- [ ] Session persistence: Stay logged in across page reloads

### First 6 Hours

- [ ] Error rate: Should be < 1%
- [ ] Email sent/received: Monitor Zoho logs
- [ ] Real users signing up: Monitor Neon console activity

### Daily (First Week)

- [ ] Review failed login attempts
- [ ] Check org invitation success rate
- [ ] Monitor session timeout issues
- [ ] Review any error patterns in Sentry

---

## Troubleshooting

### "503 NEON_AUTH_NOT_CONFIGURED"

**Cause:** Environment variables not set or invalid

**Fix:**
```bash
# Verify vars are set in Vercel or .env.production
echo $NEON_AUTH_BASE_URL
echo $NEON_AUTH_COOKIE_SECRET

# Regenerate if needed
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### "Email not sent" / "Invalid email body"

**Cause:** SMTP error from Zoho, usually wrong credentials

**Fix:**
1. Go to Neon Console → Auth → Email Providers
2. Check username is `no-reply@nexuscanon.com` (not "AFENDA")
3. Test email provider with "Test" button
4. Check Zoho account hasn't locked down sender email

### "Session expired immediately after login"

**Cause:** Cookie secret mismatch or wrong URL

**Fix:**
```typescript
// In apps/web/src/lib/auth/server.ts, verify:
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!, // Must match Neon Console
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!, // Must be 32 bytes
  },
});
```

Then redeploy:
```bash
pnpm build && vercel deploy --prod
```

### "Invitation limit reached" / "Org member limit 100 exceeded"

**This is the critical one we warned about!**

**Cause:** Membership limit still set to 100 in Neon Console

**Fix:**
1. Go to Neon Console → Project → Auth → Organizations
2. Change "Membership limit" from 100 to 500
3. Save
4. Retry invitation

Do this **before** deployment to avoid blocking users.

---

## Quick Reference

### Files Modified/Created

| File | Purpose |
|------|---------|
| `docs/adr/0008-neon-auth-production-deployment.md` | Full deployment guide |
| `scripts/validate-neon-auth-env.mjs` | Environment validation |
| `scripts/deployment-checklist.mjs` | Step-by-step checklist |
| `.env.config` | Environment variables (already present) |

### Commands Cheat Sheet

```bash
# Validate everything is ready
node scripts/validate-neon-auth-env.mjs

# Start local dev
pnpm --filter @afenda/web dev

# Run all checks (before deployment)
pnpm typecheck && pnpm test && pnpm check:all

# Deploy to production
vercel deploy --prod

# View deployment status
vercel ls

# Rollback if needed
vercel rollback
```

### Environment Variables (Production)

```env
# From Neon Console
NEON_AUTH_BASE_URL=https://...
NEON_AUTH_COOKIE_SECRET=<32-byte base64>
NEXT_PUBLIC_NEON_AUTH_URL=https://...
NEON_AUTH_JWKS_URL=https://...

# Email
DEFAULT_FROM_EMAIL=no-reply@nexuscanon.com

# Security (generate new)
AUTH_CHALLENGE_SECRET=<new random hex>
AUTH_EVIDENCE_SIGNING_SECRET=<new random hex>
```

---

## Success Criteria

Deployment is successful if:

- ✅ Sign-up creates Neon Auth user
- ✅ Email sent to new user
- ✅ Email link works for password set
- ✅ Sign-in creates session cookie
- ✅ Session persists across page reloads
- ✅ Sign-out clears session
- ✅ Password reset flow works end-to-end
- ✅ Org invitations send emails
- ✅ Invited users can join orgs
- ✅ No 503 or 401 errors in Sentry
- ✅ Email delivery rate > 95%
- ✅ Session token refresh < 100ms

---

## Support

If issues arise:

1. **Check Sentry dashboard** → auth errors
2. **Check Neon console** → Activity logs, schema
3. **Check Vercel logs** → Deployment errors
4. **Read troubleshooting** → See above
5. **Contact on-call** → #dev-support Slack

---

## Next Steps

1. **Update Neon Console** org membership limit (100 → 500)
2. **Run validation** `node scripts/validate-neon-auth-env.mjs`
3. **Test locally** `pnpm --filter @afenda/web dev`
4. **Deploy** `vercel deploy --prod`
5. **Monitor** First 24 hours carefully
6. **Lock down** after 24h (can't rollback production DB changes)

**Estimated time:** 45 minutes (10 min Neon config + 15 min testing + 20 min deployment + post-flight)

**Approval needed:** ✅ Use this checklist as approval
