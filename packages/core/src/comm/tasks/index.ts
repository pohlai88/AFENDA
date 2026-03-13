import { instrumentService } from "../../kernel/infrastructure/tracing";
import * as rawTaskService from "./task.service";
import * as rawTaskQueries from "./task.queries";

export type {
  CommTaskPolicyContext,
  CommTaskServiceError,
  CommTaskServiceResult,
} from "./task.service";
export type { TaskRow, TaskListParams } from "./task.queries";

const instrumented = instrumentService("comm.tasks", {
  ...rawTaskService,
  ...rawTaskQueries,
});

export const {
  createTask,
  updateTask,
  assignTask,
  bulkAssignTasks,
  transitionTaskStatus,
  bulkTransitionTaskStatus,
  completeTask,
  archiveTask,
  addTaskChecklist,
  toggleTaskChecklistItem,
  removeTaskChecklistItem,
  logTaskTimeEntry,
  getTaskById,
  listTasks,
  listTaskChecklistItems,
  listTaskTimeEntries,
} = instrumented;
