/**
 * tools/eslint/no-js-date-in-db.mjs
 *
 * ESLint rule: @afenda/no-js-date-in-db
 *
 * Mirrors the server-clock CI gate: bans `new Date()` in files that import
 * drizzle-orm or @afenda/db. Use sql`now()` from drizzle-orm for DB timestamps.
 *
 * ── What it catches ─────────────────────────────────────────────────────
 *
 *  new Date() or new Date(...) in files that import "drizzle-orm" or "@afenda/db"
 *
 * ── Exemptions ───────────────────────────────────────────────────────────
 *
 *  - __vitest_test__/, __e2e_test__/ directories
 *  - Line with // gate:allow-js-date
 *
 * ── Opt-out ────────────────────────────────────────────────────────────
 *
 *  // gate:allow-js-date
 *  const now = new Date();
 */

const DB_IMPORT_MARKERS = ["drizzle-orm", "@afenda/db"];
const OPT_OUT = "gate:allow-js-date";

/** @type {import('eslint').Rule.RuleModule} */
export const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid new Date() in DB-touching files — use sql`now()` from drizzle-orm.",
      url: "https://github.com/NexusCanon/AFENDA/blob/main/packages/db/OWNERS.md",
    },
    messages: {
      noJsDateInDb:
        "new Date() in DB-touching file — use sql`now()` from drizzle-orm for timestamps. Add // gate:allow-js-date to opt out.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/\.(ts|tsx|js|jsx)$/.test(filename)) return {};
    if (/__vitest_test__|__e2e_test__/.test(filename)) return {};

    let importsDb = false;

    return {
      ImportDeclaration(node) {
        const src = node.source?.value;
        if (typeof src === "string" && DB_IMPORT_MARKERS.includes(src)) {
          importsDb = true;
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "Identifier" || node.callee.name !== "require") return;
        const arg = node.arguments[0];
        if (arg?.type === "Literal" && typeof arg.value === "string") {
          if (DB_IMPORT_MARKERS.includes(arg.value)) importsDb = true;
        }
      },
      NewExpression(node) {
        if (!importsDb) return;
        if (node.callee.type !== "Identifier" || node.callee.name !== "Date") return;

        const sourceCode = context.getSourceCode();
        const tokenBefore = sourceCode.getTokenBefore(node);
        const comments = tokenBefore
          ? sourceCode.getCommentsBefore(tokenBefore)
          : sourceCode.getCommentsBefore(node);
        const line = sourceCode.lines[node.loc.start.line - 1] || "";
        if (line.includes(OPT_OUT)) return;
        for (const c of comments) {
          if (c.value.includes(OPT_OUT)) return;
        }

        context.report({
          node,
          messageId: "noJsDateInDb",
        });
      },
    };
  },
};

export default rule;
