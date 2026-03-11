import type { ZodError } from "zod";
import type { AuthActionState, AuthFieldErrors } from "./auth-state";

export function zodErrorToFieldErrors(error: ZodError): AuthFieldErrors {
  const flattened = error.flatten();
  return flattened.fieldErrors;
}

export function buildValidationErrorState(error: ZodError): AuthActionState {
  return {
    ok: false,
    message: "Please correct the highlighted fields.",
    fieldErrors: zodErrorToFieldErrors(error),
  };
}

export function buildFailureState(message: string): AuthActionState {
  return {
    ok: false,
    message,
  };
}

export function buildSuccessState(
  message: string,
  redirectTo?: string,
): AuthActionState {
  return {
    ok: true,
    message,
    redirectTo,
  };
}
