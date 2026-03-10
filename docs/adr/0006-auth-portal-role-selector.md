# ADR-0006: Auth Portal Role Selector — Scrollable Pill Pattern

**Status:** Accepted  
**Date:** 2026-03-09  
**Author:** Architecture  
**Affects:** `apps/web/src/app/(public)/auth/signin/SignInTabs.tsx`

---

## 1. Context

AFENDA is a multi-portal SaaS platform. Each portal type represents a distinct user role that signs in to a different part of the product:

| Role | Portal value | Backend |
|------|-------------|---------|
| Personal | `app` | Core IAM |
| Organization | `app` | Core IAM |
| Supplier | `supplier` | Supplier Portal |
| Customer | `customer` | Customer Portal |
| Investor | `app` | Core IAM (dedicated portal upcoming) |
| Franchisee | *(planned)* | Franchise Portal (upcoming) |
| Member | *(planned)* | Member Portal (upcoming) |

The original login page used a **4-column `<Tabs>` grid** (shadcn `TabsList` / `TabsTrigger`). This worked for 4 roles but has two fundamental scaling problems:

1. **Layout breaks** — a 5th or 6th column collapses the grid into unreadable slivers or wraps unexpectedly.
2. **Code duplication** — each role required its own `<TabsContent>` block with a full copy of the form JSX (~80 lines per role × 4 roles = 320 lines of repeated markup).

As the number of portals grows, both problems compound. A new portal type required:
- Adding a tab trigger
- Adding a full `<TabsContent>` with a duplicated form
- Updating the `AuthTab` union type
- Updating the `TAB_META` lookup object

Touching four separate places for a single logical addition is error-prone and inconsistent.

---

## 2. Decision

Replace the fixed-column `<Tabs>` grid with a **horizontally-scrollable pill-button row** backed by a single data-driven `ROLES` array.

### 2.1 Selector — scrollable pill row

```tsx
<div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
  {ROLES.map(({ value, label, icon: Icon }) => (
    <Button
      key={value}
      variant={activeRole === value ? "default" : "outline"}
      size="sm"
      className="flex-none gap-1.5 rounded-full"
      onClick={() => handleRoleChange(value)}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  ))}
</div>
```

- `flex-none` prevents pills from shrinking — they maintain their natural width
- `overflow-x-auto` + hidden scrollbar — mobile users swipe right, desktop users scroll
- `rounded-full` — visually distinct from action buttons (square/rounded-md)

### 2.2 Form — single instance, reactive to active role

Instead of one form per tab, a single `<form>` reads from `ROLE_MAP[activeRole]` for its labels, submit text, Google SSO visibility, and footer links. Switching roles only changes state; the DOM form is reused.

```tsx
const role = ROLE_MAP[activeRole];  // Role switches = one state change
```

### 2.3 ROLES array — single source of truth

All per-role configuration lives in one place:

```ts
const ROLES = [
  {
    value: "personal",
    label: "Personal",
    icon: User,
    portal: "app" as PortalType,
    emailLabel: "Email",
    description: "Sign in with your personal AFENDA account",
    submitLabel: "Sign in",
    showGoogle: true,
    footerLinks: [
      { href: "/auth/reset-password", label: "Forgot password?" },
      { href: "/auth/signup", label: "Create account" },
    ],
  },
  // ... more roles
] as const;
```

`as const` gives full TypeScript inference — `RoleValue` is derived automatically and is always in sync.

---

## 3. Rationale — Why not keep `<Tabs>`

| Concern | `<Tabs>` grid | Pill row |
|---------|---------------|----------|
| **Adding a 5th+ role** | Grid column breaks layout | Pill scrolls — no layout change |
| **Code per new role** | +80 lines of JSX (full form copy) | +1 object in the `ROLES` array |
| **Type sync** | Manual union type update required | `typeof ROLES[number]["value"]` auto-derives |
| **Mobile layout** | 4-col grid is cramped on phones | Horizontal swipe, pills stay readable |
| **Semantic HTML** | `<button role="tab">` — correct for tabs | `<Button>` — correct for a selector |
| **Future portals** | O(n) changes | O(1) changes |

---

## 4. How to add a new portal role

Add a single entry to the `ROLES` array in `SignInTabs.tsx`. No other files change.

```ts
{
  value: "franchisee",           // URL-safe identifier (also used as React key)
  label: "Franchisee",           // Display label in the pill selector
  icon: Store,                   // Lucide icon — import at file top
  portal: "app" as PortalType,   // Backend portal routing value (update when backend ships)
  emailLabel: "Franchise email", // Label on the email input
  description: "Manage your franchise location and team", // Sub-label below selector
  submitLabel: "Sign in to Franchise Portal",             // Submit button text
  showGoogle: false,             // Whether to show "Continue with Google"
  footerLinks: [
    { href: "/auth/reset-password", label: "Forgot password?" },
    { href: "/auth/portal/accept", label: "Accept invitation" },
  ],
},
```

### Portal value mapping

`PortalType` is defined in `packages/contracts/src/kernel/identity/auth.commands.ts`:

```ts
export const PortalTypeValues = ["app", "supplier", "customer"] as const;
```

Until a dedicated backend portal ships for a new role, map `portal` to `"app"`. When the backend adds a new portal type:

1. Add the new value to `PortalTypeValues` in `auth.commands.ts`
2. Update the role's `portal` field in `ROLES`
3. Add a migration for any portal-specific DB columns

---

## 5. Consequences

### Positive

- **O(1) portal additions** — one array entry, zero form duplication
- **Always in sync** — `RoleValue` type is derived at compile-time from `ROLES`; forgetting to update a lookup is impossible
- **Indefinitely scalable** — 10, 20, 30 portals — the pill row scrolls; the form template stays the same
- **Smaller bundle** — one form instance vs. N form instances (N × ~80 rendered JSX nodes)
- **Better accessibility** — `<Button>` focus/keyboard navigation vs. compound `<Tabs>` aria roles that require arrow-key navigation

### Negative / Trade-offs

- **No URL-synced tab** — the selected role lives in React state, not the URL. A deep link like `/auth/signin?role=supplier` would require reading `searchParams` and passing as `defaultTab` prop (already supported — just needs the page to wire it up)
- **No animated tab underline** — the shadcn `Tabs` sliding indicator is gone; replaced by `variant="default"` pill fill which is intentional and simpler

---

## 6. Implementation notes

### Readonly footerLinks

The `ROLES` array is declared `as const`, making `footerLinks` a `readonly` tuple. `AuthFooterLinks` was updated to accept `readonly AuthFooterLink[]` to be compatible:

```ts
// auth-footer-links.tsx
export function AuthFooterLinks({ links }: { links: readonly AuthFooterLink[] }) {
```

### Tab → Role naming

Internal identifiers were renamed from `activeTab` / `AuthTab` to `activeRole` / `RoleValue` to reflect that this is about _portal roles_, not tabs.

### Unused imports removed

`Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` were removed from the `@afenda/ui` import. `TrendingUp` (Investor icon) was added to the lucide-react import.
