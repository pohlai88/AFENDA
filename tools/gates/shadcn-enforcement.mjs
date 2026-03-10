#!/usr/bin/env node
/**
 * tools/gates/shadcn-enforcement.mjs
 *
 * CI gate: enforces strict shadcn/ui component usage across the codebase.
 * Prevents hardcoded form elements, custom implementations, and raw HTML
 * components that should use the design system.
 *
 * --- Rules ------------------------------------------------------------------
 *
 *  1. RAW_INPUT          - <input> must use <Input> from @afenda/ui
 *  2. RAW_SELECT         - <select> must use <Select> from @afenda/ui
 *  3. RAW_TEXTAREA       - <textarea> must use <Textarea> from @afenda/ui
 *  4. RAW_BUTTON         - <button> must use <Button> from @afenda/ui (context-aware)
 *  5. CUSTOM_SWITCH      - custom toggle must use <Switch> from @afenda/ui
 *  6. MISSING_IMPORT     - file uses shadcn components but missing import
 *  7. HARDCODED_FORM     - custom form elements duplicating shadcn patterns
 *  8. RAW_LABEL          - <label> should use <Label> from @afenda/ui
 *  9. CUSTOM_CHECKBOX    - custom checkbox must use shadcn checkbox patterns
 * 10. CUSTOM_RADIO      - custom radio must use shadcn radio patterns
 * 11. DIRECT_RADIX      - importing Radix UI directly instead of via shadcn wrapper
 *
 * --- Exemptions -------------------------------------------------------------
 *
 *  - packages/ui/src/components/  - shadcn component source files
 *  - __vitest_test__/             - test files
 *  - e2e/                         - e2e test files
 *  - generated Next.js files      - _app, _document, layout, etc.
 *  - Specific marked sections     - <!-- shadcn-exempt --> comments
 *
 * Usage:
 *   node tools/gates/shadcn-enforcement.mjs
 *
 * Exit code 0 = clean, 1 = violations found.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { walkTs } from "../lib/walk.mjs";
import { reportViolations, reportSuccess } from "../lib/reporter.mjs";

// --- Config -----------------------------------------------------------------

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");

const GATE_NAME = "SHADCN ENFORCEMENT";

// --- Scan targets -----------------------------------------------------------

/** Directories to scan for component usage */
const SCAN_DIRS = [
  resolve(ROOT, "apps/web/src"),
  resolve(ROOT, "packages/ui/src"),
  resolve(ROOT, "apps/api/src"),      // For API client UI components
  resolve(ROOT, "apps/worker/src"),   // For worker admin panels
];

/** Paths to EXCLUDE from scanning */
const EXCLUDE_PATTERNS = [
  // Shadcn component source files (they define the raw elements)
  /[/\\]packages[/\\]ui[/\\]src[/\\]components[/\\]/,
  
  // Test files
  /\.test\.(tsx?|jsx?)$/,
  /\.spec\.(tsx?|jsx?)$/,
  /[/\\]__vitest_test__[/\\]/,
  /[/\\]e2e[/\\]/,
  /[/\\]__tests__[/\\]/,
  
  // Generated Next.js files
  /[/\\]_app\.(tsx?|jsx?)$/,
  /[/\\]_document\.(tsx?|jsx?)$/,
  /[/\\]middleware\.(tsx?|jsx?)$/,
  
  // Root layout files (often need raw HTML structure)
  /[/\\]layout\.tsx$/,
  /[/\\]global-error\.tsx$/,
  
  // Configuration files
  /\.config\.(tsx?|jsx?|mjs|cjs)$/,
  
  // Type definition files
  /\.d\.ts$/,

  // Landing / marketing pages use custom dark-terminal primitives (_landing-ui)
  // and an intentional curated palette outside the design system.
  // Each file carries /* shadcn-exempt */ documenting the intent.
  /[/\\]\(marketing\)[/\\]/,
];

// --- shadcn Components Registry ---------------------------------------------

/**
 * Map of HTML elements to their shadcn equivalents.
 * Used for error messages and detection.
 */
const SHADCN_MAPPINGS = {
  input: "Input",
  select: "Select (with SelectTrigger, SelectContent, SelectItem)",
  textarea: "Textarea",
  button: "Button",
  label: "Label",
};

