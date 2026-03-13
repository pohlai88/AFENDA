function readMaxRetries(env) {
  const value = Number(env.R2_EVENT_MAX_RETRIES ?? "5");
  if (!Number.isFinite(value)) return 5;
  return Math.max(0, Math.floor(value));
}

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

async function forwardEventToWebhook(env, payload) {
  const endpoint = env.R2_EVENT_WEBHOOK_URL;
  if (!endpoint) return;

  const headers = { "Content-Type": "application/json" };
  if (env.R2_EVENT_WEBHOOK_SECRET) {
    headers["x-r2-event-secret"] = env.R2_EVENT_WEBHOOK_SECRET;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook rejected R2 event: HTTP ${response.status}`);
  }
}

export default {
  async fetch() {
    return new Response("AFENDA R2 event consumer worker", { status: 200 });
  },

  async queue(batch, env) {
    const maxRetries = readMaxRetries(env);

    for (const message of batch.messages) {
      try {
        await forwardEventToWebhook(env, {
          source: "cloudflare-r2",
          queuedAt: new Date().toISOString(),
          messageId: message.id,
          attempts: message.attempts,
          payload: message.body,
        });

        message.ack();
      } catch (error) {
        const errorPayload = normalizeError(error);
        const attempts = Number(message.attempts ?? 0);

        if (attempts >= maxRetries) {
          if (env.R2_EVENT_DLQ && typeof env.R2_EVENT_DLQ.send === "function") {
            await env.R2_EVENT_DLQ.send({
              source: "cloudflare-r2",
              failedAt: new Date().toISOString(),
              messageId: message.id,
              attempts,
              error: errorPayload,
              payload: message.body,
            });
          }

          message.ack();
          continue;
        }

        message.retry();
      }
    }
  },
};
