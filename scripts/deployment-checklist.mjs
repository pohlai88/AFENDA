#!/usr/bin/env node

/**
 * AFENDA Neon Auth Production Deployment Checklist
 *
 * Print this out and check boxes as you complete each step.
 * Estimated time: 45 minutes total
 *
 * Color codes:
 * 🔵 Blue = Prerequisites (must complete first)
 * 🟢 Green = Configuration (can run in parallel)
 * 🟡 Yellow = Testing (must pass before deployment)
 * 🔴 Red = Deployment (point of no return)
 * 🟣 Purple = Post-flight (after go-live)
 */

const checklist = `
╔════════════════════════════════════════════════════════════════════════════╗
║                AFENDA NEON AUTH PRODUCTION DEPLOYMENT                     ║
║                          🚀 Ready to Deploy                              ║
╚════════════════════════════════════════════════════════════════════════════╝

🔵 PREREQUISITES (Complete 1-3 first)
─────────────────────────────────────────────────────────────────────────────

  [ ] 1. Backup Neon Database
      │
      └─ Go to Neon Console → Project → Branches → main
         • Click "..." menu → "Create backup"
         • Wait for backup to complete (check email confirmation)
         • Save backup ID in password manager
      
      Why: Safety net if neon_auth schema corrupted during deployment

  [ ] 2. Generate New Cookie Secret
      │
      └─ Run in terminal:
         
         node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
         
         Copy output → Save to .env.local as NEON_AUTH_COOKIE_SECRET
      
      Why: 32-byte secret required for session encryption

  [ ] 3. Verify Neon Auth is Provisioned
      │
      └─ Go to Neon Console → Project → Auth tab
         • Check neon_auth schema exists in database
         • Verify users, sessions, accounts tables exist
         • Record NEON_AUTH_BASE_URL (copy from Console)
      
      Why: Neon Auth must be provisioned before deployment

🟢 CONFIGURATION (Can run in parallel, ~10 min)
─────────────────────────────────────────────────────────────────────────────

  [ ] 4. Update Organization Settings in Neon Console
      │
      └─ Go to Neon Console → Project → Auth → Organizations tab
      
         ┌── Org Limits Settings ───────────────────┐
         │ [ ] Limit per user: 10                   │
         │ [ ] Membership limit per org: 500 ·······│ (CRITICAL: change from 100)
         │ [ ] Creator role: Owner                  │
         │ [ ] Email invitations: Enabled           │
         │ [ ] Click "Save"                         │
         └─────────────────────────────────────────┘
      
      Why: Enterprise teams need 500+ member capacity; 100 will cause failures

  [ ] 5. Verify Email Provider Configuration
      │
      └─ Go to Neon Console → Project → Auth → Email Providers tab
      
         ┌── Email Provider Settings ──────────────┐
         │ Type: Custom SMTP provider              │
         │ Host: smtp.zoho.com                     │
         │ Port: 465                               │
         │ Username: no-reply@nexuscanon.com *     │ (Full email, not "AFENDA")
         │ Password: ••••••••••                     │
         │ Sender email: no-reply@nexuscanon.com   │
         │ Sender name: AFENDA                     │
         │                                         │
         │ [ ] Click "Test Email"                  │
         │ [ ] Verify test email received          │
         └─────────────────────────────────────────┘
      
      Why: Email is used for password resets and org invitations
      If test fails: Check Zoho password, port 465 not blocked, sender email verified

  [ ] 6. Copy Environment Variables to Production
      │
      └─ Source files:
         • NEON_AUTH_BASE_URL → Neon Console Auth tab
         • NEON_AUTH_COOKIE_SECRET → Just generated (step 2)
         • NEXT_PUBLIC_NEON_AUTH_URL → Same as base URL
         • NEON_AUTH_JWKS_URL → ${BASE_URL}/.well-known/jwks.json
      
         Destination:
         • Vercel: Settings → Environment Variables
         • Or: Update .env.production before build
      
      Why: App needs these to connect to Neon Auth at runtime

  [ ] 7. Update Session Secret (Auth Challenge)
      │
      └─ Run in terminal:
         
         node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
         
         Update: AUTH_CHALLENGE_SECRET in .env.production
         (Also: AUTH_EVIDENCE_SIGNING_SECRET for audit logs)
      
      Why: Used for challenge tokens (password reset, MFA, invite links)

🟡 TESTING (Must pass before deployment, ~15 min)
─────────────────────────────────────────────────────────────────────────────

  [ ] 8. Run Environment Validation
      │
      └─ In terminal:
         
         node scripts/validate-neon-auth-env.mjs
         
         Expected output: "✓ All checks passed!"
      
      Why: Prevents 503 errors on deployment

  [ ] 9. Test Sign-Up Flow (Local)
      │
      └─ Start dev server:
         
         pnpm --filter @afenda/web dev
         
         • Navigate to http://localhost:3000/auth/signup
         • Create account with test+prod@nexuscanon.com
         • Verify email received in test inbox
         • Click email link
         • Set password
         • Sign in
        
         Expected: Redirects to dashboard, session cookie set
      
      Why: Catches config errors before production

  [ ] 10. Test Password Reset Flow (Local)
       │
       └─ • Go to http://localhost:3000/auth/signin
          • Click "Forgot password?"
          • Enter test+prod@nexuscanon.com
          • Check email for reset link
          • Click reset link
          • Set new password
          • Sign in with new password
       
          Expected: Password changes, can sign in with new one

  [ ] 11. Test Organization Invitation (Local)
       │
       └─ • Sign up two accounts: alice@example.com, bob@example.com
          • As Alice: Create org "Test Corp"
          • As Alice: Invite Bob (bob@example.com)
          • Check Bob's email for invite link
          • As Bob: Click invite link, accept
          • Verify Bob now member of "Test Corp"
       
          Expected: Org roles, audit logs created

  [ ] 12. Build Staging Release
       │
       └─ In terminal:
         
         pnpm build
         pnpm check:all
         
         Expected: No errors, all CI gates pass
      
      Why: Catches TypeScript, ESLint, and gate violations

  [ ] 13. Deploy to Staging
       │
       └─ git add . && git commit -m "feat: production neon auth"
          git push origin main
          
          Wait for Vercel staging deployment to complete
          Check: https://staging-app.nexuscanon.com/auth/signin loads
       
      Why: Last chance to test real deployment before production

  [ ] 14. Smoke Test in Staging
       │
       └─ • Sign up in staging: stage-test@example.com
          • Verify email delivery
          • Sign in
          • Create org
          • Invite colleague
          • Check audit logs via API
         
          Expected: All flows work as local

🔴 DEPLOYMENT (Point of no return, ~5 min)
─────────────────────────────────────────────────────────────────────────────

  [ ] 15. Final Pre-Deployment Checklist
       │
       └─ Confirm:
          [ ] Neon backup created (step 1)
          [ ] Email tests passed (step 5)
          [ ] All CI gates pass (step 12)
          [ ] Staging tests passed (step 14)
          [ ] Team is ready (notify #devops)
          [ ] Maintenance window approved (post to #general)
       
      Why: Prevents accidental deployment

  [ ] 16. Deploy to Production
       │
       └─ Option A (Git push):
          git tag v1.0.0-prod-auth
          git push origin v1.0.0-prod-auth
          # Vercel auto-deploys on tag
          
          Option B (Manual Vercel deploy):
          vercel deploy --prod
          
          Wait for deployment to complete (~2 min)
          Check: https://app.nexuscanon.com/auth/signin loads
       
      Why: Initiates production deployment

  [ ] 17. Verify Production Deployment
       │
       └─ • Check Vercel deployment dashboard shows ✓ green
          • Check https://app.nexuscanon.com responds
          • Check https://app.nexuscanon.com/auth/signin loads
          • Check no 503 errors in Sentry
       
          If any red flags: See rollback procedures below

🟣 POST-FLIGHT (After go-live, ~5 min, then monitor 24h)
─────────────────────────────────────────────────────────────────────────────

  [ ] 18. Test Production Sign-Up
       │
       └─ • Go to https://app.nexuscanon.com/auth/signup
          • Create account: prod-test@nexuscanon.com
          • Verify email sent (check Zoho logs in SMTP)
          • Click email link in production email
          • Set password
          • Sign in
       
          Expected: Works exactly like staging

  [ ] 19. Monitor Error Dashboard (First 30 min)
       │
       └─ • Open Sentry dashboard
          • Filter to "neon-auth" or "auth" events
          • Check: No new error spikes
          • Check: Error rate < 1%
          • Check: No 503 "NEON_AUTH_NOT_CONFIGURED" errors
        
          If errors found: See troubleshooting section in ADR-0008

  [ ] 20. Verify Email Delivery (First hour)
       │
       └─ • Check Zoho email logs
          • Confirm sign-up emails sent successfully
          • Confirm reset-password emails deliverable
          • Check spam folder for false positives
       
          If emails missing/blocked: Check SPF/DKIM records

  [ ] 21. Post to #general
       │
       └─ Message template:
          
          ✅ Neon Auth production deployment complete!
          
          • Sign-up/login/password-reset flows live
          • Org invitations enabled (100+ member support)
          • Email sending: no-reply@nexuscanon.com via Zoho
          • Issues? #dev-support / Sentry alerts enabled
          
          Backup created: [backup ID from step 1]

  [ ] 22. Schedule 24h Monitoring
       │
       └─ Set reminders:
          • 6h: Check error rates again
          • 12h: Verify auth metrics still healthy
          • 24h: Lock down deployment (can't rollback data after 24h)
       
          Metrics to track:
          • Auth error rate (should be < 1%)
          • Email delivery rate (should be > 95%)
          • Session token refresh time (should be < 100ms)

═════════════════════════════════════════════════════════════════════════════════

🚨 IF SOMETHING BREAKS

Quick Rollback (< 5 minutes):

  1. Go to Vercel Dashboard
  2. Click "Deployments" tab
  3. Find previous working deployment (before this one)
  4. Click "..." → "Rollback to this deployment"
  5. Confirm
  
  ✓ Users redirected to old working version
  ✗ New neon_auth data created during incident is lost
  
  Estimated data loss: 30 min of sign-ups = ~5-10 users

Restore from Backup (if data corruption):

  1. Go to Neon Console → Branches
  2. Click "..." on main branch → "Restore"
  3. Select backup from step 1
  4. Confirm (WARNING: Rolls back entire database, all tables)
  5. Wait ~5 minutes for restore
  6. Re-deploy app

  Data loss: Everything since step 1 backup time
  
Database-Only Rollback (if auth schema corrupted):

  1. Check backup integrity: neon_auth schema tables exist
  2. Run in Neon:
     
     DROP SCHEMA IF EXISTS neon_auth CASCADE;
     -- Re-provision Neon Auth from backup
  
  3. This is why we have backups!

═════════════════════════════════════════════════════════════════════════════════

📞 SUPPORT CONTACTS

  • Neon Support: https://neon.tech/contact
  • Zoho SMTP Issues: support@zoho.com
  • App Errors: Check #dev-support Slack channel
  • On-call engineer: [On-call schedule from PagerDuty]

═════════════════════════════════════════════════════════════════════════════════

Estimated total time: 45 minutes
Recommended window: Off-peak hours (2am-4am UTC)
Team size: 1 engineer minimum (2 recommended for safety)
`;

console.log(checklist);

// Print checklist to file for printing
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(__dirname, "../DEPLOYMENT_CHECKLIST.txt");

writeFileSync(outputPath, checklist, "utf-8");
console.log(`\n✓ Checklist saved to: ${outputPath}`);
console.log("  Print this file: lp DEPLOYMENT_CHECKLIST.txt");
