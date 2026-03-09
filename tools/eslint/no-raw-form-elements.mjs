/**
 * tools/eslint/no-raw-form-elements.mjs
 *
 * ESLint rule: @afenda/no-raw-form-elements
 *
 * Mirrors the shadcn-enforcement CI gate: forbids raw HTML form elements
 * (<input>, <button>, <select>, <textarea>, <label>) in favor of shadcn/ui
 * components from @afenda/ui.
 *
 * ── What it catches ─────────────────────────────────────────────────────
 *
 *  Raw <input>, <select>, <textarea>, <button>, <label> in app/UI code.
 *
 * ── Exemptions (handled by eslint.config.js) ─────────────────────────────
 *
 *  - packages/ui/src/components/ (shadcn source)
 *  - Test files (*.test.*, __vitest_test__/)
 *  - <!-- shadcn-exempt --> or // shadcn-exempt in preceding lines
 *
 * ── Button exemptions (context-aware) ─────────────────────────────────────
 *
 *  - role="switch" | role="tab" | role="menu" | role="checkbox" | role="radio"
 *  - type="submit" in form context
 *
 * ── Opt-out ────────────────────────────────────────────────────────────
 *
 *  {/* shadcn-exempt: Reason for raw HTML *\/}
 *  <button type="button">Icon only</button>
 */

const RAW_ELEMENTS = ["input", "select", "textarea", "button", "label"];

const SHADCN_MAPPINGS = {
  input: "Input",
  select: "Select (with SelectTrigger, SelectContent, SelectItem)",
  textarea: "Textarea",
  button: "Button",
  label: "Label",
};

/** @type {import('eslint').Rule.RuleModule} */
export const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid raw HTML form elements — use shadcn/ui components from @afenda/ui.",
      url: "https://github.com/NexusCanon/AFENDA/blob/main/docs/ci-gates/shadcn-enforcement.md",
    },
    messages: {
      rawElement:
        "Raw <{{element}}> detected — use <{{replacement}}> from @afenda/ui.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (!/\.(tsx|jsx)$/.test(filename)) return {};

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") return;
        const name = node.name.name;
        if (!RAW_ELEMENTS.includes(name)) return;

        // Check for button exemptions
        if (name === "button") {
          const hasExemptRole = node.attributes.some((attr) => {
            if (attr.type !== "JSXAttribute" || attr.name?.name !== "role") return false;
            const value = attr.value;
            if (value?.type === "Literal" && typeof value.value === "string") {
              return ["switch", "tab", "menu", "checkbox", "radio"].includes(value.value);
            }
            return false;
          });
          if (hasExemptRole) return;
        }

        // Check for shadcn-exempt in preceding comments
        const sourceCode = context.getSourceCode();
        const comments = sourceCode.getCommentsBefore(node);
        for (const c of comments) {
          if (/shadcn-exempt/.test(c.value)) return;
        }
        const line = sourceCode.lines[node.loc.start.line - 1] || "";
        if (/shadcn-exempt/.test(line)) return;

        context.report({
          node,
          messageId: "rawElement",
          data: {
            element: name,
            replacement: SHADCN_MAPPINGS[name] || name,
          },
        });
      },
    };
  },
};

export default rule;
