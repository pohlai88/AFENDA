/**
 * Identity and Access Management (IAM) error codes.
 *
 * RULES:
 *   1. All codes prefixed with IAM_
 *   2. Naming convention: IAM_NOUN_REASON (SCREAMING_SNAKE_CASE)
 *   3. Removing or renaming a code is a BREAKING CHANGE
 */
import { z } from "zod";

// ─── IAM Authentication Error Codes ───────────────────────────────────────────
export const IAM_INVALID_CREDENTIALS = "IAM_INVALID_CREDENTIALS" as const;
export const IAM_CREDENTIALS_INVALID = "IAM_CREDENTIALS_INVALID" as const; // Alias for backward compatibility
export const IAM_SESSION_EXPIRED = "IAM_SESSION_EXPIRED" as const;
export const IAM_TOKEN_INVALID = "IAM_TOKEN_INVALID" as const;
export const IAM_TOKEN_EXPIRED = "IAM_TOKEN_EXPIRED" as const;
export const IAM_RESET_TOKEN_INVALID = "IAM_RESET_TOKEN_INVALID" as const;
export const IAM_RESET_TOKEN_EXPIRED = "IAM_RESET_TOKEN_EXPIRED" as const;
export const IAM_SESSION_GRANT_INVALID = "IAM_SESSION_GRANT_INVALID" as const;
export const IAM_SESSION_GRANT_EXPIRED = "IAM_SESSION_GRANT_EXPIRED" as const;

// ─── IAM Authorization Error Codes ────────────────────────────────────────────
export const IAM_INSUFFICIENT_PERMISSIONS = "IAM_INSUFFICIENT_PERMISSIONS" as const;
export const IAM_PERMISSION_NOT_FOUND = "IAM_PERMISSION_NOT_FOUND" as const;

// ─── IAM User Error Codes ─────────────────────────────────────────────────────
export const IAM_USER_NOT_FOUND = "IAM_USER_NOT_FOUND" as const;
export const IAM_USER_ALREADY_EXISTS = "IAM_USER_ALREADY_EXISTS" as const;
export const IAM_USER_INACTIVE = "IAM_USER_INACTIVE" as const;
export const IAM_USER_SUSPENDED = "IAM_USER_SUSPENDED" as const;
export const IAM_EMAIL_ALREADY_REGISTERED = "IAM_EMAIL_ALREADY_REGISTERED" as const;
export const IAM_PASSWORD_CHANGE_INVALID = "IAM_PASSWORD_CHANGE_INVALID" as const;
export const IAM_ACCOUNT_LOCKED = "IAM_ACCOUNT_LOCKED" as const;

// ─── IAM Role Error Codes ─────────────────────────────────────────────────────
export const IAM_ROLE_NOT_FOUND = "IAM_ROLE_NOT_FOUND" as const;
export const IAM_ROLE_ALREADY_EXISTS = "IAM_ROLE_ALREADY_EXISTS" as const;
export const IAM_ROLE_PERMISSION_CONFLICT = "IAM_ROLE_PERMISSION_CONFLICT" as const;

// ─── IAM Organization Error Codes ─────────────────────────────────────────────
export const IAM_ORG_NOT_FOUND = "IAM_ORG_NOT_FOUND" as const;
export const IAM_ORG_USER_NOT_MEMBER = "IAM_ORG_USER_NOT_MEMBER" as const;
export const IAM_PRINCIPAL_NOT_FOUND = "IAM_PRINCIPAL_NOT_FOUND" as const;

// ─── IAM Portal/Invitation Error Codes ────────────────────────────────────────
export const IAM_PORTAL_ACCESS_DENIED = "IAM_PORTAL_ACCESS_DENIED" as const;
export const IAM_PORTAL_INVITATION_REQUIRED = "IAM_PORTAL_INVITATION_REQUIRED" as const;
export const IAM_PORTAL_INVITATION_INVALID = "IAM_PORTAL_INVITATION_INVALID" as const;
export const IAM_PORTAL_INVITATION_EXPIRED = "IAM_PORTAL_INVITATION_EXPIRED" as const;

// ─── IAM MFA Error Codes ──────────────────────────────────────────────────────
export const IAM_MFA_REQUIRED = "IAM_MFA_REQUIRED" as const;
export const IAM_MFA_INVALID_CODE = "IAM_MFA_INVALID_CODE" as const;
export const IAM_MFA_NOT_ENABLED = "IAM_MFA_NOT_ENABLED" as const;
export const IAM_MFA_INVALID = "IAM_MFA_INVALID" as const;
export const IAM_MFA_NOT_IMPLEMENTED = "IAM_MFA_NOT_IMPLEMENTED" as const;

// ─── IAM Error Code Array ─────────────────────────────────────────────────────
export const IamErrorCodeValues = [
  // Authentication
  IAM_INVALID_CREDENTIALS,
  IAM_CREDENTIALS_INVALID,
  IAM_SESSION_EXPIRED,
  IAM_TOKEN_INVALID,
  IAM_TOKEN_EXPIRED,
  IAM_RESET_TOKEN_INVALID,
  IAM_RESET_TOKEN_EXPIRED,
  IAM_SESSION_GRANT_INVALID,
  IAM_SESSION_GRANT_EXPIRED,

  // Authorization
  IAM_INSUFFICIENT_PERMISSIONS,
  IAM_PERMISSION_NOT_FOUND,

  // Users
  IAM_USER_NOT_FOUND,
  IAM_USER_ALREADY_EXISTS,
  IAM_USER_INACTIVE,
  IAM_USER_SUSPENDED,
  IAM_EMAIL_ALREADY_REGISTERED,
  IAM_PASSWORD_CHANGE_INVALID,
  IAM_ACCOUNT_LOCKED,

  // Roles
  IAM_ROLE_NOT_FOUND,
  IAM_ROLE_ALREADY_EXISTS,
  IAM_ROLE_PERMISSION_CONFLICT,

  // Organizations
  IAM_ORG_NOT_FOUND,
  IAM_ORG_USER_NOT_MEMBER,
  IAM_PRINCIPAL_NOT_FOUND,

  // Portal/Invitations
  IAM_PORTAL_ACCESS_DENIED,
  IAM_PORTAL_INVITATION_REQUIRED,
  IAM_PORTAL_INVITATION_INVALID,
  IAM_PORTAL_INVITATION_EXPIRED,

  // MFA
  IAM_MFA_REQUIRED,
  IAM_MFA_INVALID_CODE,
  IAM_MFA_NOT_ENABLED,
  IAM_MFA_INVALID,
  IAM_MFA_NOT_IMPLEMENTED,
] as const;

export const IamErrorCodeSchema = z.enum(IamErrorCodeValues);
export type IamErrorCode = z.infer<typeof IamErrorCodeSchema>;
