import { z } from "zod";
import { DateSchema } from "../../shared/datetime.js";
import { PrincipalIdSchema } from "../../shared/ids.js";
import {
  applyDateOrderRefinement,
  CommListLimitSchema,
  CommQueryTextSchema,
  CommSearchLimitSchema,
} from "../shared/query.js";
import { makeCommDetailResponseSchema, makeCommListResponseSchema, makeCommSearchResponseSchema } from "../shared/response.js";
import { CommProjectIdSchema } from "../shared/project-id.js";
import {
  CommProjectMilestoneIdSchema,
  CommProjectMemberIdSchema,
  ProjectMemberRoleSchema,
  ProjectMemberSchema,
  ProjectMilestoneSchema,
  ProjectMilestoneStatusSchema,
  ProjectSchema,
  ProjectStatusSchema,
  ProjectVisibilitySchema,
} from "./project.entity.js";

export const GetProjectQuerySchema = z.object({
  projectId: CommProjectIdSchema,
});

export const ListProjectsQuerySchema = z
  .object({
    status: ProjectStatusSchema.optional(),
    visibility: ProjectVisibilitySchema.optional(),
    ownerId: PrincipalIdSchema.optional(),
    targetBefore: DateSchema.optional(),
    targetAfter: DateSchema.optional(),
    limit: CommListLimitSchema,
    cursor: CommProjectIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    applyDateOrderRefinement(data, ctx, {
      fromKey: "targetAfter",
      toKey: "targetBefore",
      message: "targetBefore must be on or after targetAfter.",
      path: ["targetBefore"],
    });
  });

export const SearchProjectsQuerySchema = z.object({
  query: CommQueryTextSchema,
  status: ProjectStatusSchema.optional(),
  visibility: ProjectVisibilitySchema.optional(),
  limit: CommSearchLimitSchema,
});

export const ListProjectMembersQuerySchema = z.object({
  projectId: CommProjectIdSchema,
  role: ProjectMemberRoleSchema.optional(),
  limit: CommListLimitSchema,
  cursor: CommProjectMemberIdSchema.optional(),
});

export const ListProjectMilestonesQuerySchema = z.object({
  projectId: CommProjectIdSchema,
  status: ProjectMilestoneStatusSchema.optional(),
  dueBefore: DateSchema.optional(),
  dueAfter: DateSchema.optional(),
  limit: CommListLimitSchema,
  cursor: CommProjectMilestoneIdSchema.optional(),
}).superRefine((data, ctx) => {
  applyDateOrderRefinement(data, ctx, {
    fromKey: "dueAfter",
    toKey: "dueBefore",
    message: "dueBefore must be on or after dueAfter.",
    path: ["dueBefore"],
  });
});

export const GetProjectResponseSchema = makeCommDetailResponseSchema(ProjectSchema);

export const ListProjectsResponseSchema = makeCommListResponseSchema(ProjectSchema);
export const SearchProjectsResponseSchema = makeCommSearchResponseSchema(ProjectSchema);
export const ListProjectMembersResponseSchema = makeCommListResponseSchema(ProjectMemberSchema);
export const ListProjectMilestonesResponseSchema =
  makeCommListResponseSchema(ProjectMilestoneSchema);

export type GetProjectResponse = z.infer<typeof GetProjectResponseSchema>;
export type GetProjectQuery = z.infer<typeof GetProjectQuerySchema>;
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;
export type SearchProjectsQuery = z.infer<typeof SearchProjectsQuerySchema>;
export type ListProjectMembersQuery = z.infer<typeof ListProjectMembersQuerySchema>;
export type ListProjectMilestonesQuery = z.infer<typeof ListProjectMilestonesQuerySchema>;
export type ListProjectsResponse = z.infer<typeof ListProjectsResponseSchema>;
export type SearchProjectsResponse = z.infer<typeof SearchProjectsResponseSchema>;
export type ListProjectMembersResponse = z.infer<typeof ListProjectMembersResponseSchema>;
export type ListProjectMilestonesResponse = z.infer<typeof ListProjectMilestonesResponseSchema>;
