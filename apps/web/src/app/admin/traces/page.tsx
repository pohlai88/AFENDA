/**
 * /admin/traces — Embedded Jaeger UI.
 *
 * Proxied through Next.js rewrites to avoid CORS issues.
 * The Jaeger UI is served as an iframe for full functionality
 * (search, timeline, DAG, compare) without leaving the app.
 */

const JAEGER_UI = process.env.NEXT_PUBLIC_JAEGER_UI ?? "http://localhost:16686";

export default function TracesPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="border-b px-6 py-2 flex items-center gap-4 bg-card shrink-0">
        <h1 className="text-sm font-semibold">Traces</h1>
        <span className="text-xs text-muted-foreground">Jaeger UI embedded</span>
        <div className="ml-auto flex gap-3">
          <a
            href={`${JAEGER_UI}/search?service=afenda-api&limit=20`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Open in new tab ↗
          </a>
        </div>
      </div>

      {/* ── Jaeger iframe ─────────────────────────────────────────────────── */}
      <iframe
        src={`${JAEGER_UI}/search?service=afenda-api&limit=20`}
        className="flex-1 w-full border-0"
        title="Jaeger Trace UI"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}
