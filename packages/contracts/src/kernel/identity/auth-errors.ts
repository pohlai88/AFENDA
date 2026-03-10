/**
 * Auth Error Messages — Centralized error message mapping for authentication flows
 * 
 * Maps error codes from NextAuth, Better Auth, and AFENDA IAM system to
 * user-friendly messages displayed in auth forms.
 * 
 * Error code sources:
 * - NextAuth errors: CredentialsSignin, OAuthSignin, etc.
 * - IAM errors: IAM_CREDENTIALS_INVALID, IAM_PORTAL_*, etc.
 * - Auth transport: AUTH_UPSTREAM_UNAVAILABLE, AUTH_INVALID_RESPONSE
 * 
 * Usage:
 * ```ts
 * import { AUTH_ERROR_MESSAGES } from "./auth-errors";
 * const message = AUTH_ERROR_MESSAGES[errorCode] ?? AUTH_ERROR_MESSAGES.Default;
 * ```
 */

export const AUTH_ERROR_MESSAGES = {
  // ── NextAuth standard errors ──
  CredentialsSignin: "Invalid email or password.",
  OAuthSignin: "Unable to sign in with OAuth provider.",
  OAuthCallback: "OAuth callback error. Please try again.",
  OAuthCreateAccount: "Could not create OAuth account.",
  EmailCreateAccount: "Could not create email account.",
  Callback: "Authentication callback error.",
  OAuthAccountNotLinked: "This email is already associated with another account.",
  EmailSignin: "Unable to send sign-in email.",
  SessionRequired: "Please sign in to access this page.",

  // ── AFENDA IAM errors ──
  IAM_CREDENTIALS_INVALID: "Invalid email or password.",
  IAM_ACCOUNT_LOCKED: "Your account has been locked. Contact support.",
  IAM_ACCOUNT_SUSPENDED: "Your account is suspended. Contact support.",
  IAM_ACCOUNT_NOT_FOUND: "No account found with this email.",
  IAM_EMAIL_NOT_VERIFIED: "Please verify your email before signing in.",
  IAM_MFA_REQUIRED: "Multi-factor authentication required.",
  IAM_MFA_INVALID: "Invalid verification code.",

  // ── Portal-specific errors ──
  IAM_PORTAL_INVITATION_REQUIRED:
    "This portal account is not activated yet. Accept your invitation first.",
  IAM_PORTAL_INVITATION_EXPIRED:
    "Your portal invitation has expired. Ask your administrator for a new invitation.",
  IAM_PORTAL_INVITATION_INVALID:
    "Invitation token is invalid. Please request a fresh invitation.",
  IAM_PORTAL_ACCESS_DENIED: "You do not have access to this portal.",
  IAM_EMAIL_ALREADY_REGISTERED:
    "An account already exists for this email. Sign in from the portal sign-in page.",
  AUTH_PORTAL_TYPE_UNSUPPORTED: "Portal type is not supported for this invitation.",
  AUTH_PORTAL_ACCEPT_FAILED: "Failed to accept invitation. Please try again.",

  // ── Auth transport errors ──
  AUTH_UPSTREAM_UNAVAILABLE: "Authentication service is temporarily unavailable. Please try again.",
  AUTH_INVALID_RESPONSE: "Authentication failed due to an invalid server response.",
  AUTH_NETWORK_ERROR: "Network error. Check your connection and try again.",
  AUTH_TIMEOUT: "Authentication request timed out. Please try again.",

  // ── Validation errors ──
  VALIDATION_EMAIL_INVALID: "Please enter a valid email address.",
  VALIDATION_EMAIL_REQUIRED: "Please enter the account email.",
  VALIDATION_PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  VALIDATION_PASSWORD_WEAK: "Password is too weak. Use letters, numbers, and symbols.",
  VALIDATION_CODE_REQUIRED: "Please enter the 6-digit code.",
  VALIDATION_TOKEN_REQUIRED: "Please enter the reset token.",

  // ── Auth flow errors ──
  AUTH_SIGNUP_FAILED: "Unable to create account. Please try again.",
  AUTH_RESET_REQUEST_FAILED: "Failed to send reset instructions. Please try again.",
  AUTH_RESET_FAILED: "Failed to reset password. Please try again.",

  // ── Rate limiting ──
  AUTH_RATE_LIMIT_EXCEEDED: "Too many attempts. Please try again in a few minutes.",

  // ── Generic fallback ──
  Default: "An error occurred during sign in. Please try again.",
} as const;

/**
 * Type guard to check if an error code exists in the registry
 */
export function isKnownAuthError(code: string): code is keyof typeof AUTH_ERROR_MESSAGES {
  return code in AUTH_ERROR_MESSAGES;
}

/**
 * Get user-friendly error message for an error code
 * @param code - Error code from auth provider or IAM system
 * @returns User-friendly error message
 */
export function getAuthErrorMessage(code?: string | null): string {
  if (!code) {
    return AUTH_ERROR_MESSAGES.Default;
  }
  return (AUTH_ERROR_MESSAGES[code as keyof typeof AUTH_ERROR_MESSAGES] ?? AUTH_ERROR_MESSAGES.Default) as string;
}
