/**
 * Registry/configuration management error codes.
 *
 * RULES:
 *   1. All codes prefixed with CFG_
 *   2. Naming convention: CFG_NOUN_REASON (SCREAMING_SNAKE_CASE)
 *   3. Removing or renaming a code is a BREAKING CHANGE
 */
import { z } from "zod";

// ─── Configuration Error Codes ────────────────────────────────────────────────
export const CFG_SETTING_NOT_FOUND = "CFG_SETTING_NOT_FOUND" as const;
export const CFG_SETTING_READ_ONLY = "CFG_SETTING_READ_ONLY" as const;
export const CFG_SETTING_INVALID_VALUE = "CFG_SETTING_INVALID_VALUE" as const;
export const CFG_SETTING_KEY_UNKNOWN = "CFG_SETTING_KEY_UNKNOWN" as const;
export const CFG_FEATURE_FLAG_NOT_FOUND = "CFG_FEATURE_FLAG_NOT_FOUND" as const;

// ─── Custom Fields Error Codes ────────────────────────────────────────────────
export const CFG_CUSTOM_FIELD_KEY_IMMUTABLE = "CFG_CUSTOM_FIELD_KEY_IMMUTABLE" as const;
export const CFG_CUSTOM_FIELD_NOT_FOUND = "CFG_CUSTOM_FIELD_NOT_FOUND" as const;
export const CFG_CUSTOM_FIELD_INVALID_VALUE = "CFG_CUSTOM_FIELD_INVALID_VALUE" as const;
export const CFG_CUSTOM_FIELD_ENTITY_TYPE_UNKNOWN = "CFG_CUSTOM_FIELD_ENTITY_TYPE_UNKNOWN" as const;

// ─── Registry Error Code Array ────────────────────────────────────────────────
export const RegistryErrorCodeValues = [
  CFG_SETTING_NOT_FOUND,
  CFG_SETTING_READ_ONLY,
  CFG_SETTING_INVALID_VALUE,
  CFG_SETTING_KEY_UNKNOWN,
  CFG_FEATURE_FLAG_NOT_FOUND,
  CFG_CUSTOM_FIELD_KEY_IMMUTABLE,
  CFG_CUSTOM_FIELD_NOT_FOUND,
  CFG_CUSTOM_FIELD_INVALID_VALUE,
  CFG_CUSTOM_FIELD_ENTITY_TYPE_UNKNOWN,
] as const;

export const RegistryErrorCodeSchema = z.enum(RegistryErrorCodeValues);
export type RegistryErrorCode = z.infer<typeof RegistryErrorCodeSchema>;
