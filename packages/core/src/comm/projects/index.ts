import { instrumentService } from "../../kernel/infrastructure/tracing";
import * as rawProjectService from "./project.service";
import * as rawProjectQueries from "./project.queries";

export type {
  CommProjectPolicyContext,
  CommProjectServiceError,
  CommProjectServiceResult,
} from "./project.service";
export type { ProjectRow, ProjectListParams } from "./project.queries";

const instrumented = instrumentService("comm.projects", {
  ...rawProjectService,
  ...rawProjectQueries,
});

export const {
  createProject,
  updateProject,
  transitionProjectStatus,
  archiveProject,
  addProjectMember,
  removeProjectMember,
  createProjectMilestone,
  completeProjectMilestone,
  getProjectById,
  listProjects,
  listProjectMembers,
  listProjectMilestones,
  listProjectPhases,
} = instrumented;
