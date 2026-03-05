import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq, inArray } from "drizzle-orm";
import * as s from "./schema/index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

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

      const [principal] = await tx
        .insert(s.iamPrincipal)
        .values({ personId: person.id, kind: "user", email: person.email })
        .onConflictDoUpdate({
          target: s.iamPrincipal.email,
          set: { personId: person.id, kind: "user" },
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

      // ── PERMISSIONS (insert-then-select: always gets all rows) ───────────
      const permKeys = [
        "ap.invoice.submit",
        "ap.invoice.approve",
        "gl.journal.post",
        "evidence.attach",
        "admin.org.manage",
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
        ])
        .onConflictDoNothing();
    });

    console.log("✅ seeded: org + admin principal + RBAC + CoA + sequences + sample supplier");
    console.log("   ADR-0003: Using party/organization/person/principal/membership model");
    console.log("   org slug:     demo");
    console.log("   admin email:  admin@demo.afenda");
    console.log("   supplier:     Acme Supplies Ltd");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
