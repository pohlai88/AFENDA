import { z } from "zod";
import { CommTaskIdSchema, TaskChecklistItemIdSchema } from "../../shared/ids.js";
import { CommQueryTextSchema } from "../shared/query.js";
import { makeCommDetailResponseSchema, makeCommListResponseSchema } from "../shared/response.js";
import { TaskChecklistItemSchema } from "./task-checklist-item.entity.js";

export const ListTaskChecklistItemsQuerySchema = z
  .object({
    taskId: CommTaskIdSchema,
    onlyChecked: z.boolean().optional(),
    onlyUnchecked: z.boolean().optional(),
    sortBy: z.enum(["createdAt", "updatedAt", "sortOrder"]).optional().default("sortOrder"),
  })
  .superRefine((data, ctx) => {
    if (data.onlyChecked && data.onlyUnchecked) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "onlyChecked and onlyUnchecked are mutually exclusive.",
        path: ["onlyUnchecked"],
      });
    }
  });

export const GetTaskChecklistItemQuerySchema = z.object({
  taskId: CommTaskIdSchema,
  checklistItemId: TaskChecklistItemIdSchema,
});

export const SearchTaskChecklistItemsQuerySchema = z.object({
  taskId: CommTaskIdSchema,
  query: CommQueryTextSchema,
});

export const GetTaskChecklistItemResponseSchema =
  makeCommDetailResponseSchema(TaskChecklistItemSchema);
export const ListTaskChecklistItemsResponseSchema =
  makeCommListResponseSchema(TaskChecklistItemSchema);

export type ListTaskChecklistItemsQuery = z.infer<typeof ListTaskChecklistItemsQuerySchema>;
export type GetTaskChecklistItemQuery = z.infer<typeof GetTaskChecklistItemQuerySchema>;
export type SearchTaskChecklistItemsQuery = z.infer<typeof SearchTaskChecklistItemsQuerySchema>;
export type GetTaskChecklistItemResponse = z.infer<typeof GetTaskChecklistItemResponseSchema>;
export type ListTaskChecklistItemsResponse = z.infer<typeof ListTaskChecklistItemsResponseSchema>;
