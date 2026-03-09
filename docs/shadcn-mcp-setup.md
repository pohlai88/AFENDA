# shadcn MCP Setup - AFENDA

**Date:** March 7, 2026  
**Status:** ✅ Configured & Ready

---

## Overview

The shadcn MCP (Model Context Protocol) server has been initialized for AFENDA following best practices. This enables AI assistants in Cursor to directly browse, search, and install shadcn/ui components using natural language.

---

## Configuration Files

### 1. `.cursor/mcp.json`

Located at: `c:\NexusCanon\AFENDA\.cursor\mcp.json`

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

**Purpose:** Tells Cursor how to connect to the shadcn MCP server.

### 2. `packages/ui/components.json`

Located at: `c:\NexusCanon\AFENDA\packages\ui\components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "tailwind": {
    "config": "",
    "css": "src/styles/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "registries": {
    "shadcn": "https://ui.shadcn.com/r/{name}.json"
  }
}
```

**Key Configuration:**
- **Style:** `new-york` (cleaner, modern design)
- **CSS Variables:** Enabled (follows AFENDA's no-hardcoded-colors rule)
- **Base Color:** `neutral` (aligns with design system)
- **Icon Library:** `lucide` (optimal for React)
- **Registry:** Official shadcn/ui registry configured

---

## Best Practices Implemented

### ✅ 1. No Hardcoded Values
- Uses CSS variables (`cssVariables: true`)
- Base color system via Tailwind tokens
- No inline color values

### ✅ 2. Only shadcn Primitives
- All components from official shadcn/ui registry
- Uses Radix UI primitives under the hood
- No custom component modifications
- Clean separation via `@afenda/ui` package

### ✅ 3. Optimized Configuration
- TypeScript enabled (`tsx: true`)
- Path aliases configured for clean imports
- Proper workspace structure in monorepo
- Registry configured for MCP access

### ✅ 4. AFENDA Architecture Compliance
- Components in `packages/ui/` (correct layer)
- Follows Import Direction Law (ui → contracts only)
- Uses `@afenda/ui` package exports
- Enforced by shadcn-enforcement CI gate

---

## How to Use

### 1. Enable in Cursor Settings

1. Open Cursor Settings
2. Navigate to MCP Servers section
3. Find `shadcn` server in the list
4. Click to enable (you should see a green dot)
5. Verify tools are listed

### 2. Natural Language Commands

You can now use natural language to work with components:

**Browse Components:**
```
Show me all available shadcn components
List components in the shadcn registry
What shadcn components are available?
```

**Install Components:**
```
Add the button and dialog components
Install the data-table component
Add a form with input and label from shadcn
```

**Search Components:**
```
Find me a calendar picker
Search for dropdown components
Show me all form components
```

### 3. Programmatic Installation

You can also use the CLI directly:

```bash
# From packages/ui directory
cd packages/ui

# Add a component
pnpm dlx shadcn@latest add button

# Add multiple components
pnpm dlx shadcn@latest add button dialog card

# List available components
pnpm dlx shadcn@latest list
```

---

## Component Organization

### Current Components (35 total)

All components are in `packages/ui/src/components/`:

**Form Controls:**
- `button.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`
- `checkbox.tsx`, `switch.tsx`, `radio-group.tsx`
- `select.tsx`, `combobox.tsx`, `calendar.tsx`

**Layout:**
- `card.tsx`, `separator.tsx`, `tabs.tsx`
- `accordion.tsx`, `sidebar.tsx`

**Navigation:**
- `navigation-menu.tsx`, `breadcrumb.tsx`, `pagination.tsx`

**Feedback:**
- `alert.tsx`, `alert-dialog.tsx`, `dialog.tsx`
- `sheet.tsx`, `tooltip.tsx`, `hover-card.tsx`
- `sonner.tsx` (toast notifications)

**Data Display:**
- `table.tsx`, `badge.tsx`, `avatar.tsx`
- `progress.tsx`, `skeleton.tsx`

**Advanced:**
- `form.tsx`, `command.tsx`, `popover.tsx`
- `dropdown-menu.tsx`, `input-group.tsx`

### Import Pattern

```typescript
// ✅ Correct - from @afenda/ui package
import { Button, Input, Label } from "@afenda/ui";

// ✅ Correct - within packages/ui/src
import { Button } from "@/components/button";

// ❌ Never - direct Radix imports
import * as Button from "@radix-ui/react-button";
```

---

## CI Gate Compliance

### shadcn-enforcement.mjs

The project has a CI gate that enforces shadcn usage:

```bash
# Check for violations
node tools/gates/shadcn-enforcement.mjs

# Auto-fix simple violations
node tools/gates/shadcn-enforcement-autofix.mjs
```

**Rules Enforced:**
- No raw HTML form elements (`<input>` → `<Input>`)
- No raw HTML buttons (`<button>` → `<Button>`)
- No direct Radix UI imports
- All UI must use shadcn components

**Exemption Marker:**
```tsx
{/* shadcn-exempt: Simple icon button */}
<button type="button" aria-label="Close">×</button>
```

---

## Registry Configuration

### Default Registry

The official shadcn/ui registry is configured:

```json
"registries": {
  "shadcn": "https://ui.shadcn.com/r/{name}.json"
}
```

### Adding Custom Registries

If you create a private component registry:

```json
"registries": {
  "shadcn": "https://ui.shadcn.com/r/{name}.json",
  "@afenda": "https://registry.afenda.com/r/{name}.json"
}
```

Then use with namespace:

```bash
pnpm dlx shadcn@latest add @afenda/custom-component
```

Or via MCP:

```
Install the custom-component from the afenda registry
```

---

## Troubleshooting

### MCP Server Not Showing

1. Check `.cursor/mcp.json` exists in project root
2. Restart Cursor completely
3. Check Cursor Settings → MCP Servers → shadcn (should show "Connected")
4. Try command: `/mcp` in Cursor to debug

### Components Not Installing

1. Verify `components.json` exists in `packages/ui/`
2. Check working directory: `cd packages/ui`
3. Ensure pnpm is available: `pnpm --version`
4. Check registry URL is accessible

### Import Errors

1. Verify `@afenda/ui` is in dependencies
2. Check TypeScript path aliases in `tsconfig.json`
3. Ensure component is exported in `packages/ui/src/index.ts`
4. Run `pnpm typecheck` to verify

### CI Gate Failures

```bash
# Check what's wrong
node tools/gates/shadcn-enforcement.mjs

# Auto-fix violations
node tools/gates/shadcn-enforcement-autofix.mjs

# Run all gates
pnpm check:all
```

---

## Architecture Alignment

### AFENDA Principles

**✅ Truth-First**  
- Components use CSS variables (reproducible themes)
- No hardcoded styles or colors
- Type-safe via TypeScript

**✅ Import Direction Law**  
- `ui` package only imports from `contracts`
- Never imports from `core`, `db`, `api`
- Clean dependency graph

**✅ Pillar Structure**  
- UI components organized by pillar:
  - `kernel/` - Admin, auth, settings UI
  - `erp/` - Business domain UI (invoices, suppliers)
  - `comm/` - Notification UI
  - `shared/` - Utilities

**✅ Design System**  
- All components use shadcn/ui primitives
- Consistent composition patterns
- Accessible by default (Radix UI)

---

## Example Usage Scenarios

### Scenario 1: Build a Form

**Natural Language (via MCP):**
```
Create a form with input, label, button, and textarea from shadcn
```

**Result:**
```tsx
import { Button, Input, Label, Textarea } from "@afenda/ui";

export function ContactForm() {
  return (
    <form>
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Your name" />
      </div>
      
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" placeholder="Your message" />
      </div>
      
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### Scenario 2: Add Data Table

**Natural Language (via MCP):**
```
Add the table component from shadcn
```

**Manual CLI:**
```bash
cd packages/ui
pnpm dlx shadcn@latest add table
```

**Usage:**
```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@afenda/ui";

export function InvoiceTable({ invoices }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map(invoice => (
          <TableRow key={invoice.id}>
            <TableCell>{invoice.number}</TableCell>
            <TableCell>{invoice.amount}</TableCell>
            <TableCell>{invoice.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### Scenario 3: Dialog Modal

**Natural Language (via MCP):**
```
Show me how to use the dialog component
```

**Usage:**
```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@afenda/ui";
import { Button } from "@afenda/ui";

export function ApproveInvoiceDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Approve Invoice</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Invoice</DialogTitle>
          <DialogDescription>
            Are you sure you want to approve this invoice?
          </DialogDescription>
        </DialogHeader>
        <div>
          <Button>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Maintenance

### Updating shadcn CLI

The MCP server always uses the latest version via `npx shadcn@latest`. No maintenance needed.

### Updating Components

To update all shadcn components to latest versions:

```bash
cd packages/ui

# List outdated
pnpm dlx shadcn@latest diff

# Update specific component
pnpm dlx shadcn@latest add button --overwrite

# Update all (careful!)
pnpm dlx shadcn@latest add --all --overwrite
```

### Adding New Components

Always use the CLI or MCP to ensure consistency:

```bash
# Via CLI
pnpm dlx shadcn@latest add <component-name>

# Via MCP (natural language)
"Add the <component-name> component from shadcn"
```

**Never:**
- Copy component code manually
- Modify component internals directly
- Add custom Radix UI components without shadcn wrapper

---

## Documentation References

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [MCP Documentation](https://ui.shadcn.com/docs/mcp)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Tailwind CSS Variables](https://tailwindcss.com/docs/customizing-colors#using-css-variables)
- [AFENDA Architecture](../PROJECT.md)
- [CI Gates Documentation](./ci-gates/shadcn-enforcement.md)

---

## Summary

✅ **shadcn MCP server configured for Cursor**  
✅ **All components use shadcn/ui primitives**  
✅ **CSS variables enabled (no hardcoded colors)**  
✅ **Official registry configured**  
✅ **CI gate enforcement active**  
✅ **Architecture compliant**  

**Next Steps:**
1. Restart Cursor to activate MCP server
2. Enable shadcn server in Cursor Settings
3. Test with: "Show me all shadcn components"
4. Start building with natural language commands

---

**Last Updated:** March 7, 2026  
**Maintained By:** AFENDA Core Team  
**Version:** 1.0
