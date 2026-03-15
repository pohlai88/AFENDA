import { describe, expect, it } from "vitest";
import * as projects from "../index.js";

describe("projects/index – barrel completeness", () => {
  it("exports entity schemas", () => {
    expect(projects).toHaveProperty("ProjectSchema");
    expect(projects).toHaveProperty("ProjectNameSchema");
    expect(projects).toHaveProperty("ProjectMemberSchema");
    expect(projects).toHaveProperty("ProjectMilestoneSchema");
    expect(projects).toHaveProperty("ProjectStatusValues");
  });

  it("exports query/response schemas", () => {
    expect(projects).toHaveProperty("GetProjectResponseSchema");
    expect(projects).toHaveProperty("ListProjectsResponseSchema");
  });

  it("exports event constants and registry", () => {
    expect(projects).toHaveProperty("CommProjectEvents");
    expect(projects).toHaveProperty("ProjectEventTypes");
    expect(projects).toHaveProperty("CommProjectEventTypes");
  });

  it("exports payload schemas", () => {
    expect(projects).toHaveProperty("ProjectCreatedEventSchema");
    expect(projects).toHaveProperty("ProjectStatusChangedEventSchema");
    expect(projects).toHaveProperty("ProjectMilestoneCompletedEventSchema");
    expect(projects).toHaveProperty("ProjectEventPayloadSchemas");
  });

  it("exports outbox schema", () => {
    expect(projects).toHaveProperty("ProjectOutboxRecordSchema");
  });
});