// --- Detection Patterns -----------------------------------------------------

/**
 * Check if file should be skipped based on exclusion patterns.
 */
function shouldSkipFile(filePath) {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(filePath));
}

/**
 * Check if code section is marked as exempt.
 */
function hasExemptMarker(content, lineIndex) {
  // Look backwards for exempt marker within 10 lines
  const searchStart = Math.max(0, lineIndex - 10);
  const searchContent = content.slice(searchStart, lineIndex + 1).join("\n");
  
  return (
    /<!--\s*shadcn-exempt\s*-->/.test(searchContent) ||
    /\/\*\s*shadcn-exempt\s*\*\//.test(searchContent) ||
    /\/\/\s*shadcn-exempt/.test(searchContent)
  );
}

/**
 * Check if a raw button is part of a shadcn component implementation
 * (role="switch", form buttons, etc.)
 */
function isIntentionalRawButton(line, context) {
  // Allow buttons with aria roles (switch, tab, etc.)
  if (/role=["'](switch|tab|menu|checkbox|radio)/.test(line)) {
    return true;
  }
  
  // Allow form submission buttons in specific contexts
  if (/type=["']submit["']/.test(line) && /form/i.test(context)) {
    return true;
  }
  
  return false;
}

/**
 * Detect raw <input> elements that should use <Input>
 */
function detectRawInput(content, lineNum, line) {
  // Match <input ...> but not <Input ...>
  const inputMatch = /<input\s/i.test(line) && !/<Input\s/i.test(line);
  
  if (!inputMatch) return null;
  
  // Skip if it's in a comment
  if (/^\s*[/*]/.test(line)) return null;
  
  return {
    ruleCode: "RAW_INPUT",
    message: `Raw <input> element detected`,
    fix: `Replace with <Input> component from @afenda/ui. Import: import { Input } from "@afenda/ui"`,
  };
}

/**
 * Detect raw <select> elements that should use <Select>
 */
function detectRawSelect(content, lineNum, line) {
  const selectMatch = /<select\s/i.test(line) && !/<Select\s/i.test(line);
  
  if (!selectMatch) return null;
  
  // Skip if it's in a comment
  if (/^\s*[/*]/.test(line)) return null;
  
  return {
    ruleCode: "RAW_SELECT",
    message: `Raw <select> element detected`,
    fix: `Replace with <Select> component from @afenda/ui. Import: import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@afenda/ui"`,
  };
}

/**
 * Detect raw <textarea> elements that should use <Textarea>
 */
function detectRawTextarea(content, lineNum, line) {
  const textareaMatch = /<textarea\s/i.test(line) && !/<Textarea\s/i.test(line);
  
  if (!textareaMatch) return null;
  
  // Skip if it's in a comment
  if (/^\s*[/*]/.test(line)) return null;
  
  return {
    ruleCode: "RAW_TEXTAREA",
    message: `Raw <textarea> element detected`,
    fix: `Replace with <Textarea> component from @afenda/ui. Import: import { Textarea } from "@afenda/ui"`,
  };
}

/**
 * Detect raw <button> elements that should use <Button>
 */
function detectRawButton(content, lineNum, line) {
  const buttonMatch = /<button\s/i.test(line) && !/<Button\s/i.test(line);
  
  if (!buttonMatch) return null;
  
  // Skip if it's in a comment
  if (/^\s*[/*]/.test(line)) return null;
  
  // Get surrounding context (3 lines before and after)
  const contextStart = Math.max(0, lineNum - 3);
  const contextEnd = Math.min(content.length, lineNum + 4);
  const context = content.slice(contextStart, contextEnd).join("\n");
  
  // Allow intentional raw buttons (role-based, form submissions)
  if (isIntentionalRawButton(line, context)) return null;
  
  return {
    ruleCode: "RAW_BUTTON",
    message: `Raw <button> element detected`,
    fix: `Replace with <Button> component from @afenda/ui. Import: import { Button } from "@afenda/ui"`,
  };
}

/**
 * Detect raw <label> elements that should use <Label>
 */
function detectRawLabel(content, lineNum, line) {
  const labelMatch = /<label\s/i.test(line) && !/<Label\s/i.test(line);
  
  if (!labelMatch) return null;
  
  // Skip if it's in a comment
  if (/^\s*[/*]/.test(line)) return null;
  
  // Allow label[htmlFor] in some contexts (already has proper structure)
  // But still enforce shadcn usage for consistency
  
  return {
    ruleCode: "RAW_LABEL",
    message: `Raw <label> element detected`,
    fix: `Replace with <Label> component from @afenda/ui for consistent styling. Import: import { Label } from "@afenda/ui"`,
  };
}

/**
 * Detect custom switch/toggle implementations that should use <Switch>
 */
function detectCustomSwitch(content, lineNum, line) {
  // Look for common custom switch patterns
  const patterns = [
    /role=["']switch["']/,                    // Accessible switch role
    /aria-checked=/,                           // Switch checked state
    /toggle.*switch|switch.*toggle/i,         // Common naming
    /transform.*translate.*bg-primary/,       // Common animation pattern
  ];
  
  const hasPattern = patterns.some((p) => p.test(line));
  if (!hasPattern) return null;
  
  // Skip if it's already using Switch component
  if (/<Switch\s/.test(line)) return null;
  
  // Skip if in shadcn Switch source file
  if (content[0] && /import.*Switch.*from.*radix-ui/i.test(content[0])) {
    return null;
  }
  
  return {
    ruleCode: "CUSTOM_SWITCH",
    message: `Custom switch/toggle implementation detected`,
    fix: `Replace with <Switch> component from @afenda/ui. Import: import { Switch } from "@afenda/ui"`,
  };
}

/**
 * Detect missing shadcn imports when components are used
 */
function detectMissingImport(content, filePath) {
  const violations = [];
  const fullContent = content.join("\n");
  
  // Check for component usage patterns
  const components = {
    Input: /<Input\s/,
    Select: /<Select(Trigger|Content|Item|Value)?\s/,
    Textarea: /<Textarea\s/,
    Button: /<Button\s/,
    Label: /<Label\s/,
    Switch: /<Switch\s/,
    Checkbox: /<Checkbox\s/,
    Form: /<Form(Field|Item|Label|Control|Message|Description)?\s/,
    Card: /<Card(Header|Title|Description|Content|Footer|Action)?\s/,
    Dialog: /<Dialog(Content|Header|Title|Description|Footer|Trigger)?\s/,
    Table: /<Table(Header|Body|Row|Head|Cell)?\s/,
    Badge: /<Badge\s/,
    Separator: /<Separator\s/,
    Tabs: /<Tabs(List|Trigger|Content)?\s/,
    Tooltip: /<Tooltip(Provider|Trigger|Content)?\s/,
  };
  
  const usedComponents = [];
  for (const [name, pattern] of Object.entries(components)) {
    if (pattern.test(fullContent)) {
      usedComponents.push(name);
    }
  }
  
  if (usedComponents.length === 0) return violations;
  
  // Check if there's an import from @afenda/ui OR internal component imports
  const hasImport = 
    /import\s+\{[^}]*\}\s+from\s+["']@afenda\/ui["']/.test(fullContent) ||
    /import\s+\{[^}]*\}\s+from\s+["']\.\.\/components/.test(fullContent) ||
    /import\s+\{[^}]*\}\s+from\s+["']\.\.\/\.\.\/components/.test(fullContent) ||
    // For files inside packages/ui/src
    (filePath.includes("packages/ui/src") && /import\s+\{[^}]*\}\s+from\s+["'][.\/]*components/.test(fullContent));
  
  if (!hasImport) {
    violations.push({
      ruleCode: "MISSING_IMPORT",
      file: filePath,
      line: 1,
      message: `File uses shadcn components (${usedComponents.join(", ")}) but missing import from @afenda/ui`,
      fix: `Add import statement: import { ${usedComponents.join(", ")} } from "@afenda/ui"`,
    });
  }
  
  return violations;
}

/**
 * Detect direct Radix UI imports (should go through shadcn wrapper)
 */
function detectDirectRadixImport(content, lineNum, line) {
  // Allow Radix imports only in shadcn component source files
  // (already filtered by EXCLUDE_PATTERNS, but double-check)
  
  const radixImport = /import\s+.*from\s+["']@radix-ui\//;
  if (!radixImport.test(line)) return null;
  
  return {
    ruleCode: "DIRECT_RADIX",
    message: `Direct Radix UI import detected`,
    fix: `Import through shadcn wrapper from @afenda/ui instead. Radix primitives should only be imported in packages/ui/src/components/`,
  };
}

/**
 * Detect custom checkbox implementations
 */
function detectCustomCheckbox(content, lineNum, line) {
  // Look for input[type="checkbox"] that's not wrapped in shadcn
  if (!/type=["']checkbox["']/.test(line)) return null;
  
  // Get context to see if it's wrapped properly
  const contextStart = Math.max(0, lineNum - 5);
  const contextEnd = Math.min(content.length, lineNum + 5);
  const context = content.slice(contextStart, contextEnd).join("\n");
  
  // If it's already using Checkbox component, skip
  if (/<Checkbox\s/.test(context)) return null;
  
  return {
    ruleCode: "CUSTOM_CHECKBOX",
    message: `Raw checkbox input detected`,
    fix: `Use shadcn Checkbox component from @afenda/ui or create a checkbox component in packages/ui/src/components/ if not available`,
  };
}

/**
 * Detect custom radio implementations
 */
function detectCustomRadio(content, lineNum, line) {
  // Look for input[type="radio"] that's not wrapped in shadcn
  if (!/type=["']radio["']/.test(line)) return null;
  
  // Get context to see if it's wrapped properly
  const contextStart = Math.max(0, lineNum - 5);
  const contextEnd = Math.min(content.length, lineNum + 5);
  const context = content.slice(contextStart, contextEnd).join("\n");
  
  // If it's already using RadioGroup component, skip
  if (/<RadioGroup\s/.test(context) || /<RadioGroupItem\s/.test(context)) return null;
  
  return {
    ruleCode: "CUSTOM_RADIO",
    message: `Raw radio input detected`,
    fix: `Use shadcn RadioGroup component from @afenda/ui or create a radio group component in packages/ui/src/components/ if not available`,
  };
}

/**
 * Detect local @/components/ui/ imports in apps/web (should use @afenda/ui)
 * Catches shadcn primitives accidentally installed into apps/web directly.
 */
function detectLocalShadcnImport(content, lineNum, line) {
  // Matches: import { ... } from "@/components/ui/button" etc.
  if (!/import\s+.*from\s+["']@\/components\/ui\//.test(line)) return null;

  return {
    ruleCode: "LOCAL_SHADCN_IMPORT",
    message: `Local @/components/ui/ import detected — primitives must come from @afenda/ui`,
    fix: `Replace with: import { ... } from "@afenda/ui". Shadcn primitives live in packages/ui, not apps/web.`,
  };
}

/**
 * Detect inline style objects that bypass design tokens
 */
function detectInlineStyles(content, lineNum, line) {
  // Look for style={{ ... }} patterns with common CSS properties
  const stylePattern = /style=\{\{[^}]+\}\}/;
  if (!stylePattern.test(line)) return null;
  
  // Whitelist: Allow inline styles for dynamic calculations or specific use cases
  const allowedPatterns = [
    /transform:\s*["']translate/, // Dynamic transforms
    /width:\s*["']?\$\{/, // Template literal calculations
    /height:\s*["']?\$\{/, // Template literal calculations
    /gridTemplateColumns:\s*/, // Dynamic grid layouts
  ];
  
  for (const allowed of allowedPatterns) {
    if (allowed.test(line)) return null;
  }
  
  // Common CSS properties that should use Tailwind or design tokens
  const hardcodedProperties = [
    /color:\s*["'][^"']+["']/, // Hardcoded colors
    /backgroundColor:\s*["'][^"']+["']/, // Hardcoded background
    /padding:\s*["'][^"']+["']/, // Hardcoded spacing
    /margin:\s*["'][^"']+["']/, // Hardcoded spacing
    /fontSize:\s*["'][^"']+["']/, // Hardcoded typography
    /borderRadius:\s*["'][^"']+["']/, // Hardcoded borders
  ];
  
  for (const prop of hardcodedProperties) {
    if (prop.test(line)) {
      return {
        ruleCode: "INLINE_STYLES",
        message: `Inline style object detected with hardcoded CSS property`,
        fix: `Use Tailwind className utilities (e.g., className="text-red-500 p-4") or CSS variables from design tokens instead of inline styles`,
      };
    }
  }
  
  return null;
}

// --- Rule Documentation -----------------------------------------------------

const RULE_DOCS = {
  RAW_INPUT: {
    why: "Raw <input> elements bypass design system tokens, accessibility features, and consistent styling.",
    docs: "See docs/adr/ui-ux.md — Use shadcn/ui Input component for all text inputs.",
  },
  RAW_SELECT: {
    why: "Raw <select> elements lack consistent styling, keyboard navigation, and accessibility features.",
    docs: "See docs/adr/ui-ux.md — Use shadcn/ui Select component with proper composition.",
  },
  RAW_TEXTAREA: {
    why: "Raw <textarea> elements bypass design system styling and accessibility features.",
    docs: "See docs/adr/ui-ux.md — Use shadcn/ui Textarea component.",
  },
  RAW_BUTTON: {
    why: "Raw <button> elements lack consistent variants, states, and accessibility features.",
    docs: "See docs/adr/ui-ux.md — Use shadcn/ui Button component with proper variant props.",
  },
  RAW_LABEL: {
    why: "Raw <label> elements lack consistent typography and design system tokens.",
    docs: "See docs/adr/ui-ux.md — Use shadcn/ui Label component for form field labels.",
  },
  CUSTOM_SWITCH: {
    why: "Custom switch implementations duplicate shadcn Switch behavior and bypass design system.",
    docs: "See docs/adr/ui-ux.md — Use shadcn/ui Switch component for toggle controls.",
  },
  MISSING_IMPORT: {
    why: "Components used without proper imports cause runtime errors and break type safety.",
    docs: "See PROJECT.md — All UI components must be imported from @afenda/ui package.",
  },
  DIRECT_RADIX: {
    why: "Direct Radix UI imports bypass shadcn wrappers that provide consistent theming and styling.",
    docs: "See PROJECT.md — Only packages/ui/src/components/ should import Radix UI directly.",
  },
  CUSTOM_CHECKBOX: {
    why: "Custom checkbox implementations lack consistent styling and accessibility features.",
    docs: "See docs/adr/ui-ux.md — Use or create shadcn Checkbox component.",
  },
  CUSTOM_RADIO: {
    why: "Custom radio implementations lack consistent styling and accessibility features.",
    docs: "See docs/adr/ui-ux.md — Use or create shadcn RadioGroup component.",
  },
  HARDCODED_FORM: {
    why: "Custom form implementations duplicate shadcn Form patterns and bypass react-hook-form integration.",
    docs: "See docs/adr/ui-ux.md — Use shadcn/ui Form components with react-hook-form.",
  },
  INLINE_STYLES: {
    why: "Inline style objects bypass design tokens and Tailwind utilities, making theming inconsistent.",
    docs: "See docs/adr/ui-ux.md — Use Tailwind className or design system CSS variables.",
  },
  LOCAL_SHADCN_IMPORT: {
    why: "Importing from @/components/ui/ in apps/web means shadcn primitives were accidentally installed locally instead of living in packages/ui.",
    docs: "See AGENTS.md §6 and docs/shadcn-cli-workflow.md — Install primitives into packages/ui via: cd apps/web && npx shadcn@latest add <component> -y -p ../../packages/ui/src/components",
  },
  DUPLICATE_PRIMITIVE: {
    why: "Shadcn primitives (button.tsx, input.tsx, etc.) must only exist in packages/ui/src/components/. Duplicates in apps/web break the monorepo's single-source-of-truth and cause version drift.",
    docs: "See AGENTS.md §6 — Delete the duplicate and import from @afenda/ui. Install correctly via: cd apps/web && npx shadcn@latest add <primitive> -y -p ../../packages/ui/src/components",
  },
};

// --- Main Scanner -----------------------------------------------------------

/**
 * Scan a single file for shadcn enforcement violations.
 */
function scanFile(filePath) {
  const violations = [];
  
  if (shouldSkipFile(filePath)) return violations;
  
  const source = readFileSync(filePath, "utf8");
  const lines = source.split("\n");
  
  const relPath = relative(ROOT, filePath);
  
  // Detect missing imports (file-level check)
  const importViolations = detectMissingImport(lines, relPath);
  violations.push(...importViolations);
  
  // Line-by-line checks
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Skip exempt sections
    if (hasExemptMarker(lines, i)) continue;
    
    // Skip comments and imports (already handled)
    if (/^\s*[/*]/.test(line) || /^\s*import\s/.test(line)) continue;
    
    // Run detection functions
    const detectors = [
      detectRawInput,
      detectRawSelect,
      detectRawTextarea,
      detectRawButton,
      detectRawLabel,
      detectCustomSwitch,
      detectDirectRadixImport,
      detectCustomCheckbox,
      detectCustomRadio,
      detectInlineStyles,
      // Only run local-import check on apps/web files (not packages/ui internals)
      ...(relPath.startsWith("apps/web") || relPath.startsWith("apps\\web")
        ? [detectLocalShadcnImport]
        : []),
    ];
    
    for (const detector of detectors) {
      const violation = detector(lines, i, line);
      if (violation) {
        violations.push({
          ...violation,
          file: relPath,
          line: lineNum,
          statement: line.trim().slice(0, 80),
        });
      }
    }
  }
  
  return violations;
}

// --- Duplicate primitive check (file-existence) ----------------------------

/**
 * SHADCN primitives are only allowed inside packages/ui/src/components/.
 * If button.tsx / input.tsx etc. appear directly in apps/web/src/components/
 * (or apps/web/src/components/ui/) it means a bad `npx shadcn add` ran without
 * the correct --path flag.  Detect this at gate time.
 */
const SHADCN_PRIMITIVE_NAMES = [
  "button", "input", "label", "card", "separator", "textarea",
  "select", "switch", "checkbox", "radio-group", "dialog", "badge",
  "tabs", "tooltip", "skeleton", "avatar", "progress", "slider",
];

const WEB_COMPONENTS_ROOT = resolve(ROOT, "apps/web/src/components");

function checkDuplicatePrimitives() {
  const violations = [];
  for (const name of SHADCN_PRIMITIVE_NAMES) {
    const candidates = [
      resolve(WEB_COMPONENTS_ROOT, `${name}.tsx`),
      resolve(WEB_COMPONENTS_ROOT, "ui", `${name}.tsx`),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        violations.push({
          ruleCode: "DUPLICATE_PRIMITIVE",
          file: relative(ROOT, candidate),
          line: 1,
          message: `Shadcn primitive '${name}.tsx' found in apps/web — must live in packages/ui only`,
          fix: `Delete this file and import from @afenda/ui instead. To re-add the primitive correctly: cd apps/web && npx shadcn@latest add ${name} -y -p ../../packages/ui/src/components`,
        });
      }
    }
  }
  return violations;
}

// --- Main Execution ---------------------------------------------------------

const startTime = performance.now();

const allViolations = [];
let scannedFiles = 0;

// Check for duplicate primitives FIRST (fast, no file walking)
allViolations.push(...checkDuplicatePrimitives());

for (const dir of SCAN_DIRS) {
  const files = walkTs(dir);
  for (const file of files) {
    const violations = scanFile(file);
    allViolations.push(...violations);
    scannedFiles++;
  }
}

const elapsed = `${((performance.now() - startTime) / 1000).toFixed(2)}s`;

if (allViolations.length > 0) {
  reportViolations({
    gateName: GATE_NAME,
    violations: allViolations,
    ruleDocs: RULE_DOCS,
    stats: {
      "Files scanned:": scannedFiles,
      "Scan time:": elapsed,
    },
    elapsed,
  });
  process.exit(1);
} else {
  reportSuccess({
    gateName: GATE_NAME,
    stats: {
      "Files scanned:": scannedFiles,
      "shadcn usage:": "✓ All components properly imported",
      "Raw HTML elements:": "✓ None detected",
      "Custom implementations:": "✓ None detected",
    },
    elapsed,
  });
  process.exit(0);
}
