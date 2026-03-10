/**
 * globals-test — Design system token verification
 *
 * This page intentionally uses classes from globals.css / @afenda/ui design system.
 * If tokens are included in the build: bg-background, text-foreground, etc. render correctly.
 * If tokens are stripped: page appears unstyled or with fallback colors.
 *
 * Route: /auth/globals-test
 */
export default function GlobalsTestPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">
          globals.css token test
        </h1>
        <p className="text-muted-foreground">
          This page uses design system tokens from globals.css. If you see correct
          light/dark theming, the build pipeline is including :root and .dark rules.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
            <div className="text-sm font-medium text-foreground-secondary">Card</div>
            <div className="mt-1 text-sm text-muted-foreground">
              bg-card, text-card-foreground
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-100 p-4">
            <div className="text-sm font-medium text-foreground">Surface</div>
            <div className="mt-1 text-sm text-muted-foreground">
              bg-surface-100
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
            primary
          </span>
          <span className="rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">
            secondary
          </span>
          <span className="rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            muted
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Change theme (sun/moon in auth shell) — surfaces should change between
          light and dark. If they do not, design system tokens are missing from the build.
        </p>
      </div>
    </div>
  );
}
