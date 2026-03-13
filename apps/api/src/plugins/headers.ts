import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { CorrelationIdHeader, RequestIdHeader } from "@afenda/contracts";

const headersPluginImpl: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (req, reply) => {
    const incomingCorrelationId = req.headers[CorrelationIdHeader] as string | undefined;
    const incomingRequestId = req.headers[RequestIdHeader] as string | undefined;

    const requestId = incomingRequestId ?? req.id;
    const correlationId = incomingCorrelationId ?? requestId;

    req.correlationId = correlationId;

    // Mirror transport identifiers to every response for observability.
    reply.header(RequestIdHeader, requestId);
    reply.header(CorrelationIdHeader, correlationId);
  });
};

export const headersPlugin = fp(headersPluginImpl as any, {
  name: "afenda-headers-plugin",
}) as FastifyPluginAsync;
