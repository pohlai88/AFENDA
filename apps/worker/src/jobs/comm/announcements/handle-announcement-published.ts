import type { Task } from "graphile-worker";
import { createInboxItems } from "../shared/inbox-fanout.js";

async function resolveAnnouncementAudiencePrincipals(
  helpers: Parameters<Task>[1],
  orgId: string,
  audienceType: string,
  audienceIds: string[],
): Promise<string[]> {
  return helpers.withPgClient(async (pgClient) => {
    if (audienceType === "org") {
      const result = await pgClient.query(
        `
          SELECT DISTINCT m.principal_id
          FROM membership m
          INNER JOIN party_role pr ON pr.id = m.party_role_id
          WHERE pr.org_id = $1
            AND m.status = 'active'
            AND m.revoked_at IS NULL
          LIMIT 100000
        `,
        [orgId],
      );
      return result.rows.map((r) => r.principal_id as string);
    }

    if (audienceType === "team") {
      if (audienceIds.length === 0) return [];

      const result = await pgClient.query(
        `
          SELECT DISTINCT m.principal_id
          FROM membership m
          INNER JOIN party_role pr ON pr.id = m.party_role_id
          WHERE pr.org_id = $1
            AND m.party_role_id = ANY($2::uuid[])
            AND m.status = 'active'
            AND m.revoked_at IS NULL
          LIMIT 100000
        `,
        [orgId, audienceIds],
      );
      return result.rows.map((r) => r.principal_id as string);
    }

    if (audienceType === "role") {
      if (audienceIds.length === 0) return [];

      const result = await pgClient.query(
        `
          SELECT DISTINCT ipr.principal_id
          FROM iam_principal_role ipr
          WHERE ipr.org_id = $1
            AND ipr.role_id = ANY($2::uuid[])
          LIMIT 100000
        `,
        [orgId, audienceIds],
      );
      return result.rows.map((r) => r.principal_id as string);
    }

    return [];
  });
}

export const handleAnnouncementPublished: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      announcementId: string;
      announcementNumber: string;
      orgId: string;
      title: string;
      audienceType: string;
      audienceIds: string[];
      correlationId: string;
    };
  };

  if (event.type !== "COMM.ANNOUNCEMENT_PUBLISHED") {
    helpers.logger.warn(
      `handle_announcement_published received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `announcement published: announcementId=${event.payload.announcementId} ` +
      `announcementNumber=${event.payload.announcementNumber} ` +
      `title=${event.payload.title} ` +
      `audienceType=${event.payload.audienceType} ` +
      `correlationId=${event.correlationId}`,
  );

  const targetPrincipalIds = Array.from(
    new Set(
      await resolveAnnouncementAudiencePrincipals(
        helpers,
        event.payload.orgId,
        event.payload.audienceType,
        event.payload.audienceIds ?? [],
      ),
    ),
  );

  if (targetPrincipalIds.length === 0) {
    helpers.logger.info(
      `announcement published fan-out skipped (no targets): announcementId=${event.payload.announcementId} ` +
        `audienceType=${event.payload.audienceType}`,
    );
    return;
  }

  const createdCount = await createInboxItems(
    helpers,
    targetPrincipalIds.map((principalId) => ({
      orgId: event.payload.orgId,
      principalId,
      eventType: event.type,
      entityType: "announcement" as const,
      entityId: event.payload.announcementId,
      title: "Announcement",
      body: `${event.payload.announcementNumber}: ${event.payload.title}`,
    })),
  );

  helpers.logger.info(
    `announcement published inbox fan-out: announcementId=${event.payload.announcementId} ` +
      `created=${createdCount} targetPrincipals=${targetPrincipalIds.length}`,
  );
};
