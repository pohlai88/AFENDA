import type { DbClient } from "@afenda/db";
import { hrmExitClearanceItems, hrmSeparationCases } from "@afenda/db";
import { and, eq } from "drizzle-orm";

export interface SeparationCaseItem {
  exitClearanceItemId: string;
  clearanceType: string;
  ownerDepartment: string | null;
  status: string;
  itemId: string;
  itemCode: string | null;
  itemLabel: string;
  ownerEmployeeId: string | null;
  mandatory: boolean;
  clearanceStatus: string;
  clearedAt: string | null;
}

export interface SeparationCaseView {
  caseNumber: string;
  lastWorkingDate: string;
  noticeGivenAt: string | null;
  reasonCode: string | null;
  status: string;
  clearanceItems: SeparationCaseItem[];
  separationCaseId: string;
  employmentId: string;
  caseStatus: string;
  separationType: string | null;
  initiatedAt: string | null;
  targetLastWorkingDate: string | null;
  closedAt: string | null;
  items: SeparationCaseItem[];
}

export async function getSeparationCase(
  db: DbClient,
  orgId: string,
  separationCaseId: string,
): Promise<SeparationCaseView | null> {
  const [separationCase] = await db
    .select({
      separationCaseId: hrmSeparationCases.id,
      employmentId: hrmSeparationCases.employmentId,
      caseStatus: hrmSeparationCases.caseStatus,
      separationType: hrmSeparationCases.separationType,
      initiatedAt: hrmSeparationCases.initiatedAt,
      targetLastWorkingDate: hrmSeparationCases.targetLastWorkingDate,
      closedAt: hrmSeparationCases.closedAt,
    })
    .from(hrmSeparationCases)
    .where(and(eq(hrmSeparationCases.orgId, orgId), eq(hrmSeparationCases.id, separationCaseId)));

  if (!separationCase) {
    return null;
  }

  const items = await db
    .select({
      itemId: hrmExitClearanceItems.id,
      itemCode: hrmExitClearanceItems.itemCode,
      itemLabel: hrmExitClearanceItems.itemLabel,
      ownerEmployeeId: hrmExitClearanceItems.ownerEmployeeId,
      mandatory: hrmExitClearanceItems.mandatory,
      clearanceStatus: hrmExitClearanceItems.clearanceStatus,
      clearedAt: hrmExitClearanceItems.clearedAt,
    })
    .from(hrmExitClearanceItems)
    .where(
      and(
        eq(hrmExitClearanceItems.orgId, orgId),
        eq(hrmExitClearanceItems.separationCaseId, separationCaseId),
      ),
    );

  return {
    caseNumber: separationCase.separationCaseId,
    lastWorkingDate: separationCase.targetLastWorkingDate
      ? String(separationCase.targetLastWorkingDate)
      : "",
    noticeGivenAt: separationCase.initiatedAt ? String(separationCase.initiatedAt) : null,
    reasonCode: null,
    status: separationCase.caseStatus,
    separationCaseId: separationCase.separationCaseId,
    employmentId: separationCase.employmentId,
    caseStatus: separationCase.caseStatus,
    separationType: separationCase.separationType ?? null,
    initiatedAt: separationCase.initiatedAt ? String(separationCase.initiatedAt) : null,
    targetLastWorkingDate: separationCase.targetLastWorkingDate
      ? String(separationCase.targetLastWorkingDate)
      : null,
    closedAt: separationCase.closedAt ? String(separationCase.closedAt) : null,
    items: items.map((item) => {
      const normalized = {
        ...item,
        itemCode: item.itemCode ?? null,
        ownerEmployeeId: item.ownerEmployeeId ?? null,
        clearedAt: item.clearedAt ? String(item.clearedAt) : null,
      };
      return {
        ...normalized,
        exitClearanceItemId: normalized.itemId,
        clearanceType: normalized.itemCode ?? normalized.itemLabel,
        ownerDepartment: null,
        status: normalized.clearanceStatus,
      };
    }),
    clearanceItems: items.map((item) => ({
      ...item,
      exitClearanceItemId: item.itemId,
      clearanceType: item.itemCode ?? item.itemLabel,
      ownerDepartment: null,
      status: item.clearanceStatus,
      itemCode: item.itemCode ?? null,
      ownerEmployeeId: item.ownerEmployeeId ?? null,
      clearedAt: item.clearedAt ? String(item.clearedAt) : null,
    })),
  };
}