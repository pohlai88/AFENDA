/**
 * OTel preload — must be loaded BEFORE any other module via --import flag.
 *
 * ESM static imports are hoisted above runtime code, so calling
 * bootstrapTelemetry() inside index.ts (after static imports) is too late —
 * `http`, `pg`, etc. are already loaded before OTel can monkey-patch them.
 *
 * Solution: load this file via `--import ./src/otel-preload.ts` in the
 * node/tsx command so it runs before index.ts imports resolve.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const enabled = process.env["OTEL_ENABLED"] === "true";

if (enabled) {
  const { bootstrapTelemetry } = await import("@afenda/core");
  const started = await bootstrapTelemetry("afenda-api");
  if (started) {
    console.log("[otel-preload] OpenTelemetry SDK started — exporting to", process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]);
  }
}
