/**
 * Evidence routes â€” document registration, presigned upload URLs, attach-evidence.
 *
 * Flow:
 *   1. POST /v1/evidence/presign          â†’ presigned S3 PUT URL
 *   2. (client uploads directly to S3)
 *   3. POST /v1/documents                 â†’ register document row in DB
 *   4. POST /v1/commands/attach-evidence  â†’ link document to entity
 *
 * All routes use Zod type provider for automatic request validation and
 * OpenAPI schema generation. Manual `safeParse` is replaced by Fastify's
 * validator compiler â€” validation errors return a structured 400 response.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  ApiErrorResponseSchema,
  makeSuccessSchema,
  requireOrg,
  ERR,
} from "../../helpers/responses.js";
import {
  AttachEvidenceCommandSchema,
  RegisterDocumentCommandSchema,
  type OrgId,
  type EntityId,
  type CorrelationId,
  type AuditAction,
  type AuditEntityType,
} from "@afenda/contracts";
import {
  registerDocument,
  RegisterDocumentError,
  EvidencePolicyError,
  attachEvidence,
  writeAuditLog,
  listDocuments,
  getEffectiveSettings,
} from "@afenda/core";
import type { EvidencePolicyContext, UserId, WorkspaceId, EvidenceOperationId } from "@afenda/core";
import {
  generatePresignedUploadUrl,
  resolveStorageBucket,
  resolveStorageProviderName,
} from "../../services/s3.js";
import { CursorParamsSchema } from "@afenda/contracts";
import { requireAuth } from "../../helpers/responses.js";
import { serializeDate } from "../../helpers/dates.js";

// â”€â”€ List documents schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const DocumentListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      orgId: z.string().uuid(),
      objectKey: z.string(),
      mime: z.string(),
      sizeBytes: z.number(),
      originalFileName: z.string().nullable(),
      uploadedAt: z.string().datetime(),
    }),
  ),
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  correlationId: z.string().uuid(),
});

// â”€â”€ Presign schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PresignBodySchema = z.object({
  filename: z.string().trim().min(1).max(255).describe("Name of the file to upload"),
  contentType: z.string().trim().min(1).max(100).describe("MIME type of the file"),
  sizeBytes: z.number().int().positive().safe().describe("Upload size in bytes"),
});

const StoragePolicySettingKeys = [
  "general.storage.maxUploadBytes",
  "general.storage.allowedMimeTypes",
  "general.storage.retentionDays",
] as const;

type StoragePolicy = {
  maxUploadBytes: number;
  allowedMimeTypes: Set<string>;
  retentionDays: number;
};

function parseMimeTypeAllowList(raw: unknown): Set<string> {
  if (typeof raw !== "string") return new Set();
  return new Set(
    raw
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function resolveStoragePolicy(app: FastifyInstance, orgId: OrgId): Promise<StoragePolicy> {
  const slice = await getEffectiveSettings(app.db, orgId, [...StoragePolicySettingKeys]);

  const maxUploadBytes = Number(slice["general.storage.maxUploadBytes"]?.value ?? 10485760);
  const retentionDays = Number(slice["general.storage.retentionDays"]?.value ?? 365);
  const allowedMimeTypes = parseMimeTypeAllowList(
    slice["general.storage.allowedMimeTypes"]?.value ?? "",
  );

  return {
    maxUploadBytes: Number.isFinite(maxUploadBytes) ? maxUploadBytes : 10485760,
    allowedMimeTypes,
    retentionDays: Number.isFinite(retentionDays) ? retentionDays : 365,
  };
}

function rejectByStoragePolicy(
  policy: StoragePolicy,
  payload: { contentType: string; sizeBytes: number },
  req: Parameters<typeof requireOrg>[0],
  reply: Parameters<typeof requireOrg>[1],
): boolean {
  const contentType = payload.contentType.trim().toLowerCase();
  if (policy.allowedMimeTypes.size > 0 && !policy.allowedMimeTypes.has(contentType)) {
    reply.status(400).send({
      error: {
        code: ERR.VALIDATION,
        message: `Blocked by storage policy: MIME type \"${payload.contentType}\" is not allowed`,
        fieldPath: "contentType",
      },
      correlationId: req.correlationId,
    });
    return true;
  }

  if (payload.sizeBytes > policy.maxUploadBytes) {
    reply.status(400).send({
      error: {
        code: ERR.VALIDATION,
        message: `Blocked by storage policy: sizeBytes exceeds maxUploadBytes (${policy.maxUploadBytes})`,
        fieldPath: "sizeBytes",
      },
      correlationId: req.correlationId,
    });
    return true;
  }

  return false;
}

const PresignResponseSchema = makeSuccessSchema(
  z.object({
    url: z.string().url().describe("Presigned S3 PUT URL â€” upload directly to this URL"),
    objectKey: z.string().describe("S3 object key (use when registering the document)"),
    bucket: z.string().describe("S3 bucket name"),
    expiresAt: z.string().datetime().describe("ISO 8601 expiry timestamp for the presigned URL"),
  }),
);

// â”€â”€ Register document schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RegisterDocumentResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid().describe("Document ID"),
    created: z.boolean().describe("Whether a new document row was created"),
    deduped: z.boolean().describe("Whether the document was deduplicated by SHA-256"),
    idempotentHit: z.boolean().describe("Whether this was an idempotent replay"),
  }),
);

// â”€â”€ Attach evidence schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AttachEvidenceResponseSchema = makeSuccessSchema(
  z.object({
    id: z.string().uuid().describe("Evidence link ID"),
  }),
);

export async function evidenceRoutes(app: FastifyInstance) {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  // â”€â”€ List documents â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.get(
    "/documents",
    {
      schema: {
        description: "List documents for the org with cursor pagination.",
        tags: ["Evidence"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        querystring: CursorParamsSchema,
        response: {
          200: DocumentListSchema,
          400: ApiErrorResponseSchema,
          401: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const page = await listDocuments(app.db, orgId as OrgId, {
        cursor: req.query.cursor,
        limit: req.query.limit,
      });

      return {
        data: page.data,
        cursor: page.cursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Presigned upload URL (rate-limited to 10/min) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/evidence/presign",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        description: "Generate a presigned S3 upload URL for direct browser uploads.",
        tags: ["Evidence"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: PresignBodySchema,
        response: {
          200: PresignResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;
      const auth = requireAuth(req, reply);
      if (!auth) return;

      const { filename, contentType, sizeBytes } = req.body;
      const policy = await resolveStoragePolicy(app, orgId as OrgId);
      if (rejectByStoragePolicy(policy, { contentType, sizeBytes }, req, reply)) return;

      const objectKey = `${orgId}/${crypto.randomUUID()}/${filename}`;
      const bucket = resolveStorageBucket();
      const expiresIn = 300; // 5 minutes

      const url = await generatePresignedUploadUrl({
        bucket,
        objectKey,
        contentType,
        expiresIn,
      });

      return {
        data: {
          url,
          objectKey,
          bucket,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        },
        correlationId: req.correlationId,
      };
    },
  );

  // â”€â”€ Register document (after S3 upload, rate-limited to 30/min) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/documents",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description:
          "Register a document after uploading to S3. Deduplicates by SHA-256 hash. Idempotent on `idempotencyKey`.",
        tags: ["Evidence"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: RegisterDocumentCommandSchema,
        response: {
          200: RegisterDocumentResponseSchema,
          201: RegisterDocumentResponseSchema,
          400: ApiErrorResponseSchema,
          403: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const policy = await resolveStoragePolicy(app, orgId as OrgId);
      if (
        rejectByStoragePolicy(
          policy,
          { contentType: req.body.mime, sizeBytes: req.body.sizeBytes },
          req,
          reply,
        )
      )
        return;

      let result;
      let auditEvent;
      try {
        const policyCtx: EvidencePolicyContext = {
          principalUserId: (req.ctx?.principalId ?? "anonymous") as UserId,
          workspaceId: orgId as unknown as WorkspaceId,
          permissions: req.ctx?.permissions ?? [],
        };

        const out = await registerDocument(
          app.db,
          {
            orgId: orgId as OrgId,
            objectKey: req.body.objectKey,
            sha256: req.body.sha256,
            mime: req.body.mime,
            sizeBytes: req.body.sizeBytes,
            uploadedByPrincipalId: req.ctx?.principalId,
            storageProvider: resolveStorageProviderName(),
            storageBucket: resolveStorageBucket(),
            storageMetadata: {
              retentionDays: policy.retentionDays,
              retentionUntilUtc: new Date(
                Date.now() + policy.retentionDays * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          },
          { dedupBySha256: true },
          {
            operationId: req.body.idempotencyKey as unknown as EvidenceOperationId,
            policyCtx,
            nowUtc: new Date().toISOString(),
          },
        );
        result = out.result;
        auditEvent = out.auditEvent;
      } catch (err) {
        if (err instanceof RegisterDocumentError && err.code === "INVALID_INPUT") {
          return reply.status(400).send({
            error: { code: ERR.VALIDATION, message: err.message, details: err.details },
            correlationId: req.correlationId,
          });
        }
        if (err instanceof EvidencePolicyError) {
          return reply.status(403).send({
            error: { code: err.code, message: err.message, details: err.details },
            correlationId: req.correlationId,
          });
        }
        throw err;
      }

      // Persist the canonical audit event returned by the registry
      if (auditEvent) {
        await writeAuditLog(
          app.db,
          { activeContext: { orgId: orgId as OrgId } },
          {
            actorPrincipalId: req.ctx?.principalId ?? null,
            action: auditEvent.type as AuditAction,
            entityType: "document" satisfies AuditEntityType,
            entityId: result.id as EntityId,
            correlationId: req.correlationId as CorrelationId,
            details: {
              operationId: (auditEvent.operationId as string | undefined) ?? null,
              objectKey: auditEvent.objectKey,
              sha256: auditEvent.sha256,
              mime: auditEvent.mime,
              sizeBytes: auditEvent.sizeBytes,
              created: auditEvent.created,
              deduped: auditEvent.deduped,
              idempotentHit: auditEvent.idempotentHit,
            },
          },
        );
      }

      return reply.status(result.created ? 201 : 200).send({
        data: {
          id: result.id,
          created: result.created,
          deduped: result.deduped,
          idempotentHit: result.idempotentHit,
        },
        correlationId: req.correlationId,
      });
    },
  );

  // â”€â”€ Attach evidence command (rate-limited to 30/min) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typed.post(
    "/commands/attach-evidence",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        description: "Link an uploaded document to a domain entity (invoice, journal entry, etc.).",
        tags: ["Evidence"],
        security: [{ bearerAuth: [] }, { devAuth: [] }],
        body: AttachEvidenceCommandSchema,
        response: {
          200: AttachEvidenceResponseSchema,
          400: ApiErrorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const orgId = requireOrg(req, reply);
      if (!orgId) return;

      const { entityType, entityId } = req.body.target;

      const evidenceId = await attachEvidence(app.db, {
        orgId: orgId as OrgId,
        documentId: req.body.documentId,
        entityType,
        entityId: entityId as unknown as EntityId,
        label: req.body.label,
      });

      await writeAuditLog(
        app.db,
        { activeContext: { orgId: orgId as OrgId } },
        {
          actorPrincipalId: req.ctx?.principalId ?? null,
          action: "evidence.attached" satisfies AuditAction,
          entityType: "evidence" satisfies AuditEntityType,
          entityId: entityId as unknown as EntityId,
          correlationId: req.correlationId as CorrelationId,
          details: { evidenceId, documentId: req.body.documentId },
        },
      );

      return {
        data: { id: evidenceId },
        correlationId: req.correlationId,
      };
    },
  );
}
