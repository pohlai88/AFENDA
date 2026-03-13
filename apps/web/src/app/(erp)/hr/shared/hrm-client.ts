import { getApiHeaders } from "@/lib/api-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface HrmApiSuccess<T> {
  ok: true;
  data: T;
  correlationId?: string;
}

async function hrmFetch(path: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getApiHeaders();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export async function fetchEmployees(params?: {
  search?: string;
  employmentStatus?: string;
  workerType?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.employmentStatus) query.set("employmentStatus", params.employmentStatus);
  if (params?.workerType) query.set("workerType", params.workerType);
  if (typeof params?.limit === "number") query.set("limit", String(params.limit));
  if (typeof params?.offset === "number") query.set("offset", String(params.offset));

  const qs = query.toString();
  const res = await hrmFetch(`/v1/hrm/employees${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`HR employees API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchEmployeeProfile(employeeId: string) {
  const res = await hrmFetch(`/v1/hrm/employees/${employeeId}`);
  if (!res.ok) throw new Error(`HR employee profile API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchEmploymentTimeline(employmentId: string) {
  const res = await hrmFetch(`/v1/hrm/employments/${employmentId}/timeline`);
  if (!res.ok)
    throw new Error(`HR employment timeline API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchOrgTree() {
  const res = await hrmFetch("/v1/hrm/org-tree");
  if (!res.ok) throw new Error(`HR org tree API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchPositions() {
  const res = await hrmFetch("/v1/hrm/positions");
  if (!res.ok) throw new Error(`HR positions API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchPosition(positionId: string) {
  const res = await hrmFetch(`/v1/hrm/positions/${positionId}`);
  if (!res.ok) throw new Error(`HR position API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchRequisitions() {
  const res = await hrmFetch("/v1/hrm/requisitions");
  if (!res.ok) throw new Error(`HR requisitions API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchRequisition(requisitionId: string) {
  const res = await hrmFetch(`/v1/hrm/requisitions/${requisitionId}`);
  if (!res.ok) throw new Error(`HR requisition API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchCandidatePipeline(candidateId: string) {
  const res = await hrmFetch(`/v1/hrm/candidates/${candidateId}/pipeline`);
  if (!res.ok)
    throw new Error(`HR candidate pipeline API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchApplication(applicationId: string) {
  const res = await hrmFetch(`/v1/hrm/applications/${applicationId}`);
  if (!res.ok) throw new Error(`HR application API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchOnboardingChecklist(planId: string) {
  const res = await hrmFetch(`/v1/hrm/onboarding-plans/${planId}`);
  if (!res.ok)
    throw new Error(`HR onboarding checklist API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchPendingOnboarding() {
  const res = await hrmFetch("/v1/hrm/onboarding/pending");
  if (!res.ok)
    throw new Error(`HR pending onboarding API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchSeparationCase(caseId: string) {
  const res = await hrmFetch(`/v1/hrm/separation-cases/${caseId}`);
  if (!res.ok) throw new Error(`HR separation case API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchAttendanceRecords(params?: {
  employmentId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.employmentId) query.set("employmentId", params.employmentId);
  if (params?.status) query.set("status", params.status);
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  if (typeof params?.limit === "number") query.set("limit", String(params.limit));
  if (typeof params?.offset === "number") query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await hrmFetch(`/v1/hrm/attendance/records${qs ? `?${qs}` : ""}`);
  if (!res.ok)
    throw new Error(`HR attendance records API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchLeaveRequests(params?: {
  employmentId?: string;
  status?: string;
  leaveTypeId?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.employmentId) query.set("employmentId", params.employmentId);
  if (params?.status) query.set("status", params.status);
  if (params?.leaveTypeId) query.set("leaveTypeId", params.leaveTypeId);
  if (typeof params?.limit === "number") query.set("limit", String(params.limit));
  if (typeof params?.offset === "number") query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await hrmFetch(`/v1/hrm/leave/requests${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`HR leave requests API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchLeaveBalances(params?: {
  employmentId?: string;
  leaveTypeId?: string;
  accrualPeriod?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.employmentId) query.set("employmentId", params.employmentId);
  if (params?.leaveTypeId) query.set("leaveTypeId", params.leaveTypeId);
  if (params?.accrualPeriod) query.set("accrualPeriod", params.accrualPeriod);
  if (typeof params?.limit === "number") query.set("limit", String(params.limit));
  if (typeof params?.offset === "number") query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await hrmFetch(`/v1/hrm/leave/balances${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`HR leave balances API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchCompensationStructures(params?: { limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (typeof params?.limit === "number") query.set("limit", String(params.limit));
  if (typeof params?.offset === "number") query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await hrmFetch(`/v1/hrm/compensation/structures${qs ? `?${qs}` : ""}`);
  if (!res.ok)
    throw new Error(`HR compensation structures API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchCompensationPackages(params?: {
  employmentId?: string;
  currentOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.employmentId) query.set("employmentId", params.employmentId);
  if (typeof params?.currentOnly === "boolean")
    query.set("currentOnly", String(params.currentOnly));
  if (typeof params?.limit === "number") query.set("limit", String(params.limit));
  if (typeof params?.offset === "number") query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await hrmFetch(`/v1/hrm/compensation/packages${qs ? `?${qs}` : ""}`);
  if (!res.ok)
    throw new Error(`HR compensation packages API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchSalaryHistory(params?: {
  employmentId?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.employmentId) query.set("employmentId", params.employmentId);
  if (typeof params?.limit === "number") query.set("limit", String(params.limit));
  if (typeof params?.offset === "number") query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await hrmFetch(`/v1/hrm/compensation/salary-history${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`HR salary history API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}

export async function fetchBenefitEnrollments(params?: {
  employmentId?: string;
  enrollmentStatus?: "active" | "suspended" | "terminated" | "pending";
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams();
  if (params?.employmentId) query.set("employmentId", params.employmentId);
  if (params?.enrollmentStatus) query.set("enrollmentStatus", params.enrollmentStatus);
  if (typeof params?.limit === "number") query.set("limit", String(params.limit));
  if (typeof params?.offset === "number") query.set("offset", String(params.offset));
  const qs = query.toString();
  const res = await hrmFetch(`/v1/hrm/benefit/enrollments${qs ? `?${qs}` : ""}`);
  if (!res.ok)
    throw new Error(`HR benefit enrollments API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HrmApiSuccess<unknown>>;
}
