import type { Task } from "graphile-worker";

export const handleAnnouncementScheduled: Task = async (payload, helpers) => {
  const event = payload as {
    type: string;
    orgId: string;
    correlationId: string;
    payload: {
      announcementId: string;
      announcementNumber: string;
      orgId: string;
      scheduledAt: string;
      correlationId: string;
    };
  };

  type ScheduledDuePayload = {
    type: "COMM.ANNOUNCEMENT_SCHEDULED_DUE";
    orgId: string;
    correlationId: string;
    payload: {
      announcementId: string;
      announcementNumber: string;
      orgId: string;
      scheduledAt: string;
      correlationId: string;
    };
  };

  if (event.type === "COMM.ANNOUNCEMENT_SCHEDULED_DUE") {
    const dueEvent = event as unknown as ScheduledDuePayload;

    const updated = await helpers.withPgClient(async (pgClient) => {
      const result = await pgClient.query(
        `
          UPDATE comm_announcement
          SET status = 'published',
              published_at = now(),
              updated_at = now()
          WHERE org_id = $1
            AND id = $2
            AND status = 'scheduled'
            AND (scheduled_at IS NULL OR scheduled_at <= now())
          RETURNING id, announcement_number, org_id, title, audience_type, audience_ids
        `,
        [dueEvent.payload.orgId, dueEvent.payload.announcementId],
      );

      const row = result.rows[0];
      if (!row) return null;

      await pgClient.query(
        `
          INSERT INTO outbox_event (org_id, type, version, correlation_id, payload)
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          row.org_id,
          "COMM.ANNOUNCEMENT_PUBLISHED",
          "1",
          dueEvent.correlationId,
          JSON.stringify({
            announcementId: row.id,
            announcementNumber: row.announcement_number,
            orgId: row.org_id,
            title: row.title,
            audienceType: row.audience_type,
            audienceIds: Array.isArray(row.audience_ids) ? row.audience_ids : [],
            correlationId: dueEvent.correlationId,
          }),
        ],
      );

      return row;
    });

    if (!updated) {
      helpers.logger.info(
        `announcement due publish skipped: announcementId=${dueEvent.payload.announcementId} ` +
          `reason=not_found_or_not_due_or_not_scheduled`,
      );
      return;
    }

    helpers.logger.info(
      `announcement due publish completed: announcementId=${updated.id} ` +
        `announcementNumber=${updated.announcement_number} correlationId=${dueEvent.correlationId}`,
    );
    return;
  }

  if (event.type !== "COMM.ANNOUNCEMENT_SCHEDULED") {
    helpers.logger.warn(
      `handle_announcement_scheduled received unexpected event type: ${event.type}`,
    );
    return;
  }

  helpers.logger.info(
    `announcement scheduled: announcementId=${event.payload.announcementId} ` +
      `announcementNumber=${event.payload.announcementNumber} ` +
      `scheduledAt=${event.payload.scheduledAt} ` +
      `correlationId=${event.correlationId}`,
  );

  const runAt = new Date(event.payload.scheduledAt);
  if (Number.isNaN(runAt.getTime())) {
    helpers.logger.warn(
      `announcement scheduled has invalid datetime: announcementId=${event.payload.announcementId} ` +
        `scheduledAt=${event.payload.scheduledAt}`,
    );
    return;
  }

  await helpers.addJob(
    "handle_announcement_scheduled",
    {
      type: "COMM.ANNOUNCEMENT_SCHEDULED_DUE",
      orgId: event.orgId,
      correlationId: event.correlationId,
      payload: {
        announcementId: event.payload.announcementId,
        announcementNumber: event.payload.announcementNumber,
        orgId: event.payload.orgId,
        scheduledAt: event.payload.scheduledAt,
        correlationId: event.payload.correlationId,
      },
    } satisfies ScheduledDuePayload,
    {
      runAt,
      jobKey: `comm_announcement_publish_due:${event.payload.announcementId}`,
      jobKeyMode: "replace",
      maxAttempts: 10,
    },
  );

  helpers.logger.info(
    `announcement publish queued: announcementId=${event.payload.announcementId} ` +
      `runAt=${runAt.toISOString()} correlationId=${event.correlationId}`,
  );
};
