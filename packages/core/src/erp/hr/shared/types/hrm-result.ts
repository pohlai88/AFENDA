export type HrmError = {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
};

export type HrmResult<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: HrmError };

export function ok<T>(data: T, meta?: Record<string, unknown>): HrmResult<T> {
  return { ok: true, data, meta };
}

export function err<T = never>(
  code: string,
  message: string,
  meta?: Record<string, unknown>,
): HrmResult<T> {
  return { ok: false, error: { code, message, meta } };
}
