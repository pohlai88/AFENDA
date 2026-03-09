# shadcn-enforcement CI Gate

## Overview

The `shadcn-enforcement` gate enforces strict usage of shadcn/ui components throughout the AFENDA codebase. It prevents developers from creating hardcoded HTML form elements, custom component implementations, and other patterns that should use the established design system.

## Location

`tools/gates/shadcn-enforcement.mjs`

## Purpose

Maintains design system consistency by ensuring:
- All form elements use shadcn/ui components
- No duplicate/custom implementations of existing shadcn components
- Proper imports from `@afenda/ui` package
- Centralized styling through design tokens

## Rules

### 1. RAW_INPUT
**Detection:** Raw `<input>` elements</br>
**Fix:** Replace with `<Input>` from `@afenda/ui`

```tsx
// ❌ VIOLATION
<input type="text" className="..." />

// ✅ CORRECT
import { Input } from "@afenda/ui";
<Input type="text" />
```

### 2. RAW_SELECT
**Detection:** Raw `<select>` elements  
**Fix:** Replace with shadcn `<Select>` composition

```tsx
// ❌ VIOLATION
<select>
  <option value="1">Option 1</option>
</select>

// ✅ CORRECT
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@afenda/ui";
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### 3. RAW_TEXTAREA
**Detection:** Raw `<textarea>` elements  
**Fix:** Replace with `<Textarea>` from `@afenda/ui`

```tsx
// ❌ VIOLATION
<textarea className="..." />

// ✅ CORRECT
import { Textarea } from "@afenda/ui";
<Textarea />
```

### 4. RAW_BUTTON
**Detection:** Raw `<button>` elements (context-aware)  
**Fix:** Replace with `<Button>` from `@afenda/ui`

**Note:** Allows intentional raw buttons for:
- Accessibility roles: `role="switch"`, `role="tab"`, etc.
- Form submission in specific contexts

```tsx
// ❌ VIOLATION
<button onClick={handleClick}>Click me</button>

// ✅ CORRECT
import { Button } from "@afenda/ui";
<Button onClick={handleClick}>Click me</Button>

// ✅ ALLOWED (accessibility role)
<button role="switch" aria-checked={checked}>...</button>
```

### 5. CUSTOM_SWITCH
**Detection:** Custom toggle/switch implementations  
**Fix:** Replace with `<Switch>` from `@afenda/ui`

Detects patterns like:
- `role="switch"`
- `aria-checked` attributes
- Toggle/switch naming patterns
- Custom transform animations for toggles

```tsx
// ❌ VIOLATION
<button
  role="switch"
  aria-checked={checked}
  onClick={() => setChecked(!checked)}
  className="..."
>
  <span className={checked ? "translate-x-4" : "translate-x-0"} />
</button>

// ✅ CORRECT
import { Switch } from "@afenda/ui";
<Switch checked={checked} onCheckedChange={setChecked} />
```

### 6. MISSING_IMPORT
**Detection:** shadcn components used without proper imports  
**Fix:** Add import statement from `@afenda/ui`

Detects usage of: `Input`, `Select`, `Textarea`, `Button`, `Label`, `Switch`, `Form`, `Card`, `Dialog`, `Table`

### 7. RAW_LABEL
**Detection:** Raw `<label>` elements  
**Fix:** Replace with `<Label>` from `@afenda/ui`

```tsx
// ❌ VIOLATION
<label htmlFor="email">Email</label>

// ✅ CORRECT
import { Label } from "@afenda/ui";
<Label htmlFor="email">Email</Label>
```

### 8. CUSTOM_CHECKBOX
**Detection:** Raw checkbox inputs not wrapped in shadcn component  
**Fix:** Create or use shadcn Checkbox component

```tsx
// ❌ VIOLATION
<input type="checkbox" checked={checked} onChange={...} />

// ✅ CORRECT (if Checkbox component exists)
import { Checkbox } from "@afenda/ui";
<Checkbox checked={checked} onCheckedChange={...} />
```

### 9. CUSTOM_RADIO
**Detection:** Raw radio inputs not wrapped in shadcn component  
**Fix:** Use shadcn RadioGroup component

```tsx
// ❌ VIOLATION
<input type="radio" name="option" value="1" />

