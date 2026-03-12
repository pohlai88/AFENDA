export interface HrmOrgUnitSeed {
  orgUnitCode: string;
  orgUnitName: string;
  parentOrgUnitCode?: string;
}

export const hrmOrgUnitSeeds: readonly HrmOrgUnitSeed[] = [
  { orgUnitCode: "LE-HQ", orgUnitName: "HQ" },
  { orgUnitCode: "BU-OPS", orgUnitName: "Operations" },
  { orgUnitCode: "BU-GA", orgUnitName: "General Administration" },
  { orgUnitCode: "DEPT-HR", orgUnitName: "Human Resources" },
  { orgUnitCode: "DEPT-FIN", orgUnitName: "Finance" },
  { orgUnitCode: "DEPT-IT", orgUnitName: "Information Technology" },
  { orgUnitCode: "CC-HR-001", orgUnitName: "HR Cost Center" },
  { orgUnitCode: "CC-OPS-001", orgUnitName: "Operations Cost Center" },
];
