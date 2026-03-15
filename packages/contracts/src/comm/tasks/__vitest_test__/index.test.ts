import { describe, expect, it } from "vitest";
import * as taskIndex from "../index.js";

describe("tasks/index barrel", () => {
  it("exports task entity schemas", () => {
    expect(taskIndex).toHaveProperty("TaskSchema");
    expect(taskIndex).toHaveProperty("TaskTitleSchema");
    expect(taskIndex).toHaveProperty("TaskStatusValues");
    expect(taskIndex).toHaveProperty("TaskPriorityValues");
    expect(taskIndex).toHaveProperty("TaskTypeValues");
  });

  it("exports task event registry", () => {
    expect(taskIndex).toHaveProperty("CommTaskEvents");
    expect(taskIndex).toHaveProperty("CommTaskEventTypes");
    expect(taskIndex).toHaveProperty("CommTaskChecklistItemEvents");
    expect(taskIndex).toHaveProperty("TaskChecklistItemEventTypes");
    expect(taskIndex).toHaveProperty("CommTaskTimeEntryEvents");
    expect(taskIndex).toHaveProperty("TaskTimeEntryEventTypes");
    expect(taskIndex).toHaveProperty("CommTaskWatcherEvents");
    expect(taskIndex).toHaveProperty("TaskWatcherEventTypes");
    expect(taskIndex).toHaveProperty("TaskEventTypes");
  });

  it("exports task event constants", () => {
    expect(taskIndex).toHaveProperty("COMM_TASK_CREATED");
    expect(taskIndex).toHaveProperty("COMM_TASK_UPDATED");
    expect(taskIndex).toHaveProperty("COMM_TASK_ASSIGNED");
    expect(taskIndex).toHaveProperty("COMM_TASK_STATUS_CHANGED");
    expect(taskIndex).toHaveProperty("COMM_TASK_COMPLETED");
    expect(taskIndex).toHaveProperty("COMM_TASK_ARCHIVED");
    expect(taskIndex).toHaveProperty("COMM_TASK_DELETED");
    expect(taskIndex).toHaveProperty("COMM_TASK_CHECKLIST_ITEM_ADDED");
    expect(taskIndex).toHaveProperty("COMM_TASK_TIME_ENTRY_CREATED");
    expect(taskIndex).toHaveProperty("COMM_TASK_WATCHER_ADDED");
  });

  it("exports task payload schemas", () => {
    expect(taskIndex).toHaveProperty("TaskUpdatedEventSchema");
    expect(taskIndex).toHaveProperty("TaskStatusChangedEventSchema");
    expect(taskIndex).toHaveProperty("TaskCompletedEventSchema");
    expect(taskIndex).toHaveProperty("TaskDeletedEventSchema");
    expect(taskIndex).toHaveProperty("TaskEventPayloadSchemas");
    expect(taskIndex).toHaveProperty("taskEventPayloads");
    expect(taskIndex.taskEventPayloads).toHaveProperty("TaskCreatedEventSchema");
  });

  it("exports checklist item payload schemas", () => {
    expect(taskIndex).toHaveProperty("ChecklistItemAddedEventSchema");
    expect(taskIndex).toHaveProperty("ChecklistItemToggledEventSchema");
    expect(taskIndex).toHaveProperty("ChecklistItemRemovedEventSchema");
    expect(taskIndex).toHaveProperty("ChecklistUpdatedEventSchema");
    expect(taskIndex).toHaveProperty("TaskChecklistItemEventPayloadSchemas");
  });

  it("exports time-entry payload schemas", () => {
    expect(taskIndex).toHaveProperty("TimeEntryCreatedEventSchema");
    expect(taskIndex).toHaveProperty("TimeEntryUpdatedEventSchema");
    expect(taskIndex).toHaveProperty("TimeEntryDeletedEventSchema");
    expect(taskIndex).toHaveProperty("TaskTimeEntryEventPayloadSchemas");
  });

  it("exports watcher payload schemas", () => {
    expect(taskIndex).toHaveProperty("WatcherAddedEventSchema");
    expect(taskIndex).toHaveProperty("WatcherRemovedEventSchema");
    expect(taskIndex).toHaveProperty("TaskWatcherEventPayloadSchemas");
  });

  it("exports outbox schema", () => {
    expect(taskIndex).toHaveProperty("TaskOutboxRecordSchema");
  });

  it("exports GetTask response schemas", () => {
    expect(taskIndex).toHaveProperty("GetTaskResponseSchema");
    expect(taskIndex).toHaveProperty("GetTaskChecklistItemResponseSchema");
    expect(taskIndex).toHaveProperty("GetTaskTimeEntryResponseSchema");
    expect(taskIndex).toHaveProperty("GetTaskWatcherResponseSchema");
  });

  it("exports List response schemas", () => {
    expect(taskIndex).toHaveProperty("ListTasksResponseSchema");
    expect(taskIndex).toHaveProperty("ListTaskChecklistItemsResponseSchema");
    expect(taskIndex).toHaveProperty("ListTaskTimeEntriesResponseSchema");
    expect(taskIndex).toHaveProperty("ListTaskWatchersResponseSchema");
  });
});
