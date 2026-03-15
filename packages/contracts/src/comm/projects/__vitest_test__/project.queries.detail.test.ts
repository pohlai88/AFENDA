import { describe, expect, it } from "vitest";
import {
  GetProjectResponseSchema,
  ListProjectsResponseSchema,
} from "../project.queries.js";

const ORG_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const PROJECT_ID = "cccccccc-cccc-4ccc-accc-cccccccccccc";
const CORR_ID = "ffffffff-ffff-4fff-afff-ffffffffffff";
const NOW = "2026-01-02T10:00:00.000Z";

const BASE_PROJECT = {
  id: PROJECT_ID,
  orgId: ORG_ID,
  projectNumber: "PROJ-001",
  name: "Website Redesign",
  status: "active",
  visibility: "org",
  ownerId: PRINCIPAL_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("project.queries – GetProjectResponseSchema", () => {
  it("accepts a valid detail response", () => {
    const result = GetProjectResponseSchema.safeParse({
      data: BASE_PROJECT,
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});

describe("project.queries – ListProjectsResponseSchema", () => {
  it("accepts an empty list response", () => {
    const result = ListProjectsResponseSchema.safeParse({
      data: [],
      meta: { cursor: null, limit: 50, hasMore: false },
      correlationId: CORR_ID,
    });
    expect(result.success).toBe(true);
  });
});
