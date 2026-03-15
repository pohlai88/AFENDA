/**
 * Communication (comm) error codes.
 *
 * RULES:
 *   1. All codes prefixed with COMM_ or DOC_
 *   2. Naming convention: COMM_NOUN_REASON (SCREAMING_SNAKE_CASE)
 *   3. Removing or renaming a code is a BREAKING CHANGE
 */
import { z } from "zod";

// ─── Comm Notification Error Codes ────────────────────────────────────────────
export const COMM_NOTIFICATION_NOT_FOUND = "COMM_NOTIFICATION_NOT_FOUND" as const;
export const COMM_NOTIFICATION_ALREADY_READ = "COMM_NOTIFICATION_ALREADY_READ" as const;
export const COMM_NOTIFICATION_ALREADY_DISMISSED = "COMM_NOTIFICATION_ALREADY_DISMISSED" as const;

// ─── Comm Email Error Codes ───────────────────────────────────────────────────
export const COMM_EMAIL_SEND_FAILED = "COMM_EMAIL_SEND_FAILED" as const;
export const COMM_EMAIL_INVALID_ADDRESS = "COMM_EMAIL_INVALID_ADDRESS" as const;
export const COMM_EMAIL_TEMPLATE_NOT_FOUND = "COMM_EMAIL_TEMPLATE_NOT_FOUND" as const;
export const COMM_EMAIL_TEMPLATE_RENDER_ERROR = "COMM_EMAIL_TEMPLATE_RENDER_ERROR" as const;

// ─── Comm Webhook Error Codes ─────────────────────────────────────────────────
export const COMM_WEBHOOK_NOT_FOUND = "COMM_WEBHOOK_NOT_FOUND" as const;
export const COMM_WEBHOOK_ALREADY_ACTIVE = "COMM_WEBHOOK_ALREADY_ACTIVE" as const;
export const COMM_WEBHOOK_DELIVERY_FAILED = "COMM_WEBHOOK_DELIVERY_FAILED" as const;
export const COMM_WEBHOOK_SIGNATURE_MISMATCH = "COMM_WEBHOOK_SIGNATURE_MISMATCH" as const;
export const COMM_WEBHOOK_MAX_RETRIES_EXCEEDED = "COMM_WEBHOOK_MAX_RETRIES_EXCEEDED" as const;

// ─── Comm Document (Knowledge Base) Error Codes ───────────────────────────────
export const COMM_DOCUMENT_NOT_FOUND = "COMM_DOCUMENT_NOT_FOUND" as const;
export const COMM_DOCUMENT_SLUG_EXISTS = "COMM_DOCUMENT_SLUG_EXISTS" as const;
export const COMM_DOCUMENT_ALREADY_PUBLISHED = "COMM_DOCUMENT_ALREADY_PUBLISHED" as const;
export const COMM_DOCUMENT_ALREADY_ARCHIVED = "COMM_DOCUMENT_ALREADY_ARCHIVED" as const;
export const COMM_DOCUMENT_VERSION_NOT_FOUND = "COMM_DOCUMENT_VERSION_NOT_FOUND" as const;
export const COMM_DOCUMENT_VERSION_ALREADY_PUBLISHED =
  "COMM_DOCUMENT_VERSION_ALREADY_PUBLISHED" as const;

// ─── Comm Subscription Error Codes ────────────────────────────────────────────
export const COMM_SUBSCRIPTION_NOT_FOUND = "COMM_SUBSCRIPTION_NOT_FOUND" as const;
export const COMM_SUBSCRIPTION_ALREADY_ACTIVE = "COMM_SUBSCRIPTION_ALREADY_ACTIVE" as const;
export const COMM_SUBSCRIPTION_ALREADY_UNSUBSCRIBED =
  "COMM_SUBSCRIPTION_ALREADY_UNSUBSCRIBED" as const;

// ─── Comm Preference Error Codes ──────────────────────────────────────────────
export const COMM_PREFERENCE_NOT_FOUND = "COMM_PREFERENCE_NOT_FOUND" as const;
export const COMM_PREFERENCE_ALREADY_EXISTS = "COMM_PREFERENCE_ALREADY_EXISTS" as const;
export const COMM_PREFERENCE_INVALID_CHANNEL = "COMM_PREFERENCE_INVALID_CHANNEL" as const;

