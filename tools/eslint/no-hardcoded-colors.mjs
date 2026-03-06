/**
 * tools/eslint/no-hardcoded-colors.mjs
 *
 * ESLint rule: @afenda/no-hardcoded-colors
 *
 * Prevents hardcoded Tailwind palette colors and `dark:` variant prefixes
 * in JSX className strings. Enforces exclusive use of the design-system
 * semantic tokens defined in packages/ui/src/src/styles/.
 *
 * ── What it catches ─────────────────────────────────────────────────────
 *
 *  1. Tailwind palette classes  — bg-red-500, text-blue-700, border-amber-200
 *     (any <utility>-<palette>-<shade> where palette is a TW named color)
 *  2. dark: variant prefix      — dark:bg-gray-950, dark:text-white
 *     (theme should auto-switch via :root / .dark — no manual overrides)
 *  3. Arbitrary color values     — bg-[#ff0000], text-[rgb(...)], border-[oklch(...)]
 *     (inline color values bypass the token system)
 *
 * ── What is allowed ───────────────────────────────────────────────────────
 *
 *  - DS token classes:     bg-card, text-primary, border-border-subtle
 *  - Structural utilities: bg-transparent, text-inherit, border-inherit
 *  - Non-color utilities:  rounded-lg, flex, gap-4, p-4, text-sm
 *  - Tailwind modifiers:   hover:, focus:, sm:, lg:, etc. (NOT dark:)
 *  - Test files:           *.test.{ts,tsx} and __vitest_test__/ are excluded
 *  - CSS files:            design system pillar files (_tokens-*.css) are excluded
 *
 * ── Using the opt-out ───────────────────────────────────────────────────
 *
 *  For unavoidable cases (e.g. inline severity color-mix), use:
 *    // eslint-disable-next-line @afenda/no-hardcoded-colors
 */

// ── Tailwind named palette (v4 + v3 compat) ─────────────────────────────────
const TW_PALETTES = [
  "slate", "gray", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime", "green",
  "emerald", "teal", "cyan", "sky", "blue", "indigo",
  "violet", "purple", "fuchsia", "pink", "rose",
];

// Shades: 50, 100–950
const SHADE = String.raw`(?:50|[1-9]00|950)`;

// Color utilities: bg-, text-, border-, ring-, outline-, shadow-, accent-,
// divide-, placeholder-, from-, via-, to-, fill-, stroke-, decoration-, caret-
const COLOR_UTILITIES = [
  "bg", "text", "border", "ring", "outline", "shadow", "accent",
  "divide", "placeholder", "from", "via", "to", "fill", "stroke",
  "decoration", "caret",
];

const paletteGroup = TW_PALETTES.join("|");
const utilityGroup = COLOR_UTILITIES.join("|");

// Pattern 1: <utility>-<palette>-<shade>[/<opacity>]
const PALETTE_RE = new RegExp(
  String.raw`(?:^|\s)(?:(?:hover|focus|active|group-hover|peer-hover|focus-within|focus-visible|disabled|first|last|odd|even|sm|md|lg|xl|2xl):)*` +
  String.raw`(?:${utilityGroup})-(?:${paletteGroup})-${SHADE}(?:\/\d+)?(?:\s|$|")`,
);

// Pattern 2: dark: prefix on any class
const DARK_PREFIX_RE = /(?:^|\s)dark:/;