// ✅ CORRECT (if RadioGroup exists)
import { RadioGroup, RadioGroupItem } from "@afenda/ui";
<RadioGroup value={value} onValueChange={setValue}>
  <RadioGroupItem value="1" />
</RadioGroup>
```

### 10. INLINE_STYLES
**Detection:** Inline style objects with hardcoded CSS properties  
**Fix:** Use Tailwind className utilities or design tokens

Detects hardcoded properties:
- `color`, `backgroundColor` (should use Tailwind color utilities)
- `padding`, `margin` (should use Tailwind spacing utilities)
- `fontSize` (should use Tailwind typography utilities)
- `borderRadius` (should use Tailwind border utilities)

**Whitelist:** Dynamic transforms, template literal calculations, dynamic grid layouts

```tsx
// ❌ VIOLATION
<div style={{ 
  backgroundColor: "#ff0000", 
  padding: "20px",
  fontSize: "16px"
}}>
  Content
</div>

// ✅ CORRECT
<div className="bg-red-500 p-5 text-base">
  Content
</div>

// ✅ ALLOWED (dynamic calculation)
<div style={{ 
  transform: `translateX(${offset}px)`,
  width: `${percentage}%`
}}>
  Content
</div>
```

### 11. DIRECT_RADIX
**Detection:** Direct imports from `@radix-ui/*`  
**Fix:** Import through shadcn wrapper from `@afenda/ui`

```tsx
// ❌ VIOLATION
import * as Select from "@radix-ui/react-select";

// ✅ CORRECT
import { Select } from "@afenda/ui";
```

### 11. DIRECT_RADIX
**Detection:** Direct imports from `@radix-ui/*`  
**Fix:** Import through shadcn wrapper from `@afenda/ui`

```tsx
// ❌ VIOLATION
import * as Select from "@radix-ui/react-select";

// ✅ CORRECT
import { Select } from "@afenda/ui";
```

**Exemption:** Only `packages/ui/src/components/` should import Radix UI directly (component definitions).

### 12. HARDCODED_FORM
**Detection:** Custom form implementations that duplicate shadcn Form patterns  
**Fix:** Use shadcn Form components with react-hook-form integration

```tsx
// ❌ VIOLATION (custom form wrapper)
<form onSubmit={handleSubmit}>
  <div className="custom-form-field">
    <label>...</label>
    <input />
  </div>
</form>

// ✅ CORRECT
import { Form, FormField, FormItem, FormLabel, FormControl } from "@afenda/ui";
<Form {...form}>
  <FormField
    control={form.control}
    name="fieldName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>...</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )}
  />
</Form>
```

## Exemptions

Files automatically exempted from scanning:

1. **shadcn component sources:** `packages/ui/src/components/`
2. **Test files:** `*.test.{ts,tsx}`, `*.spec.{ts,tsx}`, `__vitest_test__/`, `e2e/`
3. **Next.js generated:** `_app.{ts,tsx}`, `_document.{ts,tsx}`, `middleware.{ts,tsx}`
4. **Root layouts:** `layout.tsx`, `global-error.tsx` (need raw HTML structure)
5. **Config files:** `*.config.{ts,tsx,mjs,cjs}`
6. **Type definitions:** `*.d.ts`

### Manual Exemption Markers

Use these comments to exempt specific sections:

```tsx
<!-- shadcn-exempt -->
/* shadcn-exempt */
// shadcn-exempt
```

The gate searches up to 10 lines backward for these markers.

## Usage

### Run the gate:
```bash
node tools/gates/shadcn-enforcement.mjs
```

### Run with all gates:
```bash
pnpm check:all
```

### Expected output (success):
```
✅ SHADCN ENFORCEMENT PASSED
   Files scanned:     162
   shadcn usage:      ✓ All components properly imported
   Raw HTML elements: ✓ None detected
   Custom implementations: ✓ None detected
   Time:              0.08s
```

### Expected output (failure):
```
❌ SHADCN ENFORCEMENT FAILED — 12 violations