// ─── Comm Comment Error Codes ─────────────────────────────────────────────────
export const COMM_COMMENT_NOT_FOUND = "COMM_COMMENT_NOT_FOUND" as const;
export const COMM_COMMENT_ALREADY_DELETED = "COMM_COMMENT_ALREADY_DELETED" as const;
export const COMM_COMMENT_EDIT_WINDOW_EXPIRED = "COMM_COMMENT_EDIT_WINDOW_EXPIRED" as const;

// ─── Comm Thread Error Codes ──────────────────────────────────────────────────
export const COMM_THREAD_NOT_FOUND = "COMM_THREAD_NOT_FOUND" as const;
export const COMM_THREAD_ALREADY_CLOSED = "COMM_THREAD_ALREADY_CLOSED" as const;
export const COMM_THREAD_ALREADY_RESOLVED = "COMM_THREAD_ALREADY_RESOLVED" as const;

// ─── Comm Mention Error Codes ─────────────────────────────────────────────────
export const COMM_MENTION_NOT_FOUND = "COMM_MENTION_NOT_FOUND" as const;
export const COMM_MENTION_USER_NOT_FOUND = "COMM_MENTION_USER_NOT_FOUND" as const;

// ─── Comm Reaction Error Codes ────────────────────────────────────────────────
export const COMM_REACTION_NOT_FOUND = "COMM_REACTION_NOT_FOUND" as const;
export const COMM_REACTION_ALREADY_EXISTS = "COMM_REACTION_ALREADY_EXISTS" as const;

// ─── Comm Delivery Error Codes ────────────────────────────────────────────────
export const COMM_DELIVERY_NOT_FOUND = "COMM_DELIVERY_NOT_FOUND" as const;
export const COMM_DELIVERY_ALREADY_SENT = "COMM_DELIVERY_ALREADY_SENT" as const;
export const COMM_DELIVERY_FAILED = "COMM_DELIVERY_FAILED" as const;
export const COMM_DELIVERY_BOUNCED = "COMM_DELIVERY_BOUNCED" as const;
export const COMM_DELIVERY_RATE_LIMITED = "COMM_DELIVERY_RATE_LIMITED" as const;

// ─── Comm Channel Error Codes ─────────────────────────────────────────────────
export const COMM_CHANNEL_NOT_CONFIGURED = "COMM_CHANNEL_NOT_CONFIGURED" as const;
export const COMM_CHANNEL_DISABLED = "COMM_CHANNEL_DISABLED" as const;

// ─── Comm Template Error Codes ────────────────────────────────────────────────
export const COMM_TEMPLATE_NOT_FOUND = "COMM_TEMPLATE_NOT_FOUND" as const;
export const COMM_TEMPLATE_COMPILATION_FAILED = "COMM_TEMPLATE_COMPILATION_FAILED" as const;
export const COMM_TEMPLATE_MISSING_VARIABLE = "COMM_TEMPLATE_MISSING_VARIABLE" as const;

// ─── Comm Broadcast Error Codes ───────────────────────────────────────────────
export const COMM_BROADCAST_NOT_FOUND = "COMM_BROADCAST_NOT_FOUND" as const;
export const COMM_BROADCAST_ALREADY_SENT = "COMM_BROADCAST_ALREADY_SENT" as const;
export const COMM_BROADCAST_RECIPIENT_LIST_EMPTY = "COMM_BROADCAST_RECIPIENT_LIST_EMPTY" as const;

// ─── Comm Attachment Error Codes ──────────────────────────────────────────────
export const COMM_ATTACHMENT_NOT_FOUND = "COMM_ATTACHMENT_NOT_FOUND" as const;
export const COMM_ATTACHMENT_TOO_LARGE = "COMM_ATTACHMENT_TOO_LARGE" as const;
export const COMM_ATTACHMENT_UNSUPPORTED_TYPE = "COMM_ATTACHMENT_UNSUPPORTED_TYPE" as const;

