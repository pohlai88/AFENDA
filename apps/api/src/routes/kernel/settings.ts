/**
 * Settings routes — GET /v1/settings, PATCH /v1/settings.
 *
 * Deliberate REST exception: settings uses GET/PATCH rather than
 * POST /v1/commands/{verb} because config reads/writes are idiomatic
 * as resource-oriented operations. Documented in plan-general-settings.md §5.
 *
 * Permission checks are inline (no requirePermission helper exists yet).
 * PATCH is idempotent: Idempotency-Key header handled by idempotencyPlugin.
 */
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { ApiErrorResponseSchema, makeSuccessSchema, requireOrg, requireAuth } from "../../helpers/responses.js";
import {
  SettingKeyValues,
  UpdateSettingsCommandSchema,
  SettingsResponseSchema,
  SettingsSliceResponseSchema,
  type OrgId,
  type PrincipalId,
  type CorrelationId,
} from "@afenda/contracts";
import { getEffectiveSettings, upsertSettings, SettingsError } from "@afenda/core";

// ── Response schemas ──────────────────────────────────────────────────────────

const SettingsGetResponseSchema = makeSuccessSchema(SettingsSliceResponseSchema);
const SettingsPatchResponseSchema = makeSuccessSchema(SettingsSliceResponseSchema);

// ── Route registration ────────────────────────────────────────────────────────

export async function settingsRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // ── GET /v1/settings ───────────────────────────────────────────────────────
  typed.get(
    "/settings",
    {
      schema: {
        description:
          "Get effective settings for the org. Returns system defaults merged with org overrides. " +
          "Unknown keys in ?keys= are rejected with 400.",
        tags: ["Settings"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: z.object({
          keys: z
            .string()
            .transform((s) =>
              s
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
            )
            .pipe(z.array(z.enum(SettingKeyValues)))
            .optional(),
        }),
        response: {
          200: SettingsGetResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      if (!auth.permissionsSet.has("admin.settings.read")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.settings.read permission" },
          correlationId: req.correlationId,
        });
      }

      const effective = await getEffectiveSettings(
        app.db,
        orgId as OrgId,
        req.query.keys,
      );

      return { data: effective, correlationId: req.correlationId };
    },
  );

  // ── PATCH /v1/settings ─────────────────────────────────────────────────────
  typed.patch(
    "/settings",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description:
          "Atomically update one or more org settings. " +
          "Unknown keys → 400. Invalid values → 400. All-or-nothing transaction. " +
          "value: null clears the org override and falls back to system default.",
        tags: ["Settings"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: UpdateSettingsCommandSchema,
        response: {
          200: SettingsPatchResponseSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      if (!auth.permissionsSet.has("admin.settings.write")) {
        return reply.status(403).send({
          error: { code: "SHARED_FORBIDDEN", message: "Requires admin.settings.write permission" },
          correlationId: req.correlationId,
        });
      }

      try {
        const slice = await upsertSettings(
          app.db,
          orgId as OrgId,
          req.body.updates,
          auth.principalId as PrincipalId,
          req.correlationId as CorrelationId,
        );

        return { data: slice, correlationId: req.correlationId };
      } catch (err) {
        if (err instanceof SettingsError) {
          const status =
            err.code === "SHARED_FORBIDDEN"
              ? 403
              : 400;

          return reply.status(status).send({
            error: {
              code: err.code,
              message: err.message,
              ...(err.fieldPath ? { fieldPath: err.fieldPath } : {}),
            },
            correlationId: req.correlationId,
          });
        }
        throw err;
      }
    },
  );
}
