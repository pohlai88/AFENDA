export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AFENDA-NEXUS</h1>
          <p className="text-sm text-muted-foreground mt-1">Business Truth Engine — v0.3</p>
        </div>

        <div className="border rounded-lg p-4 space-y-2 text-sm">
          <p className="font-medium">Infrastructure status</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>✅ Next.js 16 App Router</li>
            <li>✅ Tailwind CSS v4</li>
            <li>✅ OpenTelemetry + Jaeger tracing</li>
            <li>⏳ Auth — Sprint 0 pending</li>
            <li>⏳ Invoice submission — Sprint 1</li>
            <li>⏳ AP approval — Sprint 1</li>
            <li>⏳ GL ledger view — Sprint 1</li>
          </ul>
        </div>

        <div className="border rounded-lg p-4 space-y-2 text-sm">
          <p className="font-medium">Quick links</p>
          <ul className="space-y-1">
            <li>
              <a
                href="/finance/ap/invoices"
                className="text-primary hover:underline"
              >
                Finance / AP Invoices
              </a>
            </li>
            <li>
              <a
                href="/admin"
                className="text-primary hover:underline"
              >
                Admin / Observability
              </a>
            </li>
            <li>
              <a
                href="/admin/insights"
                className="text-primary hover:underline"
              >
                OTel Insights (Recommendations)
              </a>
            </li>
            <li>
              <a
                href="/admin/traces"
                className="text-primary hover:underline"
              >
                Traces (Jaeger)
              </a>
            </li>
            <li>
              <a
                href="http://localhost:3001/healthz"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                API /healthz
              </a>
            </li>
            <li>
              <a
                href="http://localhost:3001/v1"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                API /v1
              </a>
            </li>
            <li>
              <a
                href="http://localhost:16686"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Jaeger UI (standalone)
              </a>
            </li>
            <li>
              <a
                href="http://localhost:9001"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                MinIO console
              </a>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
