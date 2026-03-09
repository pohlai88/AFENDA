# shadcn CLI Workflow

AFENDA uses the shadcn CLI to add components to `packages/ui`. The CLI is run from `apps/web` (which has valid Next.js + Tailwind v4 config) and targets `packages/ui` via `--path`.

## Why run from apps/web?

The shadcn CLI validates:
- Framework (Next.js)
- Tailwind CSS v4
- Import aliases

`packages/ui` is a library package without Next.js, so `npx shadcn add` fails there with "Invalid configuration". `apps/web` has the required setup.

## Add a component to packages/ui

```bash
cd apps/web
npx shadcn@latest add <component> -y -p ../../packages/ui/src/components
```

Examples:

```bash
npx shadcn@latest add scroll-area -y -p ../../packages/ui/src/components
npx shadcn@latest add resizable -y -p ../../packages/ui/src/components
npx shadcn@latest add chart -y -o -p ../../packages/ui/src/components
```

Use `-o` (overwrite) when the component may update existing files (e.g. chart updates card).

## After adding

1. **Export from barrel** — Add the new component to `packages/ui/src/components/index.ts`.
2. **Dependencies** — The CLI adds deps to `apps/web`. If the component lives in `packages/ui`, add the same deps to `packages/ui/package.json` (e.g. `react-resizable-panels`, `recharts`).
3. **pnpm install** — Run from repo root.

## Update a component

```bash
cd apps/web
npx shadcn@latest add <component> -y -o -p ../../packages/ui/src/components
```

`-o` overwrites the existing file with the latest from the registry.
