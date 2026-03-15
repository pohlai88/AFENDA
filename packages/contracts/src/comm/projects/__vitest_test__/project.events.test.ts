import { describe, expect, it } from "vitest";
import {
  CommProjectEventTypes,
  ProjectCreatedEventSchema,
  CommProjectEvents,
  ProjectEventTypes,
  COMM_PROJECT_CREATED,
  COMM_PROJECT_UPDATED,
  COMM_PROJECT_STATUS_CHANGED,
  COMM_PROJECT_ARCHIVED,
  COMM_PROJECT_DELETED,
  COMM_PROJECT_MEMBER_ADDED,
  COMM_PROJECT_MEMBER_REMOVED,
  COMM_PROJECT_MILESTONE_CREATED,
  COMM_PROJECT_MILESTONE_COMPLETED,
} from "../project.events.js";

describe("project.events – constants", () => {
  it("has the correct event name values", () => {
    expect(COMM_PROJECT_CREATED).toBe("COMM.PROJECT_CREATED");
    expect(COMM_PROJECT_UPDATED).toBe("COMM.PROJECT_UPDATED");
    expect(COMM_PROJECT_STATUS_CHANGED).toBe("COMM.PROJECT_STATUS_CHANGED");
    expect(COMM_PROJECT_ARCHIVED).toBe("COMM.PROJECT_ARCHIVED");
    expect(COMM_PROJECT_DELETED).toBe("COMM.PROJECT_DELETED");
    expect(COMM_PROJECT_MEMBER_ADDED).toBe("COMM.PROJECT_MEMBER_ADDED");
    expect(COMM_PROJECT_MEMBER_REMOVED).toBe("COMM.PROJECT_MEMBER_REMOVED");
    expect(COMM_PROJECT_MILESTONE_CREATED).toBe("COMM.PROJECT_MILESTONE_CREATED");
    expect(COMM_PROJECT_MILESTONE_COMPLETED).toBe("COMM.PROJECT_MILESTONE_COMPLETED");
  });
});

describe("project.events – CommProjectEvents registry", () => {
  it("exposes all 9 events", () => {
    expect(Object.keys(CommProjectEvents)).toHaveLength(9);
    expect(CommProjectEvents.Created).toBe(COMM_PROJECT_CREATED);
    expect(CommProjectEvents.StatusChanged).toBe(COMM_PROJECT_STATUS_CHANGED);
    expect(CommProjectEvents.MilestoneCompleted).toBe(COMM_PROJECT_MILESTONE_COMPLETED);
  });

  it("ProjectEventTypes contains all 9 values", () => {
    expect(ProjectEventTypes).toHaveLength(9);
    for (const event of Object.values(CommProjectEvents)) {
      expect(ProjectEventTypes).toContain(event);
    }
  });

  it("CommProjectEventTypes remains aligned with ProjectEventTypes", () => {
    expect(CommProjectEventTypes).toEqual(ProjectEventTypes);
  });

  it("re-exports payload schemas from events module", () => {
    expect(ProjectCreatedEventSchema).toBeDefined();
  });
});
