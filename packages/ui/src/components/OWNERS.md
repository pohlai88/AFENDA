# UI Primitives / Components

Domain: `packages/ui/src/components/`

## Purpose

Production-ready **shadcn/ui** component primitives installed via `shadcn@latest`.
These are the real components — not stubs.

**Current components (36 total):**
Accordion, Alert, AlertDialog, Avatar, Badge, Breadcrumb, Button, Calendar, Card, 
Checkbox, Combobox, Command, Dialog, DropdownMenu, Form, HoverCard, Input, 
InputGroup, Label, NavigationMenu, Pagination, Popover, Progress, RadioGroup, 
Select, Separator, Sheet, Sidebar, Skeleton, Spinner, Sonner (toasts), Switch, 
Table, Tabs, Textarea, Tooltip.

## Boundary

- Imports from: `react`, `react-dom`, `radix-ui`, `class-variance-authority`, `tailwind-merge`, `clsx` only
- Imported by: `packages/ui/src/field-kit/`, `packages/ui/src/generated/`, `apps/web`

## Adding a new component

```bash
pnpm --filter @afenda/ui dlx shadcn@latest add <component>
```

After adding, register the export in `src/components/index.ts`.

## Upgrade path

Components are managed by shadcn/ui and are copied source files (not an npm dep).
Update individual components with `shadcn@latest add --overwrite <component>`.
