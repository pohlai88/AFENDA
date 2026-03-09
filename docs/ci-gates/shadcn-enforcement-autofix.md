# shadcn-enforcement Auto-Fix

**Status:** 🚧 Experimental  
**Safety:** Safe transformations only by default  
**Purpose:** Automatically fix common shadcn-enforcement violations

## Overview

The auto-fix utility automatically repairs common shadcn-enforcement violations where the transformation is safe and unambiguous. This saves developer time and ensures consistent fixes across the codebase.

## Usage

### Basic Usage

```bash
# Dry-run mode (preview changes without modifying files)
node tools/gates/shadcn-enforcement-autofix.mjs --dry-run

# Apply fixes (safe transformations only)
node tools/gates/shadcn-enforcement-autofix.mjs

# Apply all fixes including unsafe ones
node tools/gates/shadcn-enforcement-autofix.mjs --unsafe
```

### Workflow

```bash
# 1. Check for violations
node tools/gates/shadcn-enforcement.mjs

# 2. Preview auto-fixes
node tools/gates/shadcn-enforcement-autofix.mjs --dry-run

# 3. Apply safe fixes
node tools/gates/shadcn-enforcement-autofix.mjs

# 4. Verify remaining violations (may need manual fixes)
node tools/gates/shadcn-enforcement.mjs
```

## Auto-Fixable Violations

### ✅ Safe Transformations (Default)

#### 1. RAW_INPUT
**Detection:** `<input>` → `<Input>`

**Before:**
```tsx
<input type="text" placeholder="Enter name" />
```

**After:**
```tsx
import { Input } from "@afenda/ui";
<Input type="text" placeholder="Enter name" />
```

**Safety:** ✅ High - Direct 1:1 replacement

---

#### 2. RAW_TEXTAREA
**Detection:** `<textarea>` → `<Textarea>`

**Before:**
```tsx
<textarea placeholder="Enter description" />
```

**After:**
```tsx
import { Textarea } from "@afenda/ui";
<Textarea placeholder="Enter description" />
```

**Safety:** ✅ High - Direct 1:1 replacement

---

#### 3. RAW_LABEL
**Detection:** `<label>` → `<Label>`

**Before:**
```tsx
<label htmlFor="email">Email</label>
```

**After:**
```tsx
import { Label } from "@afenda/ui";
<Label htmlFor="email">Email</Label>
```

**Safety:** ✅ High - Direct 1:1 replacement

---

### ⚠️ Unsafe Transformations (Require --unsafe flag)

#### 4. DIRECT_RADIX
**Detection:** `@radix-ui/*` imports → `@afenda/ui`

**Before:**
```tsx
import * as Switch from "@radix-ui/react-switch";
```

**After:**
```tsx
import { Switch } from "@afenda/ui";
```

**Safety:** ⚠️ Medium - May require API adjustments if using Radix directly

---

#### 5. INLINE_STYLES (Conservative)
**Detection:** Common hardcoded inline styles → Tailwind classes

**Before:**
```tsx
<div style={{ backgroundColor: "#ff0000", padding: "20px" }}>
```

**After:**
```tsx
<div className="bg-red-500 p-5">
```

**Safety:** ⚠️ Medium - Only handles exact matches of common patterns
**Note:** Complex inline styles are not auto-fixed

---

## NOT Auto-Fixable (Require Manual Review)

### ❌ Complex Transformations

#### RAW_SELECT
**Why not auto-fixable:** Requires composition pattern with multiple components

**Manual fix required:**
```tsx
// ❌ Cannot auto-fix this:
<select>
  <option value="1">Option 1</option>
</select>

// ✅ Requires manual conversion to:
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

---

#### RAW_BUTTON
**Why not auto-fixable:** Context-dependent (some raw buttons are intentional)

**Reason:** Buttons with accessibility roles (`role="switch"`, `role="tab"`) should remain raw

---

#### CUSTOM_SWITCH
**Why not auto-fixable:** Requires replacing entire component structure

**Manual fix required:**
```tsx
// ❌ Cannot auto-fix complex custom switch:
<button
  role="switch"
  aria-checked={checked}
  onClick={() => setChecked(!checked)}
  className="relative inline-flex h-6 w-11 items-center rounded-full"
>
  <span className={cn(
    "inline-block h-4 w-4 transform rounded-full bg-white transition",
    checked ? "translate-x-6" : "translate-x-1"
  )} />
</button>

// ✅ Requires manual conversion to:
import { Switch } from "@afenda/ui";
<Switch checked={checked} onCheckedChange={setChecked} />
```

---

#### CUSTOM_CHECKBOX
**Why not auto-fixable:** May have custom logic or styling

**Reason:** Checkboxes often have custom `onChange` handlers that need review

---

#### CUSTOM_RADIO
**Why not auto-fixable:** Requires RadioGroup composition pattern

**Reason:** Similar to SELECT, requires multiple components

---

#### HARDCODED_FORM
**Why not auto-fixable:** Requires react-hook-form integration

**Reason:** Complex structural changes needed

---

## Example Output

### Dry-Run Mode

```bash
$ node tools/gates/shadcn-enforcement-autofix.mjs --dry-run

🔧 shadcn-enforcement Auto-Fix Utility

Mode: DRY-RUN (no changes)
Safety: SAFE ONLY

Processing: packages/ui/src/field-kit/kits/string.tsx
  ✓ Fixed RAW_INPUT violations
  ✓ Added imports: Input
  🔍 Would save 2 fix(es) (dry-run)

Processing: apps/web/src/components/forms/ProfileForm.tsx
  ✓ Fixed RAW_LABEL violations
  ✓ Added imports: Label
  🔍 Would save 2 fix(es) (dry-run)

