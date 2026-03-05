/**
 * tools/lib/reporter.mjs — Shared violation reporter with grouped output.
 *
 * Renders violations grouped by rule code with WHY / DOCS / FIX annotations,
 * a summary table, and consistent formatting. Used by all CI gate scripts.
 */

import { c } from "./ansi.mjs";

/**
 * @typedef {Object} Violation
 * @property {string}       ruleCode   — e.g. "BOUNDARY_VIOLATION"
 * @property {string}       file       — relative file path (or relPath for catalog)
 * @property {number|null}  line       — 1-based line number
 * @property {string}       message    — human-readable error description
 * @property {string}       fix        — concrete fix suggestion
 */

/**
 * @typedef {Object} RuleDoc
 * @property {string} why   — why this rule exists
 * @property {string} docs  — where to learn more
 */

/**
 * Format a single violation's detail lines. Override this per-gate by
 * passing a custom `formatViolation` callback to `reportViolations()`.
 *
 * Default format: location → error → fix
 *
 * @param {Violation & Record<string, unknown>} v
 * @returns {string}
 */
function defaultFormatViolation(v) {
  const location = v.line ? `${v.file ?? v.relPath}:${v.line}` : (v.file ?? v.relPath);
  const lines = [`  ${c.cyan(location)}`];
  if (v.statement)  lines.push(`    ${c.dim("code:")}  ${v.statement}`);
  if (v.import)     lines.push(`    ${c.dim("import:")} ${v.import}`);
  if (v.dep)        lines.push(`    ${c.dim("dep:")}     ${v.dep}`);
  if (v.field)      lines.push(`    ${c.dim("field:")}   ${v.field}`);
  if (v.version)    lines.push(`    ${c.dim("current:")} ${v.version}`);
  lines.push(`    ${c.red("error:")}  ${v.message}`);
  lines.push(`    ${c.yellow("fix:")}    ${v.fix}`);
  return lines.join("\n");
}

/**
 * Print a grouped violation report to stderr and exit with code 1.
 *
 * @param {Object}  opts
 * @param {string}  opts.gateName         — e.g. "BOUNDARY CHECK"
 * @param {Array}   opts.violations       — array of violation objects
 * @param {Record<string, RuleDoc>} opts.ruleDocs — per-ruleCode docs
 * @param {Record<string, number>}  opts.stats    — key-value stats for summary
 * @param {string}  opts.elapsed          — formatted elapsed time string
 * @param {(v: Violation) => string} [opts.formatViolation] — optional custom formatter
 */
export function reportViolations({
  gateName,
  violations,
  ruleDocs,
  stats,
  elapsed,
  formatViolation = defaultFormatViolation,
}) {
  // Group by rule code
  const grouped = {};
  for (const v of violations) {
    if (!grouped[v.ruleCode]) grouped[v.ruleCode] = [];
    grouped[v.ruleCode].push(v);
  }

  console.error(
    `\n${c.red(c.bold(`❌ ${gateName} FAILED`))} — ${violations.length} violation${violations.length > 1 ? "s" : ""}\n`
  );

  for (const [ruleCode, items] of Object.entries(grouped)) {
    const doc = ruleDocs[ruleCode];
    console.error(c.bold(`── ${ruleCode} (${items.length}) ──────────────────────────────────`));
    if (doc) {
      console.error(c.dim(`   WHY:  ${doc.why}`));
      console.error(c.dim(`   DOCS: ${doc.docs}`));
    }
    console.error();

    for (const v of items) {
      console.error(formatViolation(v));
      console.error();
    }
  }

  // Summary table
  console.error(c.dim(`─── Summary ───────────────────────────────────────────────`));
  for (const [label, value] of Object.entries(stats)) {
    console.error(c.dim(`  ${label.padEnd(18)} ${value}`));
  }
  console.error(c.dim(`  ${"Violations:".padEnd(18)} ${violations.length}`));
  for (const [code, items] of Object.entries(grouped)) {
    console.error(c.dim(`    ${code}: ${items.length}`));
  }
  console.error(c.dim(`  ${"Time:".padEnd(18)} ${elapsed}s`));
  console.error(c.dim(`───────────────────────────────────────────────────────────\n`));
}

/**
 * Print a success line and exit cleanly.
 *
 * @param {Object}  opts
 * @param {string}  opts.gateName  — e.g. "boundary check"
 * @param {string}  opts.detail    — stats to show after the ✅ line (dim)
 */
export function reportSuccess({ gateName, detail }) {
  console.log(`✅ ${gateName} passed — 0 violations`);
  if (detail) console.log(c.dim(`   ${detail}`));
}
