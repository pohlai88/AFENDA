/**
 * Fastify plugin: Drizzle DB client.
 *
 * Creates a pooled database client and decorates the Fastify instance
 * so that all routes can access `app.db`.
 *
 * Registers a shutdown hook (`onClose`) that drains the pool so
 * in-flight queries finish before the process exits.
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { createDb } from "@afenda/core";

export const dbPlugin = fp(async function dbPlugin(app: FastifyInstance) {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is required to start the API");

  const { db, pool } = createDb(url);
  app.decorate("db", db);

  app.addHook("onClose", async () => {
    app.log.info("Draining DB pool…");
    await pool.end();
  });

  app.log.info("DB client registered (pool max=%d)", pool.options.max);
});
