import React from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const fetchTasksMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/api-client", () => ({
  fetchTasks: (...args: unknown[]) => fetchTasksMock(...args),
}));

describe("comm my tasks page", () => {
  beforeAll(() => {
    vi.stubGlobal("React", React);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    authMock.mockReset();
    fetchTasksMock.mockReset();
  });

  it("fetches tasks for current assignee with active statuses", async () => {
    authMock.mockResolvedValue({ user: { id: "user-123" } });
    fetchTasksMock.mockResolvedValue({ data: [], cursor: null, hasMore: false });

    const { default: MyTasksPage } = await import("../page");
    const page = await MyTasksPage();

    expect(page).toBeTruthy();
    expect(fetchTasksMock).toHaveBeenCalledTimes(1);
    expect(fetchTasksMock).toHaveBeenCalledWith({
      assigneeId: "user-123",
      status: ["open", "in_progress", "blocked", "review"],
    });
  }, 60000);

  it("does not fetch tasks when no assignee is available", async () => {
    authMock.mockResolvedValue(null);

    const { default: MyTasksPage } = await import("../page");
    const page = await MyTasksPage();

    expect(page).toBeTruthy();
    expect(fetchTasksMock).not.toHaveBeenCalled();
  });
});
