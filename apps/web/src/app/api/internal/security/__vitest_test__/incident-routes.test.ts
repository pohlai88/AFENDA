import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const publishAuthAuditEventMock = vi.fn();
const acknowledgeAuthIncidentMock = vi.fn();
const assignAuthIncidentMock = vi.fn();
const resolveAuthIncidentMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/features/auth/server/audit/audit.helpers", () => ({
  publishAuthAuditEvent: (...args: unknown[]) => publishAuthAuditEventMock(...args),
}));

vi.mock("@/features/auth/server/incident/auth-incident.service", () => ({
  acknowledgeAuthIncident: (...args: unknown[]) => acknowledgeAuthIncidentMock(...args),
  assignAuthIncident: (...args: unknown[]) => assignAuthIncidentMock(...args),
  resolveAuthIncident: (...args: unknown[]) => resolveAuthIncidentMock(...args),
}));

describe("internal security incident mutation routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    publishAuthAuditEventMock.mockReset();
    acknowledgeAuthIncidentMock.mockReset();
    assignAuthIncidentMock.mockReset();
    resolveAuthIncidentMock.mockReset();
  });

  it("returns 403 for non-admin acknowledge and skips audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_member", roles: ["member"] } });

    const { POST } = await import("../incidents/[incidentId]/acknowledge/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/incidents/inc_1/acknowledge", {
        method: "POST",
      }),
      { params: Promise.resolve({ incidentId: "inc_1" }) },
    );

    expect(response.status).toBe(403);
    expect(acknowledgeAuthIncidentMock).not.toHaveBeenCalled();
    expect(publishAuthAuditEventMock).not.toHaveBeenCalled();
  });

  it("acknowledges incident and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    acknowledgeAuthIncidentMock.mockResolvedValue(true);

    const { POST } = await import("../incidents/[incidentId]/acknowledge/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/incidents/inc_2/acknowledge", {
        method: "POST",
      }),
      { params: Promise.resolve({ incidentId: "inc_2" }) },
    );

    expect(response.status).toBe(200);
    expect(acknowledgeAuthIncidentMock).toHaveBeenCalledWith({
      incidentId: "inc_2",
      actorUserId: "u_admin",
    });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.incident_acknowledged", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        incidentId: "inc_2",
        ok: true,
      },
    });
  });

  it("assigns incident and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    assignAuthIncidentMock.mockResolvedValue(true);

    const { POST } = await import("../incidents/[incidentId]/assign/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/incidents/inc_3/assign", {
        method: "POST",
        body: JSON.stringify({ assigneeUserId: "u_assignee" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ incidentId: "inc_3" }) },
    );

    expect(response.status).toBe(200);
    expect(assignAuthIncidentMock).toHaveBeenCalledWith({
      incidentId: "inc_3",
      actorUserId: "u_admin",
      assigneeUserId: "u_assignee",
    });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.incident_assigned", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        incidentId: "inc_3",
        assigneeUserId: "u_assignee",
        ok: true,
      },
    });
  });

  it("resolves incident and publishes audit", async () => {
    authMock.mockResolvedValue({ user: { id: "u_admin", email: "admin@afenda.com", roles: ["admin"] } });
    resolveAuthIncidentMock.mockResolvedValue(true);

    const { POST } = await import("../incidents/[incidentId]/resolve/route");
    const response = await POST(
      new Request("http://localhost/api/internal/security/incidents/inc_4/resolve", {
        method: "POST",
        body: JSON.stringify({ resolutionNote: "resolved by policy" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ incidentId: "inc_4" }) },
    );

    expect(response.status).toBe(200);
    expect(resolveAuthIncidentMock).toHaveBeenCalledWith({
      incidentId: "inc_4",
      actorUserId: "u_admin",
      resolutionNote: "resolved by policy",
    });
    expect(publishAuthAuditEventMock).toHaveBeenCalledWith("auth.ops.incident_resolved", {
      userId: "u_admin",
      email: "admin@afenda.com",
      metadata: {
        incidentId: "inc_4",
        resolutionNoteLength: 18,
        ok: true,
      },
    });
  });
});
