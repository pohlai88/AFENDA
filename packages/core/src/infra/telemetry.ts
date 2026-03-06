/**
 * Telemetry bootstrap — minimal OpenTelemetry auto-instrumentation.
 *
 * Must be called BEFORE any other imports in the process entry point
 * so the SDK can monkey-patch `http`, `pg`, etc. before they are loaded.
 *
 * Environment variables:
 *   OTEL_ENABLED          — "true" to activate (default: disabled)
 *   OTEL_SERVICE_NAME     — service name (e.g. "afenda-api", "afenda-worker")
 *   OTEL_EXPORTER_OTLP_ENDPOINT — e.g. "http://localhost:4318"
 *   OTEL_EXPORTER_OTLP_PROTOCOL — "http/protobuf" (default) or "grpc"
 *
 * When OTEL_ENABLED is not "true", this module is a no-op so it is safe
 * to import unconditionally.
 */

let _bootstrapped = false;

/**
 * Initialise OpenTelemetry SDK with auto-instrumentations.
 *
 * Safe to call multiple times — only the first call takes effect.
 * Returns `true` if the SDK was started, `false` if it was already
 * running or is disabled via env.
 */
export async function bootstrapTelemetry(serviceName?: string): Promise<boolean> {
  if (_bootstrapped) return false;

  const enabled = process.env["OTEL_ENABLED"] === "true";
  if (!enabled) return false;

  _bootstrapped = true;

  try {
    // Dynamic imports — only loaded when OTel is enabled so the deps
    // are not required at all in environments that don't use them.
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { BatchSpanProcessor } = await import("@opentelemetry/sdk-trace-base");

    const endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4318";

    const traceExporter = new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
    });

    const sdk = new NodeSDK({
      serviceName: serviceName ?? process.env["OTEL_SERVICE_NAME"] ?? "afenda",
      spanProcessors: [
        new BatchSpanProcessor(traceExporter, {
          maxQueueSize: 2048,
          maxExportBatchSize: 512,
          scheduledDelayMillis: 5_000,
          exportTimeoutMillis: 30_000,
        }),
      ],
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation — too noisy for dev
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    sdk.start();

    // Graceful shutdown on process exit
    const shutdown = async () => {
      try {
        await sdk.shutdown();
      } catch {
        // Swallow — process is exiting anyway
      }
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);

    return true;
  } catch (err) {
    // If OTel deps are not installed, log and continue without tracing.
    // This prevents hard failures in envs that don't need observability.
    console.warn("[telemetry] failed to bootstrap OTel:", err);
    return false;
  }
}