// Pattern 3: arbitrary color values — bg-[#...], text-[rgb(...)], etc.
const ARBITRARY_COLOR_RE = new RegExp(
  String.raw`(?:${utilityGroup})-\[(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|color\(|hwb\()`,
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract all className-like string values from a JSX attribute node. */
function extractClassStrings(node) {
  if (!node) return [];
  if (node.type === "Literal" && typeof node.value === "string") {
    return [{ value: node.value, node }];
  }
  if (node.type === "TemplateLiteral") {
    return node.quasis.map((q) => ({ value: q.value.raw, node: q }));
  }
  if (node.type === "ConditionalExpression") {
    return [...extractClassStrings(node.consequent), ...extractClassStrings(node.alternate)];
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    return [...extractClassStrings(node.left), ...extractClassStrings(node.right)];
  }
  // Tagged template / function call — skip (cn() etc.)
  return [];
}

/** Find which specific classes violate in a className string. */
function findViolations(text) {
  const results = [];

  // Check individual classes by splitting on whitespace
  const classes = text.split(/\s+/).filter(Boolean);
  for (const cls of classes) {
    // dark: prefix
    if (/^dark:/.test(cls)) {
      results.push({
        kind: "dark-prefix",
        match: cls,
        message: `"${cls}" uses the dark: variant — remove it. Design-system tokens auto-switch via :root / .dark selectors.`,
        fix: `Remove the entire dark: class. The equivalent DS token handles both modes.`,
      });
      continue;
    }

    // Palette class
    const paletteMatch = new RegExp(
      String.raw`^(?:(?:hover|focus|active|group-hover|peer-hover|focus-within|focus-visible|disabled|first|last|odd|even|sm|md|lg|xl|2xl):)*` +
      String.raw`(${utilityGroup})-(${paletteGroup})-${SHADE}(?:\/\d+)?$`,
    ).exec(cls);
    if (paletteMatch) {
      const [, utility, palette] = paletteMatch;
      results.push({
        kind: "palette-class",
        match: cls,
        message: `"${cls}" uses hardcoded Tailwind palette color "${palette}". Use a design-system token instead.`,
        fix: `Replace with a semantic token class, e.g. ${utility}-destructive, ${utility}-primary, ${utility}-card, ${utility}-muted, etc.`,
      });
      continue;
    }

    // Arbitrary color value
    if (ARBITRARY_COLOR_RE.test(cls)) {
      results.push({
        kind: "arbitrary-color",
        match: cls,
        message: `"${cls}" uses an arbitrary inline color value. Define the color as a design-system token instead.`,
        fix: `Add a new token to _tokens-light.css / _tokens-dark.css / _theme.css, then use the generated utility class.`,
      });
    }
  }

  return results;
}

// ── Rule definition ──────────────────────────────────────────────────────────

/** @type {import('eslint').Rule.RuleModule} */
export const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Forbid hardcoded Tailwind palette colors and dark: overrides — use design-system tokens.",
      url: "https://github.com/NexusCanon/AFENDA/blob/main/packages/ui/ARCHITECTURE_afenda-design-system.md",
    },
    messages: {
      hardcodedColor: "{{ message }}\nFix: {{ fix }}",
    },
    schema: [], // no options
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    // Skip non-component files
    if (!/\.(tsx|jsx)$/.test(filename)) return {};
    // Skip test files
    if (/\.test\.(tsx|jsx)$/.test(filename) || /__vitest_test__/.test(filename)) return {};

    return {
      // JSX className={...} attributes
      JSXAttribute(node) {
        if (node.name.name !== "className") return;

        const strings = extractClassStrings(node.value?.expression ?? node.value);
        for (const { value, node: strNode } of strings) {
          const violations = findViolations(value);
          for (const v of violations) {
            context.report({
              node: strNode,
              messageId: "hardcodedColor",
              data: { message: v.message, fix: v.fix },
            });
          }
        }
      },

      // Template literals in cn(), clsx(), etc. — className={cn("bg-red-500", cond && "...")}
      CallExpression(node) {
        const callee = node.callee;
        const funcName =
          callee.type === "Identifier"
            ? callee.name
            : callee.type === "MemberExpression" && callee.property.type === "Identifier"
              ? callee.property.name
              : null;

        // Only inspect cn, clsx, cva, twMerge calls
        if (!funcName || !["cn", "clsx", "cva", "twMerge", "twJoin"].includes(funcName)) return;

        for (const arg of node.arguments) {
          const strings = extractClassStrings(arg);
          for (const { value, node: strNode } of strings) {
            const violations = findViolations(value);
            for (const v of violations) {
              context.report({
                node: strNode,
                messageId: "hardcodedColor",
                data: { message: v.message, fix: v.fix },
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
