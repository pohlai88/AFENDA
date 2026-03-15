# Auth UI Layer Matrix (AFENDA)

This matrix defines mandatory dark-surface depth mapping for the auth ecosystem.

## Surface model

- L0: Atmosphere/background recesses (`--surface-0` to `--surface-75`)
- L1: Operating surfaces (`--surface-100` to `--surface-250`)
- L2: Elevated content surfaces (`--surface-275` to `--surface-350`)
- L3: Floating context (`--surface-375` to `--surface-425`)
- L4: Modal/blocking overlays (`--surface-450` to `--surface-500`)

## Route to layer mapping

| Route | Main component | Layer contract |
| --- | --- | --- |
| `/auth/sign-in` | `EmailAuthPanel` | Shell: L0->L1 gradient, panel card: L2, feedback states: semantic overlays |
| `/auth/sign-up` | `EmailAuthPanel` | Shell: L0->L1 gradient, panel card: L2, feedback states: semantic overlays |
| `/auth/sign-in-otp` | `EmailOtpSignInPanel` | Shell: L0->L1 gradient, panel card: L2 |
| `/auth/forgot-password` | `ForgotPasswordPanel` | Shell: L0->L1 gradient, panel card: L2 |
| `/auth/reset-password` | `ResetPasswordPanel` | Shell: L0->L1 gradient, panel card: L2 |
| `/auth/verify-email` | `VerifyEmailPanel` | Shell: L0->L1 gradient, panel card: L2, success/error feedback semantic |
| `/auth/select-organization` | `OrganizationSelectorClient` | Shell: L0->L1 gradient, panel card: L2, item rows: L1/L2-adjacent |
| `/auth/post-sign-in` | `PostSignInGateClient` | Shell: L0->L1 gradient, panel card: L2 |
| `/auth/sign-out` | `SignOutPanel` | Shell: L0->L1 gradient, panel card: L2 |

## Component token contract

| UI element | Required token source |
| --- | --- |
| Auth shell background | `--surface-0` plus gradual move toward `--surface-100` |
| Info tiles in shell | `--surface-200` with `--border-subtle` |
| Auth panel card | Shared style: `authCardSurfaceStyle` (`--surface-300`, `--border`, `--elev-2-shadow`) |
| Panel footer border | Shared style: `authCardFooterStyle` (`--border-subtle`) |
| Error feedback blocks | Shared style: `authFeedbackErrorStyle` (`--destructive-soft`, `--border-danger`, `--destructive`) |
| Success feedback blocks | Shared style: `authFeedbackSuccessStyle` (`--success-soft`, `--border-success`, `--success`) |
| Informational feedback blocks | Shared style: `authFeedbackInfoStyle` (`--overlay-interactive`, `--border-interactive`) |

## Non-negotiable rules

1. No raw color literals in auth TSX (`#hex`, `rgb()`, `hsl()`, `oklch()`).
2. Card-based auth panels must use `authCardSurfaceStyle`, unless explicitly exempted with `auth-surface-exempt` comment.
3. No L4 surfaces in normal auth pages (only modal/critical overlays may use L4).
4. Do not use chart/viz tokens for auth semantics.

## Lightweight enforcement

Run this check before committing auth UI changes:

```bash
node tools/gates/auth-design-system.mjs
```

The gate validates:

- no literal colors in `apps/web/src/app/auth/**/*.tsx`
- card-based auth components use shared auth surface style
- matrix doc presence
