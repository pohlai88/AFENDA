import { describe, expect, it } from "vitest";
import * as chatter from "../index.js";

describe("chatter/index – barrel completeness", () => {
  it("exports entity schemas", () => {
    expect(chatter).toHaveProperty("CommChatterMessageSchema");
    expect(chatter).toHaveProperty("CommChatterMessageBodyTextSchema");
    expect(chatter).toHaveProperty("CommChatterContextEntityTypeValues");
  });

  it("exports command schemas", () => {
    expect(chatter).toHaveProperty("PostChatterMessageCommandSchema");
    expect(chatter).toHaveProperty("UpdateChatterMessageCommandSchema");
    expect(chatter).toHaveProperty("DeleteChatterMessageCommandSchema");
  });

  it("exports query/response schemas", () => {
    expect(chatter).toHaveProperty("GetChatterMessageResponseSchema");
  });

  it("exports event constants and registry", () => {
    expect(chatter).toHaveProperty("CommChatterEvents");
    expect(chatter).toHaveProperty("ChatterEventTypes");
  });

  it("exports payload schemas", () => {
    expect(chatter).toHaveProperty("ChatterMessagePostedEventSchema");
    expect(chatter).toHaveProperty("ChatterMessageUpdatedEventSchema");
    expect(chatter).toHaveProperty("ChatterMessageDeletedEventSchema");
    expect(chatter).toHaveProperty("ChatterEventPayloadSchemas");
  });

  it("exports outbox schema", () => {
    expect(chatter).toHaveProperty("ChatterOutboxRecordSchema");
  });
});
