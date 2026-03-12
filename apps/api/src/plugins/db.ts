/**
 * Fastify plugin: Drizzle DB client.
 *
 * Creates a pooled database client and decorates the Fastify instance
 * so that all routes can access `app.db`.
 *
 * Registers a shutdown hook (`onClose`) that drains the pool so
 * in-flight queries finish before the process exits.
 *
 * For Neon: runs warm-up with retry on startup to handle scale-to-zero cold starts.
 */

import type { FastifyPluginAsync } from "fastify";
import { createDb, warmUpDbWithRetry } from "@afenda/core";

export const dbPlugin: FastifyPluginAsync = async (app) => {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is required to start the API");

  const { db, pool } = createDb(url);
  app.decorate("db", db);

  app.addHook("onClose", async () => {
    app.log.info("Draining DB pool…");
    await pool.end();
  });

  if (url.includes("neon.tech")) {
    try {
      await warmUpDbWithRetry(db, { maxRetries: 3, initialDelayMs: 1000 });
      app.log.info("DB warm-up complete (Neon)");
    } catch (err) {
      app.log.error(err, "DB warm-up failed");
      throw err;
    }
  }

  app.log.info("DB client registered (pool max=%d)", pool.options.max);
};
