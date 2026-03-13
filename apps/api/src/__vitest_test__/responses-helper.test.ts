import { describe, expect, it } from "vitest";

import {
  ERR,
  makeApiErrorFromContractEnvelope,
  mapErrorCodeToHttpStatus,
} from "../helpers/responses.js";

describe("responses helper contract bridge", () => {
  const correlationId = "11111111-1111-4111-8111-111111111111";

  it("maps canonical error codes to expected HTTP statuses", () => {
    expect(mapErrorCodeToHttpStatus(ERR.VALIDATION)).toBe(400);
    expect(mapErrorCodeToHttpStatus(ERR.UNAUTHORIZED)).toBe(401);
    expect(mapErrorCodeToHttpStatus(ERR.FORBIDDEN)).toBe(403);
    expect(mapErrorCodeToHttpStatus(ERR.NOT_FOUND)).toBe(404);
    expect(mapErrorCodeToHttpStatus(ERR.CONFLICT)).toBe(409);
    expect(mapErrorCodeToHttpStatus("SOME_UNKNOWN_ERROR")).toBe(500);
  });

  it("creates API error payload via contract envelope validation", () => {
    const apiError = makeApiErrorFromContractEnvelope({
      correlationId,
      code: ERR.VALIDATION,
      message: "Invalid request",
      fieldPath: "body.amount",
      details: { reason: "missing" },
      meta: { version: "v1", source: "api" },
    });

    expect(apiError.correlationId).toBe(correlationId);
    expect(apiError.error.code).toBe(ERR.VALIDATION);
    expect(apiError.error.fieldPath).toBe("body.amount");
    expect(apiError.error.details?.reason).toBe("missing");
  });

  it("throws on invalid contract envelope inputs", () => {
    expect(() =>
      makeApiErrorFromContractEnvelope({
        correlationId,
        code: "",
        message: "Invalid request",
      }),
    ).toThrow();
  });
});
