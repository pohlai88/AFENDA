/**
 * Evidence routes — document registration, presigned upload URLs, attach-evidence.
 *
 * Flow:
 *   1. POST /v1/evidence/presign          → presigned S3 PUT URL
 *   2. (client uploads directly to S3)
 *   3. POST /v1/documents                 → register document row in DB
 *   4. POST /v1/commands/attach-evidence  → link document to entity
 */

import type { FastifyInstance } from "fastify";
import {
  AttachEvidenceCommandSchema,
  RegisterDocumentCommandSchema,
  type OrgId,
  type EntityId,
  type CorrelationId,
  type AuditAction,
  type AuditEntityType,
} from "@afenda/contracts";
import { registerDocument, RegisterDocumentError, EvidencePolicyError, attachEvidence, writeAuditLog } from "@afenda/core";
import type { EvidencePolicyContext, UserId, WorkspaceId, EvidenceOperationId } from "@afenda/core";
import { generatePresignedUploadUrl } from "../services/s3.js";

export async function evidenceRoutes(app: FastifyInstance) {
  // ── Presigned upload URL (rate-limited to 10/min) ──────────────────────────
  app.post(
    "/evidence/presign",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = req.body as {
        filename?: string;
        contentType?: string;
      } | null;

      if (!body?.filename || !body?.contentType) {
        return reply.status(400).send({
          error: {
            code: "validationError",
            message: "filename and contentType are required",
          },
          correlationId: req.correlationId,
        });
      }

      const orgId = req.orgId;
      if (!orgId) {
        return reply.status(400).send({
          error: { code: "missingOrg", message: "Organization not resolved" },
          correlationId: req.correlationId,
        });
      }

      const objectKey = `${orgId}/${crypto.randomUUID()}/${body.filename}`;
      const bucket = process.env["S3_BUCKET"] ?? "afenda-dev";
      const expiresIn = 300; // 5 minutes

      const url = await generatePresignedUploadUrl({
        bucket,
        objectKey,
        contentType: body.contentType,
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

  // ── Register document (after S3 upload, rate-limited to 30/min) ────────────
  app.post(
    "/documents",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = RegisterDocumentCommandSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "validationError",
            message: "Invalid document registration",
            details: parsed.error.issues,
          },
          correlationId: req.correlationId,
        });
      }

      const orgId = req.orgId;
      if (!orgId) {
        return reply.status(400).send({
          error: { code: "missingOrg", message: "Organization not resolved" },
          correlationId: req.correlationId,
        });
      }

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
            objectKey: parsed.data.objectKey,
            sha256: parsed.data.sha256,
            mime: parsed.data.mime,
            sizeBytes: parsed.data.sizeBytes,
            uploadedByPrincipalId: req.ctx?.principalId,
          },
          { dedupBySha256: true },
          {
            operationId: parsed.data.idempotencyKey as unknown as EvidenceOperationId,
            policyCtx,
            nowUtc: new Date().toISOString(),
          },
        );
        result = out.result;
        auditEvent = out.auditEvent;
      } catch (err) {
        if (err instanceof RegisterDocumentError && err.code === "INVALID_INPUT") {
          return reply.status(400).send({
            error: { code: "validationError", message: err.message, details: err.details },
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
        data: { id: result.id, created: result.created, deduped: result.deduped, idempotentHit: result.idempotentHit },
        correlationId: req.correlationId,
      });
    },
  );

  // ── Attach evidence command (rate-limited to 30/min) ───────────────────────
  app.post(
    "/commands/attach-evidence",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = AttachEvidenceCommandSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: "validationError",
            message: "Invalid attach-evidence command",
            details: parsed.error.issues,
          },
          correlationId: req.correlationId,
        });
      }

      const orgId = req.orgId;
      if (!orgId) {
        return reply.status(400).send({
          error: { code: "missingOrg", message: "Organization not resolved" },
          correlationId: req.correlationId,
        });
      }

      const { entityType, entityId } = parsed.data.target;

      const evidenceId = await attachEvidence(app.db, {
        orgId: orgId as OrgId,
        documentId: parsed.data.documentId,
        entityType,
        entityId: entityId as unknown as EntityId,
        label: parsed.data.label,
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
          details: { evidenceId, documentId: parsed.data.documentId },
        },
      );

      return {
        data: { id: evidenceId },
        correlationId: req.correlationId,
      };
    },
  );
}
