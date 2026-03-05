/**
 * Fastify plugin: Drizzle DB client.
 *
 * Creates a pooled database client and decorates the Fastify instance
 * so that all routes can access `app.db`.
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { createDbClient } from "@afenda/core";

export const dbPlugin = fp(async function dbPlugin(app: FastifyInstance) {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is required to start the API");

  const db = createDbClient(url);
  app.decorate("db", db);
  app.log.info("DB client registered");
});