── CUSTOM_SWITCH (9) ──────────────────────────────────
   WHY:  Custom switch implementations duplicate shadcn Switch behavior and bypass design system.
   DOCS: See docs/adr/ui-ux.md — Use shadcn/ui Switch component for toggle controls.

  packages\ui\src\field-kit\kits\bool.tsx:20
    code:  role="switch"
    error:  Custom switch/toggle implementation detected
    fix:    Replace with <Switch> component from @afenda/ui. Import: import { Switch } from "@afenda/ui"
```

## Integration

This gate is registered in `tools/run-gates.mjs` under **Phase 1: Static Correctness**.

**Position in sequence:** 6th gate (after token-compliance, before owners-lint)

## Performance

- **Typical scan time:** ~0.08-0.11s
- **Files scanned:** ~162 TypeScript/TSX files
- **Performance impact:** Minimal (single-pass line scanning)

## Known Patterns

### Field-kit Components (Current Violations)

The gate currently detects violations in field-kit components that use raw HTML:

**Files needing refactoring:**
- `packages/ui/src/field-kit/kits/bool.tsx` - Custom switch (should use `<Switch>`)
- `packages/ui/src/field-kit/kits/string.tsx` - Raw `<input>` (should use `<Input>`)
- `packages/ui/src/field-kit/kits/enum.tsx` - Raw `<select>` (should use `<Select>`)
- `packages/ui/src/field-kit/kits/money.tsx` - Raw `<input>` and `<select>`
- `packages/ui/src/field-kit/kits/relation.tsx` - Custom autocomplete

**Remediation plan:** See [Field-kit Shadcn Migration](#field-kit-shadcn-migration)

## Common False Positives

### 1. Internal package imports
**Fixed:** Gate now recognizes relative imports within `packages/ui/src`

### 2. Accessibility role buttons
**Handled:** Buttons with `role="switch|tab|menu|checkbox|radio"` are allowed

### 3. Form submission buttons
**Handled:** Context-aware detection allows form buttons in specific scenarios

## Disabling the Gate

**Not recommended.** If you must disable temporarily:

```bash
# In tools/run-gates.mjs, comment out:
# resolve(__dirname, "gates/shadcn-enforcement.mjs"),
```

**Better alternative:** Use exemption markers for specific sections.

## Field-kit Shadcn Migration

### Strategy

Refactor field-kit components to use shadcn primitives while maintaining:
- Consistent API (FieldKit interface)
- Design token usage
- Accessibility features
- Custom validation logic

### Example: Bool Kit Refactor

**Before (violation):**
```tsx
// packages/ui/src/field-kit/kits/bool.tsx
<button
  type="button"
  role="switch"
  aria-checked={checked}
  onClick={() => onChange(!checked)}
  className={/* custom styles */}
>
  <span className={checked ? "translate-x-4" : "translate-x-0"} />
</button>
```

**After (compliant):**
```tsx
import { Switch } from "../../components/switch";

<Switch 
  checked={checked} 
  onCheckedChange={onChange}
  disabled={readonly}
  aria-invalid={!!error}
/>
```

## Related Documentation

- [ADR: UI/UX Architecture](../docs/adr/ui-ux.md)
- [PROJECT.md - Import Direction Law](../PROJECT.md#architecture--import-direction-law)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Token Compliance Gate](./token-compliance.mjs)

## Maintenance

### Adding New Component Detections

To detect a new component pattern:

1. Add detection function (e.g., `detectRawDialog`)
2. Add rule documentation to `RULE_DOCS`
3. Add detector to `detectors` array in `scanFile()`
4. Update this documentation

### Updating Exemptions

To add new exemption patterns:
1. Update `EXCLUDE_PATTERNS` array
2. Document the exemption reason
3. Consider if manual markers are more appropriate

## Exit Codes

- `0` - All files compliant
- `1` - Violations detected

## Authors

- **Initial implementation:** AI Agent (2026-03-07)
- **Maintainer:** AFENDA Team (see tools/OWNERS.md)

## Changelog

### 2026-03-07 - Initial Release
- Implemented 11 detection rules
- Added exemption system
- Integrated into CI pipeline
- Detected 12 violations in codebase (field-kit + settings pages)
