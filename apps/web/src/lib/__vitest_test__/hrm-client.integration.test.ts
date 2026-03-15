import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({
  getApiHeaders: vi.fn(async () => ({ Authorization: "Bearer test-token" })),
}));

import {
  fetchAttendanceRecords,
  fetchLeaveRequests,
  fetchRosterAssignments,
} from "../../app/(erp)/hr/shared/hrm-client";

describe("HRM web client API integration checks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls attendance records endpoint with query params and auth headers", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, data: { items: [] } }), { status: 200 }),
      );

    await fetchAttendanceRecords({
      employmentId: "e1111111-1111-1111-1111-111111111111",
      status: "present",
      limit: 10,
      offset: 0,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/hrm/attendance/records?");
    expect(url).toContain("employmentId=e1111111-1111-1111-1111-111111111111");
    expect(url).toContain("status=present");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    });
  });

  it("calls leave requests endpoint with status filter", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, data: { items: [] } }), { status: 200 }),
      );

    await fetchLeaveRequests({ status: "submitted", limit: 25 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/hrm/leave/requests?");
    expect(url).toContain("status=submitted");
    expect(url).toContain("limit=25");
  });

  it("calls roster assignments endpoint with status and date range filters", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, data: { items: [] } }), { status: 200 }),
      );

    await fetchRosterAssignments({
      status: "scheduled",
      workDateFrom: "2026-03-01",
      workDateTo: "2026-03-31",
      limit: 25,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/hrm/attendance/roster-assignments?");
    expect(url).toContain("status=scheduled");
    expect(url).toContain("workDateFrom=2026-03-01");
    expect(url).toContain("workDateTo=2026-03-31");
  });
});
