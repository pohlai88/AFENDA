/**
 * tools/eslint/no-noncanonical-tailwind.mjs
 *
 * ESLint rule: @afenda/no-noncanonical-tailwind
 *
 * Tailwind v4 expands the built-in scale so many arbitrary-value classes can be
 * replaced with canonical utilities. This rule catches the most common patterns
 * that would otherwise only appear as VS Code IntelliSense hints (not in CI).
 *
 * ── What it catches ─────────────────────────────────────────────────────────
 *
 *  Arbitrary opacity modifiers  /[0.06]  →  /6
 *  Pixel dimensions on scale    w-[600px]  →  w-150   (4px grid multiples)
 *  Deprecated utility aliases   flex-shrink  →  shrink
 *                               flex-grow    →  grow
 *  Arbitrary bg-size syntax     bg-[size:…]  →  bg-size-[…]
 *  Bracket rotate               rotate-[-90deg]  →  -rotate-90
 *
 * ── Exemptions ──────────────────────────────────────────────────────────────
 *
 *  Classes where no canonical equivalent exists (e.g. blur-[160px], top-[15%])
 *  are intentionally not flagged — arbitrary values are still valid in v4.
 *
 * ── Opt-out ─────────────────────────────────────────────────────────────────
 *
 *  {/* tailwind-canonical-exempt: reason *\/}
 */

/** Maps deprecated class names to their v4 canonical replacements. */
const ALIAS_MAP = {
  "flex-shrink": "shrink",
  "flex-shrink-0": "shrink-0",
  "flex-grow": "grow",
  "flex-grow-0": "grow-0",
  "overflow-ellipsis": "text-ellipsis",
  "decoration-clone": "box-decoration-clone",
  "decoration-slice": "box-decoration-slice",
};

/**
 * Convert a pixel value to the Tailwind v4 scale (1 unit = 4px).
 * Returns null when the value is not on the 4px grid.
 */
function pxToScale(px) {
  const n = parseFloat(px);
  if (isNaN(n) || n % 0.5 !== 0) return null;
  const scale = n / 4;
  // Avoid suggesting sub-0.5 scale values (too small to be meaningful)
  if (scale < 0.5) return null;
  // Represent as integer when possible, otherwise one decimal place
  return scale === Math.floor(scale) ? String(scale) : scale.toFixed(1).replace(/\.0$/, "");
}

/** Check each Tailwind class token for known non-canonical patterns. */
function checkClass(cls) {
  // 1. Deprecated alias (flex-shrink → shrink, flex-grow → grow, etc.)
  if (ALIAS_MAP[cls]) {
    return { fix: ALIAS_MAP[cls], reason: `\`${cls}\` is deprecated — use \`${ALIAS_MAP[cls]}\`` };
  }

  // 2. Opacity modifier: bg-X/[0.06] → bg-X/6  (also works for text-X/, border-X/, etc.)
  const opacityBracket = cls.match(/^(.+)\/\[([0-9.]+)\]$/);
  if (opacityBracket) {
    const base = opacityBracket[1];
    const val = parseFloat(opacityBracket[2]);
    if (!isNaN(val) && val >= 0 && val <= 1) {
      const pct = Math.round(val * 100);
      if (Math.abs(val * 100 - pct) < 0.001) {
        return { fix: `${base}/${pct}`, reason: `\`${cls}\` can be written as \`${base}/${pct}\`` };
      }
    }
  }

  // 3. Pixel-based sizing on the 4px grid: w-[600px] → w-150, h-[3px] → h-0.75
  const pxSize = cls.match(
    /^(w|h|min-w|max-w|min-h|max-h|size|gap|gap-x|gap-y|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|inset|top|right|bottom|left|translate-x|translate-y)-\[([0-9.]+)px\]$/,
  );
  if (pxSize) {
    const prefix = pxSize[1];
    const scale = pxToScale(pxSize[2]);
    if (scale !== null) {
      return {
        fix: `${prefix}-${scale}`,
        reason: `\`${cls}\` can be written as \`${prefix}-${scale}\``,
      };
    }
  }

  // 4. rotate-[-90deg] → -rotate-90  /  rotate-[90deg] → rotate-90
  const rotateBracket = cls.match(/^rotate-\[(-?)([0-9]+)deg\]$/);
  if (rotateBracket) {
    const neg = rotateBracket[1];
    const deg = rotateBracket[2];
    const canonical = neg ? `-rotate-${deg}` : `rotate-${deg}`;
    return { fix: canonical, reason: `\`${cls}\` can be written as \`${canonical}\`` };
  }

  // 5. bg-[size:…] → bg-size-[…]
  const bgSizeBracket = cls.match(/^bg-\[size:(.+)\]$/);
  if (bgSizeBracket) {
    const canonical = `bg-size-[${bgSizeBracket[1]}]`;
    return { fix: canonical, reason: `\`${cls}\` can be written as \`${canonical}\`` };
  }

  return null;
}

/** Extract individual class tokens from a className string value. */
function tokenize(str) {
  return str.split(/\s+/).filter(Boolean);
}

/** Check if the preceding comment contains the opt-out marker. */
function hasExemptComment(node, sourceCode) {
  const comments = sourceCode.getCommentsBefore(node);
  return comments.some((c) => c.value.includes("tailwind-canonical-exempt"));
}

/** @type {import('eslint').Rule.RuleModule} */
export const rule = {
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: {
      description:
        "Prefer Tailwind v4 canonical utility classes over equivalent arbitrary-value forms.",
    },
    messages: {
      nonCanonical: "{{ reason }}. Use the canonical form to keep class lists clean.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!/\.(tsx|jsx|ts|js)$/.test(filename)) return {};

    const sourceCode = context.getSourceCode?.() ?? context.sourceCode;

    function checkStringValue(node, raw) {
      if (!raw || typeof raw !== "string") return;
      if (hasExemptComment(node, sourceCode)) return;

      const tokens = tokenize(raw);
      for (const token of tokens) {
        const result = checkClass(token);
        if (!result) continue;

        // Build the fixed full string by replacing just this token
        const fixedRaw = raw.replace(
          new RegExp(`(?<![\\w-])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`),
          result.fix,
        );

        context.report({
          node,
          messageId: "nonCanonical",
          data: { reason: result.reason },
          fix(fixer) {
            // Re-wrap in the same quote style used by the original literal
            const original = sourceCode.getText(node);
            const quote = original[0];
            return fixer.replaceText(node, `${quote}${fixedRaw}${quote}`);
          },
        });
      }
    }

    return {
      // JSX className="..." (string literal)
      JSXAttribute(node) {
        if (node.name?.name !== "className") return;
        const val = node.value;
        if (!val) return;

        if (val.type === "Literal" && typeof val.value === "string") {
          checkStringValue(val, val.value);
        }
        // Template literals without expressions: className={`...`}
        if (
          val.type === "JSXExpressionContainer" &&
          val.expression?.type === "TemplateLiteral" &&
          val.expression.expressions.length === 0
        ) {
          checkStringValue(val.expression.quasis[0], val.expression.quasis[0]?.value?.raw);
        }
      },
    };
  },
};

export default rule;
