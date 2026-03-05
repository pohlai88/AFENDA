/**
 * tools/lib/ansi.mjs — ANSI color helpers for CI gate output.
 *
 * Respects TTY detection: colors are stripped in piped/non-interactive output
 * (e.g. GitHub Actions log groups, redirected files).
 */

const isTTY = process.stderr.isTTY;

export const c = {
  red: (s) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s),
  green: (s) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s),
  cyan: (s) => (isTTY ? `\x1b[36m${s}\x1b[0m` : s),
  dim: (s) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s),
};
