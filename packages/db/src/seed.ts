import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as s from "./schema/index.js";

async function main() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString: url });
  await client.connect();
  const db = drizzle(client);

  console.log("🌱 seeding (ADR-0003 Party Model)...");

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADR-0003: Seed Party Model tables
  // ═══════════════════════════════════════════════════════════════════════════════

  // ── Party + Organization (the "tenant" in domain language) ─────────────────
  const [orgParty] = await db
    .insert(s.party)
    .values({ kind: "organization" })
    .onConflictDoNothing()
    .returning();

  if (!orgParty) {
    console.log("ℹ️  organization already seeded — skipping");
    await client.end();
    return;
  }

  const [org] = await db
    .insert(s.organization)
    .values({
      id: orgParty.id,
      slug: "demo",
      name: "Demo Organization",
      functionalCurrency: "USD",
    })
    .returning();

  if (!org) throw new Error("organization seed failed");

  // ── Party + Person + Principal (the "user" in domain language) ─────────────
  const [personParty] = await db
    .insert(s.party)
    .values({ kind: "person" })
    .onConflictDoNothing()
    .returning();

  if (!personParty) throw new Error("person party seed failed");

  const [person] = await db
    .insert(s.person)
    .values({ id: personParty.id, email: "admin@demo.afenda", name: "Demo Admin" })
    .onConflictDoNothing()
    .returning();

  if (!person) throw new Error("person seed failed");

  const [principal] = await db
    .insert(s.iamPrincipal)
    .values({ personId: person.id, kind: "user", email: person.email })
    .onConflictDoNothing()
    .returning();

  if (!principal) throw new Error("principal seed failed");

  // ── PartyRole + Membership (the "membership" — person X in org Y as role Z) ─
  const [partyRole] = await db
    .insert(s.partyRole)
    .values({ orgId: org.id, partyId: personParty.id, roleType: "employee" })
    .onConflictDoNothing()
    .returning();

  if (partyRole) {
    await db
      .insert(s.membership)
      .values({ principalId: principal.id, partyRoleId: partyRole.id })
      .onConflictDoNothing();
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  const permKeys = [
    "ap.invoice.submit",
    "ap.invoice.approve",
    "gl.journal.post",
    "evidence.attach",
    "admin.org.manage",
    "supplier.onboard",
  ] as const;

  const perms = await db
    .insert(s.iamPermission)
    .values(permKeys.map((key) => ({ key })))
    .onConflictDoNothing()
    .returning();

  // ── Admin role ─────────────────────────────────────────────────────────────
  const [adminRole] = await db
    .insert(s.iamRole)
    .values({ orgId: org.id, key: "admin", name: "Admin" })
    .returning();

  if (!adminRole) throw new Error("role seed failed");

  // ── Role-perms ─────────────────────────────────────────────────────────────
  for (const p of perms) {
    await db
      .insert(s.iamRolePermission)
      .values({ roleId: adminRole.id, permissionId: p.id })
      .onConflictDoNothing();
  }

  // ── Principal role assignment ──────────────────────────────────────────────
  await db
    .insert(s.iamPrincipalRole)
    .values({ orgId: org.id, principalId: principal.id, roleId: adminRole.id })
    .onConflictDoNothing();

  // ── Seed Chart of Accounts (minimal flat CoA) ─────────────────────────────
  const coa = [
    { code: "1000", name: "Cash & Bank", type: "asset" },
    { code: "1100", name: "Accounts Receivable", type: "asset" },
    { code: "2000", name: "Accounts Payable", type: "liability" },
    { code: "3000", name: "Retained Earnings", type: "equity" },
    { code: "4000", name: "Revenue", type: "revenue" },
    { code: "5000", name: "Operating Expenses", type: "expense" },
  ] as const;

  await db
    .insert(s.account)
    .values(coa.map((a) => ({ ...a, orgId: org.id })))
    .onConflictDoNothing();

  // ── Seed sample supplier (Party Model: external organization + partyRole) ─
  const [supplierParty] = await db
    .insert(s.party)
    .values({ kind: "organization" })
    .onConflictDoNothing()
    .returning();

  if (supplierParty) {
    const [supplierOrg] = await db
      .insert(s.organization)
      .values({
        id: supplierParty.id,
        slug: "acme-supplies",
        name: "Acme Supplies Ltd",
        functionalCurrency: "USD",
      })
      .onConflictDoNothing()
      .returning();

    if (supplierOrg) {
      // Create supplier relationship
      await db
        .insert(s.supplier)
        .values({
          orgId: org.id,
          supplierOrgId: supplierOrg.id,
          name: "Acme Supplies Ltd",
          contactEmail: "billing@acme-supplies.example",
          status: "active",
          onboardedByPrincipalId: principal.id,
          onboardedAt: new Date(),
        })
        .onConflictDoNothing();

      // PartyRole: Acme Supplies is a "supplier" in demo org
      await db
        .insert(s.partyRole)
        .values({ orgId: org.id, partyId: supplierParty.id, roleType: "supplier" })
        .onConflictDoNothing();
    }
  }

  // ── Seed sequences ─────────────────────────────────────────────────────────
  const year = new Date().getFullYear();
  const periodKey = String(year);
  await db
    .insert(s.sequence)
    .values([
      { orgId: org.id, entityType: "invoice", periodKey, prefix: `INV-${year}`, padWidth: 4, nextValue: 1 },
      { orgId: org.id, entityType: "journalEntry", periodKey, prefix: `JE-${year}`, padWidth: 4, nextValue: 1 },
    ])
    .onConflictDoNothing();

  console.log("✅ seeded: org + admin principal + RBAC + CoA + sequences + sample supplier");
  console.log("   ADR-0003: Using party/organization/person/principal/membership model");
  console.log(`   org slug:     demo`);
  console.log(`   admin email:  admin@demo.afenda`);
  console.log(`   supplier:     Acme Supplies Ltd`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
