import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq, inArray } from "drizzle-orm";
import * as s from "./schema/index";
import { hrmOrgUnitSeeds } from "./seeds/hrm/seed-hrm-org-units";
import { hrmJobSeeds } from "./seeds/hrm/seed-hrm-jobs";
import { hrmJobGradeSeeds } from "./seeds/hrm/seed-hrm-job-grades";
import { hrmPositionSeeds } from "./seeds/hrm/seed-hrm-positions";
import { hrmRequisitionSeeds } from "./seeds/hrm/seed-hrm-requisition-templates";
import {
  hrmOnboardingTaskTemplateSeeds,
  hrmExitChecklistTemplateSeeds,
} from "./seeds/hrm/seed-hrm-onboarding-task-templates";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const scryptAsync = promisify(scrypt);
const SALT_LEN = 32;
const KEY_LEN = 64;

/** Hash password (matches @afenda/core format: salt:hash hex). */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const hash = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Idempotent upsert helper — always returns the row
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upsert a party by external_key. Returns the row whether it was inserted or
 * already existed. Uses onConflictDoUpdate so .returning() always yields a row.
 */
async function upsertParty(
  tx: Parameters<Parameters<ReturnType<typeof drizzle>["transaction"]>[0]>[0],
  externalKey: string,
  kind: "person" | "organization",
) {
  const [row] = await tx
    .insert(s.party)
    .values({ kind, externalKey })
    .onConflictDoUpdate({
      target: s.party.externalKey,
      targetWhere: sql`external_key IS NOT NULL`,
      set: { kind },
    })
    .returning();
  if (!row) throw new Error(`party upsert failed for ${externalKey}`);
  return row;
}

// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is required");

  const client = new Client({
    connectionString: url,
    application_name: "afenda-seed",
    // Neon cold start: allow 10s for scale-to-zero resume
    ...(url.includes("neon.tech") && { connectionTimeoutMillis: 10_000 }),
  });
  await client.connect();

  try {
    const db = drizzle(client, { schema: s });

    console.log("🌱 seeding (ADR-0003 Party Model)...");

    await db.transaction(async (tx) => {
      // ── DEMO ORG ─────────────────────────────────────────────────────────
      const orgParty = await upsertParty(tx, "org:demo", "organization");

      const [org] = await tx
        .insert(s.organization)
        .values({
          id: orgParty.id,
          slug: "demo",
          name: "Demo Organization",
          functionalCurrency: "USD",
        })
        .onConflictDoUpdate({
          target: s.organization.slug,
          set: { name: "Demo Organization", functionalCurrency: "USD" },
        })
        .returning();
      if (!org) throw new Error("organization upsert failed");

      // ── PERSON + PRINCIPAL ───────────────────────────────────────────────
      const personParty = await upsertParty(tx, "person:admin@demo.afenda", "person");

      const [person] = await tx
        .insert(s.person)
        .values({ id: personParty.id, email: "admin@demo.afenda", name: "Demo Admin" })
        .onConflictDoUpdate({
          target: s.person.id,
          set: { email: "admin@demo.afenda", name: "Demo Admin" },
        })
        .returning();
      if (!person) throw new Error("person upsert failed");

      const demoPasswordHash = await hashPassword("demo123");
      const [principal] = await tx
        .insert(s.iamPrincipal)
        .values({
          personId: person.id,
          kind: "user",
          email: person.email,
          passwordHash: demoPasswordHash,
        })
        .onConflictDoUpdate({
          target: s.iamPrincipal.email,
          set: { personId: person.id, kind: "user", passwordHash: demoPasswordHash },
        })
        .returning();
      if (!principal) throw new Error("principal upsert failed");

      // ── PARTY ROLE + MEMBERSHIP ──────────────────────────────────────────
      const [partyRole] = await tx
        .insert(s.partyRole)
        .values({ orgId: org.id, partyId: personParty.id, roleType: "employee" })
        .onConflictDoUpdate({
          target: [s.partyRole.orgId, s.partyRole.partyId, s.partyRole.roleType],
          set: { roleType: "employee" },
        })
        .returning();
      if (!partyRole) throw new Error("partyRole upsert failed");

      await tx
        .insert(s.membership)
        .values({ principalId: principal.id, partyRoleId: partyRole.id })
        .onConflictDoNothing();

      // ── MFA (TOTP) for demo user ─────────────────────────────────────────
      // Secret is a 32-char base32 TOTP seed (160 bits). Add to Google Authenticator
      // to test MFA flow with admin@demo.afenda / demo123.
      await tx
        .insert(s.iamPrincipalMfa)
        .values({
          principalId: principal.id,
          totpSecret: "AFENDA7AFENDA7AFENDA7AFENDA7AFEK",
        })
        .onConflictDoUpdate({
          target: s.iamPrincipalMfa.principalId,
          set: { totpSecret: "AFENDA7AFENDA7AFENDA7AFENDA7AFEK", updatedAt: sql`now()` },
        });

      // ── PERMISSIONS (insert-then-select: always gets all rows) ───────────
      // Must stay in sync with Permissions enum in @afenda/contracts.
      const permKeys = [
        "ap.invoice.submit",
        "ap.invoice.approve",
        "ap.invoice.markpaid",
        "gl.journal.post",
        "evidence.attach",
        "audit.log.read",
        "admin.org.manage",
        "admin.settings.read",
        "admin.settings.write",
        "admin.custom-fields.read",
        "admin.custom-fields.write",
        "supplier.onboard",
      ] as const;

      await tx
        .insert(s.iamPermission)
        .values(permKeys.map((key) => ({ key })))
        .onConflictDoNothing();

      // Select all (not just newly inserted) — fixes the "empty perms" bug
      const perms = await tx
        .select()
        .from(s.iamPermission)
        .where(inArray(s.iamPermission.key, [...permKeys]));

      // ── ADMIN ROLE ───────────────────────────────────────────────────────
      const [adminRole] = await tx
        .insert(s.iamRole)
        .values({ orgId: org.id, key: "admin", name: "Admin" })
        .onConflictDoUpdate({
          target: [s.iamRole.orgId, s.iamRole.key],
          set: { name: "Admin" },
        })
        .returning();
      if (!adminRole) throw new Error("iamRole upsert failed");

      // ── ROLE ↔ PERMS ────────────────────────────────────────────────────
      for (const p of perms) {
        await tx
          .insert(s.iamRolePermission)
          .values({ roleId: adminRole.id, permissionId: p.id })
          .onConflictDoNothing();
      }

      // ── PRINCIPAL ↔ ROLE ─────────────────────────────────────────────────
      await tx
        .insert(s.iamPrincipalRole)
        .values({ orgId: org.id, principalId: principal.id, roleId: adminRole.id })
        .onConflictDoNothing();

      // ── CHART OF ACCOUNTS ────────────────────────────────────────────────
      const coa = [
        { code: "1000", name: "Cash & Bank", type: "asset" },
        { code: "1100", name: "Accounts Receivable", type: "asset" },
        { code: "2000", name: "Accounts Payable", type: "liability" },
        { code: "3000", name: "Retained Earnings", type: "equity" },
        { code: "4000", name: "Revenue", type: "revenue" },
        { code: "5000", name: "Operating Expenses", type: "expense" },
      ] as const;

      await tx
        .insert(s.account)
        .values(coa.map((a) => ({ ...a, orgId: org.id })))
        .onConflictDoNothing();

      // ── SAMPLE SUPPLIER ──────────────────────────────────────────────────
      const supplierParty = await upsertParty(tx, "org:acme-supplies", "organization");

      const [supplierOrg] = await tx
        .insert(s.organization)
        .values({
          id: supplierParty.id,
          slug: "acme-supplies",
          name: "Acme Supplies Ltd",
          functionalCurrency: "USD",
        })
        .onConflictDoUpdate({
          target: s.organization.slug,
          set: { name: "Acme Supplies Ltd", functionalCurrency: "USD" },
        })
        .returning();

      if (supplierOrg) {
        await tx
          .insert(s.supplier)
          .values({
            orgId: org.id,
            supplierOrgId: supplierOrg.id,
            name: "Acme Supplies Ltd",
            contactEmail: "billing@acme-supplies.example",
            status: "active",
            onboardedByPrincipalId: principal.id,
            onboardedAt: sql`now()`,
          })
          .onConflictDoUpdate({
            target: [s.supplier.orgId, s.supplier.supplierOrgId],
            set: {
              name: "Acme Supplies Ltd",
              contactEmail: "billing@acme-supplies.example",
              status: "active",
            },
          });

        await tx
          .insert(s.partyRole)
          .values({ orgId: org.id, partyId: supplierParty.id, roleType: "supplier" })
          .onConflictDoNothing();
      }

      // ── SEQUENCES ────────────────────────────────────────────────────────
      const year = new Date().getUTCFullYear();
      const periodKey = String(year);

      await tx
        .insert(s.sequence)
        .values([
          {
            orgId: org.id,
            entityType: "invoice",
            periodKey,
            prefix: `INV-${year}`,
            padWidth: 4,
            nextValue: 1,
          },
          {
            orgId: org.id,
            entityType: "journalEntry",
            periodKey,
            prefix: `JE-${year}`,
            padWidth: 4,
            nextValue: 1,
          },
          {
            orgId: org.id,
            entityType: "purchaseOrder",
            periodKey,
            prefix: `PO-${year}`,
            padWidth: 4,
            nextValue: 1,
          },
          {
            orgId: org.id,
            entityType: "receipt",
            periodKey,
            prefix: `GRN-${year}`,
            padWidth: 4,
            nextValue: 1,
          },
        ])
        .onConflictDoNothing();

      // ── HRM FOUNDATION SEEDS (idempotent) ───────────────────────────────
      await tx
        .insert(s.hrmOrgUnits)
        .values(
          hrmOrgUnitSeeds.map((u) => ({
            orgId: org.id,
            legalEntityId: org.id,
            orgUnitCode: u.orgUnitCode,
            orgUnitName: u.orgUnitName,
            status: "active",
          })),
        )
        .onConflictDoNothing();

      const orgUnits = await tx
        .select({ id: s.hrmOrgUnits.id, orgUnitCode: s.hrmOrgUnits.orgUnitCode })
        .from(s.hrmOrgUnits)
        .where(eq(s.hrmOrgUnits.orgId, org.id));
      const orgUnitByCode = new Map(orgUnits.map((u) => [u.orgUnitCode, u.id]));

      await tx
        .insert(s.hrmJobs)
        .values(
          hrmJobSeeds.map((j) => ({
            orgId: org.id,
            jobCode: j.jobCode,
            jobTitle: j.jobTitle,
            status: "active",
          })),
        )
        .onConflictDoNothing();

      const jobs = await tx
        .select({ id: s.hrmJobs.id, jobCode: s.hrmJobs.jobCode })
        .from(s.hrmJobs)
        .where(eq(s.hrmJobs.orgId, org.id));
      const jobByCode = new Map(jobs.map((j) => [j.jobCode, j.id]));

      await tx
        .insert(s.hrmJobGrades)
        .values(
          hrmJobGradeSeeds.map((g) => ({
            orgId: org.id,
            gradeCode: g.gradeCode,
            gradeName: g.gradeName,
            gradeRank: g.gradeRank,
            minSalaryAmount: g.minSalaryAmount,
            midSalaryAmount: g.midSalaryAmount,
            maxSalaryAmount: g.maxSalaryAmount,
          })),
        )
        .onConflictDoNothing();

      const grades = await tx
        .select({ id: s.hrmJobGrades.id, gradeCode: s.hrmJobGrades.gradeCode })
        .from(s.hrmJobGrades)
        .where(eq(s.hrmJobGrades.orgId, org.id));
      const gradeByCode = new Map(grades.map((g) => [g.gradeCode, g.id]));

      await tx
        .insert(s.hrmPositions)
        .values(
          hrmPositionSeeds.map((p) => ({
            orgId: org.id,
            legalEntityId: org.id,
            positionCode: p.positionCode,
            positionTitle: p.positionTitle,
            orgUnitId: orgUnitByCode.get(p.orgUnitCode) ?? null,
            jobId: jobByCode.get(p.jobCode) ?? null,
            gradeId: gradeByCode.get(p.gradeCode) ?? null,
            headcountLimit: p.headcountLimit,
            positionStatus: "open" as const,
            isBudgeted: true,
            effectiveFrom: new Date(),
            isCurrent: true,
          })),
        )
        .onConflictDoNothing();

      const positions = await tx
        .select({ id: s.hrmPositions.id, positionCode: s.hrmPositions.positionCode })
        .from(s.hrmPositions)
        .where(eq(s.hrmPositions.orgId, org.id));
      const positionByCode = new Map(positions.map((p) => [p.positionCode, p.id]));

      await tx
        .insert(s.hrmJobRequisitions)
        .values(
          hrmRequisitionSeeds.map((r) => ({
            orgId: org.id,
            requisitionNumber: r.requisitionNumber,
            requisitionTitle: r.requisitionTitle,
            legalEntityId: org.id,
            orgUnitId: orgUnitByCode.get(r.orgUnitCode) ?? null,
            positionId: positionByCode.get(r.positionCode) ?? null,
            requestedHeadcount: r.requestedHeadcount,
            requestedStartDate: r.requestedStartDate,
            status: r.status,
          })),
        )
        .onConflictDoNothing();

      const today = new Date().toISOString().slice(0, 10);

      const existingPerson = await tx.query.hrmPersons.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.orgId, org.id), eq(t.personCode, "HR-PER-0001")),
      });

      const insertedHrmPerson =
        existingPerson == null
          ? (
              await tx
                .insert(s.hrmPersons)
                .values({
                  orgId: org.id,
                  personCode: "HR-PER-0001",
                  legalName: "Casey Walker",
                  firstName: "Casey",
                  lastName: "Walker",
                  displayName: "Casey Walker",
                  personalEmail: "casey.walker@demo.afenda",
                  mobilePhone: "+1-202-555-0131",
                  status: "active",
                })
                .returning()
            )[0]
          : null;
      const hrmPerson = existingPerson ?? insertedHrmPerson;
      if (!hrmPerson) throw new Error("hrm person upsert failed");

      const existingEmployee = await tx.query.hrmEmployeeProfiles.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.orgId, org.id), eq(t.employeeCode, "HR-EMP-0001")),
      });

      const insertedHrmEmployee =
        existingEmployee == null
          ? (
              await tx
                .insert(s.hrmEmployeeProfiles)
                .values({
                  orgId: org.id,
                  personId: hrmPerson.id,
                  employeeCode: "HR-EMP-0001",
                  workerType: "employee",
                  currentStatus: "active",
                  primaryLegalEntityId: org.id,
                })
                .returning()
            )[0]
          : null;
      const hrmEmployee = existingEmployee ?? insertedHrmEmployee;
      if (!hrmEmployee) throw new Error("hrm employee upsert failed");

      const existingEmployment = await tx.query.hrmEmploymentRecords.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.orgId, org.id), eq(t.employmentNumber, "HR-EMPLOY-0001")),
      });

      const insertedHrmEmployment =
        existingEmployment == null
          ? (
              await tx
                .insert(s.hrmEmploymentRecords)
                .values({
                  orgId: org.id,
                  employeeId: hrmEmployee.id,
                  legalEntityId: org.id,
                  employmentNumber: "HR-EMPLOY-0001",
                  employmentType: "permanent",
                  hireDate: today,
                  startDate: today,
                  employmentStatus: "active",
                  payrollStatus: "inactive",
                  isPrimary: true,
                })
                .returning()
            )[0]
          : null;
      const hrmEmployment = existingEmployment ?? insertedHrmEmployment;
      if (!hrmEmployment) throw new Error("hrm employment upsert failed");

      if (!hrmEmployee.primaryEmploymentId) {
        await tx
          .update(s.hrmEmployeeProfiles)
          .set({ primaryEmploymentId: hrmEmployment.id })
          .where(eq(s.hrmEmployeeProfiles.id, hrmEmployee.id));
      }

      const existingPlan = await tx.query.hrmOnboardingPlans.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.orgId, org.id), eq(t.employmentId, hrmEmployment.id), eq(t.planStatus, "open")),
      });

      const insertedOnboardingPlan =
        existingPlan == null
          ? (
              await tx
                .insert(s.hrmOnboardingPlans)
                .values({
                  orgId: org.id,
                  employmentId: hrmEmployment.id,
                  planStatus: "open",
                  startDate: today,
                })
                .returning()
            )[0]
          : null;
      const onboardingPlan = existingPlan ?? insertedOnboardingPlan;
      if (!onboardingPlan) throw new Error("hrm onboarding plan upsert failed");

      const existingTaskCodes = new Set(
        (
          await tx
            .select({ taskCode: s.hrmOnboardingTasks.taskCode })
            .from(s.hrmOnboardingTasks)
            .where(eq(s.hrmOnboardingTasks.onboardingPlanId, onboardingPlan.id))
        )
          .map((row) => row.taskCode)
          .filter((code): code is string => Boolean(code)),
      );

      const taskRows = hrmOnboardingTaskTemplateSeeds
        .filter((task) => !existingTaskCodes.has(task.taskCode))
        .map((task) => ({
          orgId: org.id,
          onboardingPlanId: onboardingPlan.id,
          taskCode: task.taskCode,
          taskTitle: task.taskTitle,
          ownerEmployeeId: hrmEmployee.id,
          taskStatus: "pending",
          mandatory: task.mandatory,
          dueDate: new Date(Date.now() + task.dueDaysFromStart * 86_400_000)
            .toISOString()
            .slice(0, 10),
        }));
      if (taskRows.length > 0) {
        await tx.insert(s.hrmOnboardingTasks).values(taskRows);
      }

      const existingSeparationCase = await tx.query.hrmSeparationCases.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.orgId, org.id), eq(t.employmentId, hrmEmployment.id), eq(t.caseStatus, "open")),
      });

      const insertedSeparationCase =
        existingSeparationCase == null
          ? (
              await tx
                .insert(s.hrmSeparationCases)
                .values({
                  orgId: org.id,
                  employmentId: hrmEmployment.id,
                  caseStatus: "open",
                  separationType: "resignation",
                  initiatedAt: today,
                  targetLastWorkingDate: today,
                })
                .returning()
            )[0]
          : null;
      const separationCase = existingSeparationCase ?? insertedSeparationCase;
      if (!separationCase) throw new Error("hrm separation case upsert failed");

      const existingExitCodes = new Set(
        (
          await tx
            .select({ itemCode: s.hrmExitClearanceItems.itemCode })
            .from(s.hrmExitClearanceItems)
            .where(eq(s.hrmExitClearanceItems.separationCaseId, separationCase.id))
        )
          .map((row) => row.itemCode)
          .filter((code): code is string => Boolean(code)),
      );

      const clearanceRows = hrmExitChecklistTemplateSeeds
        .filter((item) => !existingExitCodes.has(item.itemCode))
        .map((item) => ({
          orgId: org.id,
          separationCaseId: separationCase.id,
          itemCode: item.itemCode,
          itemLabel: item.itemLabel,
          ownerEmployeeId: hrmEmployee.id,
          mandatory: item.mandatory,
          clearanceStatus: "pending",
        }));
      if (clearanceRows.length > 0) {
        await tx.insert(s.hrmExitClearanceItems).values(clearanceRows);
      }
    });

    console.log("✅ seeded: org + admin principal + RBAC + CoA + sequences + sample supplier");
    console.log("✅ seeded: HR org units + jobs + grades + positions + requisition templates");
    console.log("✅ seeded: HR onboarding task templates + separation checklist templates");
    console.log("   ADR-0003: Using party/organization/person/principal/membership model");
    console.log("   org slug:     demo");
    console.log("   admin email:  admin@demo.afenda");
    console.log("   admin pass:   demo123");
    console.log("   MFA (demo):   Add secret AFENDA7AFENDA7AFENDA7AFENDA7AFEK to Google Authenticator");
    console.log("   supplier:     Acme Supplies Ltd");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