// ─── Comm Boardroom Resolution Error Codes ───────────────────────────────────
export const COMM_RESOLUTION_IS_WITHDRAWN = "COMM_RESOLUTION_IS_WITHDRAWN" as const;
export const COMM_RESOLUTION_IS_FINALIZED = "COMM_RESOLUTION_IS_FINALIZED" as const;

// ─── Comm Error Code Array ────────────────────────────────────────────────────
export const CommErrorCodeValues = [
  // Notifications
  COMM_NOTIFICATION_NOT_FOUND,
  COMM_NOTIFICATION_ALREADY_READ,
  COMM_NOTIFICATION_ALREADY_DISMISSED,

  // Email
  COMM_EMAIL_SEND_FAILED,
  COMM_EMAIL_INVALID_ADDRESS,
  COMM_EMAIL_TEMPLATE_NOT_FOUND,
  COMM_EMAIL_TEMPLATE_RENDER_ERROR,

  // Webhooks
  COMM_WEBHOOK_NOT_FOUND,
  COMM_WEBHOOK_ALREADY_ACTIVE,
  COMM_WEBHOOK_DELIVERY_FAILED,
  COMM_WEBHOOK_SIGNATURE_MISMATCH,
  COMM_WEBHOOK_MAX_RETRIES_EXCEEDED,

  // Documents (Knowledge Base)
  COMM_DOCUMENT_NOT_FOUND,
  COMM_DOCUMENT_SLUG_EXISTS,
  COMM_DOCUMENT_ALREADY_PUBLISHED,
  COMM_DOCUMENT_ALREADY_ARCHIVED,
  COMM_DOCUMENT_VERSION_NOT_FOUND,
  COMM_DOCUMENT_VERSION_ALREADY_PUBLISHED,

  // Subscriptions
  COMM_SUBSCRIPTION_NOT_FOUND,
  COMM_SUBSCRIPTION_ALREADY_ACTIVE,
  COMM_SUBSCRIPTION_ALREADY_UNSUBSCRIBED,

  // Preferences
  COMM_PREFERENCE_NOT_FOUND,
  COMM_PREFERENCE_ALREADY_EXISTS,
  COMM_PREFERENCE_INVALID_CHANNEL,

  // Comments
  COMM_COMMENT_NOT_FOUND,
  COMM_COMMENT_ALREADY_DELETED,
  COMM_COMMENT_EDIT_WINDOW_EXPIRED,

  // Threads
  COMM_THREAD_NOT_FOUND,
  COMM_THREAD_ALREADY_CLOSED,
  COMM_THREAD_ALREADY_RESOLVED,

  // Mentions
  COMM_MENTION_NOT_FOUND,
  COMM_MENTION_USER_NOT_FOUND,

  // Reactions
  COMM_REACTION_NOT_FOUND,
  COMM_REACTION_ALREADY_EXISTS,

  // Delivery
  COMM_DELIVERY_NOT_FOUND,
  COMM_DELIVERY_ALREADY_SENT,
  COMM_DELIVERY_FAILED,
  COMM_DELIVERY_BOUNCED,
  COMM_DELIVERY_RATE_LIMITED,

  // Channels
  COMM_CHANNEL_NOT_CONFIGURED,
  COMM_CHANNEL_DISABLED,

  // Templates
  COMM_TEMPLATE_NOT_FOUND,
  COMM_TEMPLATE_COMPILATION_FAILED,
  COMM_TEMPLATE_MISSING_VARIABLE,

  // Broadcasts
  COMM_BROADCAST_NOT_FOUND,
  COMM_BROADCAST_ALREADY_SENT,
  COMM_BROADCAST_RECIPIENT_LIST_EMPTY,

  // Attachments
  COMM_ATTACHMENT_NOT_FOUND,
  COMM_ATTACHMENT_TOO_LARGE,
  COMM_ATTACHMENT_UNSUPPORTED_TYPE,

  // Boardroom resolutions
  COMM_RESOLUTION_IS_WITHDRAWN,
  COMM_RESOLUTION_IS_FINALIZED,
] as const;

export const CommErrorCodeSchema = z.enum(CommErrorCodeValues);
export type CommErrorCode = z.infer<typeof CommErrorCodeSchema>;
