/**
 * Shared Pino logger for the AFENDA monorepo.
 *
 * - **Development**: human-readable colorized output via pino-pretty
 * - **Production**: structured JSON for log aggregation (Datadog, ELK, etc.)
 *
 * Usage (from any package that depends on @afenda/core):
 *
 *   // Use the default singleton
 *   logger.info("hello");
 *
 *   // Or create a named child logger for a specific service
 *   const log = createLogger("api");
 *   log.info({ port: 3001 }, "API listening");
 */
import pino, { type Logger, type LoggerOptions } from "pino";

const isDev = process.env.NODE_ENV !== "production";

const devTransport: LoggerOptions["transport"] = {
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "HH:MM:ss.l",
    ignore: "pid,hostname",
  },
};

const baseOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),

  // Bind app name into every log line — useful for multi-service log aggregation
  base: { app: "afenda" },

  // ISO timestamps in production; pino-pretty handles its own in dev
  timestamp: isDev ? false : pino.stdTimeFunctions.isoTime,

  // Structured serializers — ensure errors always include stack traces
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // Redact sensitive fields that may leak into structured logs
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "secret",
      "token",
      "apiKey",
    ],
    censor: "[REDACTED]",
  },

  // Use pino-pretty transport only in dev
  ...(isDev ? { transport: devTransport } : {}),
};

/**
 * Default application-wide logger instance.
 * Prefer `createLogger(name)` for service-specific loggers.
 */
export const logger: Logger = pino(baseOptions);

/**
 * Create a named child logger for a specific service or domain.
 *
 * @param name - Service name (e.g. "api", "worker", "iam")
 * @returns A pino child logger with `service` bound
 */
export function createLogger(name: string): Logger {
  return logger.child({ service: name });
}
