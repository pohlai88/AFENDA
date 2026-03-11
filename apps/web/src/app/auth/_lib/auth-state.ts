export type AuthFieldErrors = Record<string, string[]>;

export interface AuthActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: AuthFieldErrors;
  redirectTo?: string;
}

export const INITIAL_AUTH_ACTION_STATE: AuthActionState = {
  ok: false,
};