────────────────────────────────────────────────────────
📊 Summary:
   Files scanned: 170
   Files fixed:   2
   Mode:          DRY-RUN

💡 Run without --dry-run to apply fixes
```

### Live Mode

```bash
$ node tools/gates/shadcn-enforcement-autofix.mjs

🔧 shadcn-enforcement Auto-Fix Utility

Mode: LIVE (will modify files)
Safety: SAFE ONLY

Processing: packages/ui/src/field-kit/kits/string.tsx
  ✓ Fixed RAW_INPUT violations
  ✓ Added imports: Input
  💾 Saved 2 fix(es)

Processing: apps/web/src/components/forms/ProfileForm.tsx
  ✓ Fixed RAW_LABEL violations
  ✓ Added imports: Label
  💾 Saved 2 fix(es)

────────────────────────────────────────────────────────
📊 Summary:
   Files scanned: 170
   Files fixed:   2
   Mode:          LIVE
```

## Import Handling

The auto-fix utility intelligently manages imports:

### Scenario 1: No existing @afenda/ui import
```tsx
// Before
import { useState } from 'react';
<input type="text" />

// After
import { useState } from 'react';
import { Input } from "@afenda/ui";
<Input type="text" />
```

### Scenario 2: Existing @afenda/ui import
```tsx
// Before
import { Button } from "@afenda/ui";
<input type="text" />

// After
import { Button, Input } from "@afenda/ui";
<Input type="text" />
```

### Scenario 3: Multiple new imports
```tsx
// Before
<input type="text" />
<label htmlFor="name">Name</label>

// After
import { Input, Label } from "@afenda/ui";
<Input type="text" />
<Label htmlFor="name">Name</Label>
```

## Safety Guarantees

### Safe Mode (Default)
- ✅ Only applies transformations with 1:1 component mapping
- ✅ Preserves all attributes and props exactly
- ✅ Automatically adds/merges imports
- ✅ No structural changes to component tree
- ✅ Idempotent (running multiple times produces same result)

### Unsafe Mode (--unsafe flag)
- ⚠️ May replace Radix imports (could break if using Radix API directly)
- ⚠️ May replace inline styles (only exact matches)
- ⚠️ Requires review after auto-fix

## Limitations

### What Auto-Fix Cannot Do

1. **Understand Intent**
   - Cannot determine if raw button is intentional for accessibility
   - Cannot know if custom switch has special business logic

2. **Complex Refactoring**
   - Cannot convert `<select>` to Select composition pattern
   - Cannot integrate react-hook-form for form components
   - Cannot refactor custom components with state management

3. **Context-Aware Changes**
   - Cannot determine optimal Tailwind class combinations
   - Cannot merge conflicting classNames
   - Cannot handle dynamic style calculations

### Best Practices

1. **Always dry-run first**
   ```bash
   node tools/gates/shadcn-enforcement-autofix.mjs --dry-run
   ```

2. **Review changes before committing**
   ```bash
   git diff
   ```

3. **Test after auto-fix**
   ```bash
   pnpm typecheck
   pnpm test
   ```

4. **Use safe mode by default**
   - Only use `--unsafe` when you understand the risks

5. **Manual review for complex cases**
   - Auto-fix handles simple violations
   - Complex patterns need human judgment

## Integration with CI

### Pre-commit Hook (Recommended)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Auto-fix shadcn violations before commit
node tools/gates/shadcn-enforcement-autofix.mjs

# Only allow commit if gate passes
node tools/gates/shadcn-enforcement.mjs
```

### CI Pipeline (Optional)

```yaml
# .github/workflows/ci.yml
- name: Auto-fix shadcn violations
  run: node tools/gates/shadcn-enforcement-autofix.mjs --dry-run
  continue-on-error: true

- name: Check shadcn enforcement
  run: node tools/gates/shadcn-enforcement.mjs
```

## Statistics

Based on AFENDA codebase analysis:

| Violation Type | Total | Auto-Fixable | Manual Required |
|----------------|-------|--------------|-----------------|
| RAW_INPUT | ~15 | 100% ✅ | 0% |
| RAW_TEXTAREA | ~8 | 100% ✅ | 0% |
| RAW_LABEL | ~20 | 100% ✅ | 0% |
| CUSTOM_SWITCH | ~12 | 0% ❌ | 100% |
| RAW_SELECT | ~6 | 0% ❌ | 100% |
| CUSTOM_CHECKBOX | ~4 | 0% ❌ | 100% |
| MISSING_IMPORT | ~10 | 100% ✅ | 0% |
| **Total** | **~75** | **~53 (70%)** | **~22 (30%)** |

**Conclusion:** Auto-fix can handle ~70% of violations automatically, saving significant developer time.

## Future Enhancements

### Planned Features

1. **Smart Select Conversion**
   - AI-powered detection of simple select patterns
   - Auto-generate Select composition for basic cases

2. **Custom Switch Migration**
   - Pattern matching for common switch implementations
   - Auto-replace with Switch component

3. **Interactive Mode**
   - Prompt for each fix with preview
   - Allow selective application

4. **Inline Style Analyzer**
   - Suggest Tailwind equivalents for complex inline styles
   - Generate className from style objects

## Related Documentation

- [shadcn-enforcement.md](./shadcn-enforcement.md) - Detection rules reference
- [shadcn-enforcement-improvements.md](./shadcn-enforcement-improvements.md) - Recent improvements
- [PROJECT.md](../../PROJECT.md) - Architecture guidelines

## Support

For issues or questions:
1. Check the gate documentation for manual fix examples
2. Review the auto-fix source code for transformation logic
3. File an issue if auto-fix produces incorrect results
