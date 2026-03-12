/**
 * Vitest globalSetup — provisions the `afenda_test` database.
 *
 * 1. Connects to the default `afenda_dev` database.
 * 2. Creates `afenda_test` if it doesn't exist (or drops/recreates it if
 *    it was bootstrapped via schema-push rather than migrations).
 * 3. Runs Drizzle migrations against `afenda_test`.
 * 4. Seeds minimal test fixtures (org, principals, CoA, supplier, sequences).
 *
 * Re-running is idempotent — migrations are tracked, seeds use upserts.
 * The DB persists across test runs for speed. Individual test suites
 * truncate tables they modify via the `resetDb()` helper.
 *
 * NOTE: Uses raw SQL (pg Client) for seeds to avoid importing @afenda/db
 * and violating the boundary rule (apps/api → @afenda/contracts + @afenda/core only).
 */

import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** Connection to the admin DB — used to CREATE DATABASE */
const ADMIN_URL = "postgres://afenda:afenda@localhost:5433/afenda_dev";
/** Connection to the test DB — used for migrations + seeds */
export const TEST_DB_URL = "postgres://afenda:afenda@localhost:5433/afenda_test";

export async function setup() {
  // ── 1. Recreate afenda_test database deterministically ──────────────────
  const adminClient = new Client({ connectionString: ADMIN_URL });
  await adminClient.connect();
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS afenda_test WITH (FORCE)`);
    await adminClient.query(`CREATE DATABASE afenda_test OWNER afenda`);
    console.log("✅ recreated afenda_test database");
  } finally {
    await adminClient.end();
  }

  // ── 2. Run migrations ───────────────────────────────────────────────────
  const migrationsFolder = resolve(__dirname, "../../../../packages/db/drizzle");

  const migrateClient = new Client({
    connectionString: TEST_DB_URL,
    application_name: "afenda-test-migrate",
  });
  await migrateClient.connect();
  try {
    await migrateClient.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    const db = drizzle(migrateClient);
    await migrate(db, { migrationsFolder });
    console.log("✅ migrations applied to afenda_test");
  } finally {
    await migrateClient.end();
  }

  // ── 3. Seed minimal test fixtures (raw SQL) ──────────────────────────────
  const seedClient = new Client({
    connectionString: TEST_DB_URL,
    application_name: "afenda-test-seed",
  });
  await seedClient.connect();
  try {
    await seedClient.query("BEGIN");

    // ── Org party + organization ──────────────────────────────────────
    const {
      rows: [orgParty],
    } = await seedClient.query(`
      INSERT INTO party (kind, external_key)
      VALUES ('organization', 'org:test-org')
      ON CONFLICT (external_key) WHERE external_key IS NOT NULL
        DO UPDATE SET kind = 'organization'
      RETURNING id
    `);
    if (!orgParty) throw new Error("party upsert failed");

    const {
      rows: [org],
    } = await seedClient.query(
      `
      INSERT INTO organization (id, slug, name, functional_currency)
      VALUES ($1, 'test-org', 'Test Organization', 'USD')
      ON CONFLICT (slug)
        DO UPDATE SET name = 'Test Organization', functional_currency = 'USD'
      RETURNING id
    `,
      [orgParty.id],
    );
    if (!org) throw new Error("org upsert failed");

    // ── Submitter principal (admin@test.afenda) ───────────────────────
    const submitterPartyId = await upsertParty(seedClient, "person:admin@test.afenda", "person");

    await seedClient.query(
      `
      INSERT INTO person (id, email, name)
      VALUES ($1, 'admin@test.afenda', 'Test Admin')
      ON CONFLICT (id)
        DO UPDATE SET email = 'admin@test.afenda', name = 'Test Admin'
    `,
      [submitterPartyId],
    );

    const {
      rows: [submitterPrincipal],
    } = await seedClient.query(
      `
      INSERT INTO iam_principal (person_id, kind, email)
      VALUES ($1, 'user', 'admin@test.afenda')
      ON CONFLICT (email)
        DO UPDATE SET person_id = $1, kind = 'user'
      RETURNING id
    `,
      [submitterPartyId],
    );

    const {
      rows: [submitterPartyRole],
    } = await seedClient.query(
      `
      INSERT INTO party_role (org_id, party_id, role_type)
      VALUES ($1, $2, 'employee')
      ON CONFLICT (org_id, party_id, role_type)
        DO UPDATE SET role_type = 'employee'
      RETURNING id
    `,
      [org.id, submitterPartyId],
    );

    await seedClient.query(
      `
      INSERT INTO membership (principal_id, party_role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
      [submitterPrincipal!.id, submitterPartyRole!.id],
    );

    // ── Approver principal (approver@test.afenda) ─────────────────────
    const approverPartyId = await upsertParty(seedClient, "person:approver@test.afenda", "person");

    await seedClient.query(
      `
      INSERT INTO person (id, email, name)
      VALUES ($1, 'approver@test.afenda', 'Test Approver')
      ON CONFLICT (id)
        DO UPDATE SET email = 'approver@test.afenda', name = 'Test Approver'
    `,
      [approverPartyId],
    );

    const {
      rows: [approverPrincipal],
    } = await seedClient.query(
      `
      INSERT INTO iam_principal (person_id, kind, email)
      VALUES ($1, 'user', 'approver@test.afenda')
      ON CONFLICT (email)
        DO UPDATE SET person_id = $1, kind = 'user'
      RETURNING id
    `,
      [approverPartyId],
    );

    const {
      rows: [approverPartyRole],
    } = await seedClient.query(
      `
      INSERT INTO party_role (org_id, party_id, role_type)
      VALUES ($1, $2, 'employee')
      ON CONFLICT (org_id, party_id, role_type)
        DO UPDATE SET role_type = 'employee'
      RETURNING id
    `,
      [org.id, approverPartyId],
    );

    await seedClient.query(
      `
      INSERT INTO membership (principal_id, party_role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
      [approverPrincipal!.id, approverPartyRole!.id],
    );

    // ── Permissions ──────────────────────────────────────────────────
    // Clean up stale permission rows + assignments from previous runs
    // so renamed/removed keys don't poison the PermissionKeySchema enum.
    const permKeys = [
      "ap.invoice.submit",
      "ap.invoice.approve",
      "ap.invoice.markpaid",
      "gl.journal.post",
      "evidence.attach",
      "admin.org.manage",
      "admin.settings.read",
      "admin.settings.write",
      "supplier.onboard",
      "audit.log.read",
    ];

    await seedClient.query(
      `
      DELETE FROM iam_role_permission
      WHERE permission_id IN (
        SELECT id FROM iam_permission WHERE key != ALL($1)
      )
    `,
      [permKeys],
    );
    await seedClient.query(
      `
      DELETE FROM iam_permission WHERE key != ALL($1)
    `,
      [permKeys],
    );

    for (const key of permKeys) {
      await seedClient.query(
        `
        INSERT INTO iam_permission (key) VALUES ($1)
        ON CONFLICT DO NOTHING
      `,
        [key],
      );
    }

    const { rows: perms } = await seedClient.query(
      `
      SELECT id, key FROM iam_permission WHERE key = ANY($1)
    `,
      [permKeys],
    );

    // ── Submitter IAM role (operator — submit only) ────────────────────
    const {
      rows: [operatorRole],
    } = await seedClient.query(
      `
      INSERT INTO iam_role (org_id, key, name)
      VALUES ($1, 'operator', 'Operator')
      ON CONFLICT (org_id, key)
        DO UPDATE SET name = 'Operator'
      RETURNING id
    `,
      [org.id],
    );

    for (const p of perms.filter((p: { key: string }) =>
      ["ap.invoice.submit", "evidence.attach", "admin.settings.read", "admin.settings.write"].includes(
        p.key,
      ),
    )) {
      await seedClient.query(
        `
        INSERT INTO iam_role_permission (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
        [operatorRole!.id, p.id],
      );
    }

    await seedClient.query(
      `
      INSERT INTO iam_principal_role (org_id, principal_id, role_id)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `,
      [org.id, submitterPrincipal!.id, operatorRole!.id],
    );

    // ── Approver IAM role (approve + post) ─────────────────────────────
    const {
      rows: [approverIamRole],
    } = await seedClient.query(
      `
      INSERT INTO iam_role (org_id, key, name)
      VALUES ($1, 'approver', 'Approver')
      ON CONFLICT (org_id, key)
        DO UPDATE SET name = 'Approver'
      RETURNING id
    `,
      [org.id],
    );

    for (const p of perms.filter((p: { key: string }) =>
      ["ap.invoice.approve", "ap.invoice.markpaid", "gl.journal.post", "audit.log.read"].includes(
        p.key,
      ),
    )) {
      await seedClient.query(
        `
        INSERT INTO iam_role_permission (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
        [approverIamRole!.id, p.id],
      );
    }

    await seedClient.query(
      `
      INSERT INTO iam_principal_role (org_id, principal_id, role_id)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `,
      [org.id, approverPrincipal!.id, approverIamRole!.id],
    );

    // ── Chart of Accounts ────────────────────────────────────────────
    const coa = [
      { code: "1000", name: "Cash & Bank", type: "asset" },
      { code: "1100", name: "Accounts Receivable", type: "asset" },
      { code: "2000", name: "Accounts Payable", type: "liability" },
      { code: "3000", name: "Retained Earnings", type: "equity" },
      { code: "4000", name: "Revenue", type: "revenue" },
      { code: "5000", name: "Operating Expenses", type: "expense" },
    ];

    for (const a of coa) {
      await seedClient.query(
        `
        INSERT INTO account (org_id, code, name, type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `,
        [org.id, a.code, a.name, a.type],
      );
    }

    // ── Supplier ─────────────────────────────────────────────────────
    const supplierPartyId = await upsertParty(seedClient, "org:test-supplier", "organization");

    await seedClient.query(
      `
      INSERT INTO organization (id, slug, name, functional_currency)
      VALUES ($1, 'test-supplier', 'Test Supplier Inc', 'USD')
      ON CONFLICT (slug)
        DO UPDATE SET name = 'Test Supplier Inc', functional_currency = 'USD'
    `,
      [supplierPartyId],
    );

    await seedClient.query(
      `
      INSERT INTO supplier (org_id, supplier_org_id, name, contact_email, status, onboarded_by_principal_id, onboarded_at)
      VALUES ($1, $2, 'Test Supplier Inc', 'billing@test-supplier.example', 'active', $3, now())
      ON CONFLICT (org_id, supplier_org_id)
        DO UPDATE SET name = 'Test Supplier Inc', contact_email = 'billing@test-supplier.example', status = 'active'
    `,
      [org.id, supplierPartyId, submitterPrincipal!.id],
    );

    await seedClient.query(
      `
      INSERT INTO party_role (org_id, party_id, role_type)
      VALUES ($1, $2, 'supplier')
      ON CONFLICT DO NOTHING
    `,
      [org.id, supplierPartyId],
    );

    // ── Sequences ────────────────────────────────────────────────────
    const year = new Date().getUTCFullYear();
    const periodKey = String(year);

    await seedClient.query(
      `
      INSERT INTO sequence (org_id, entity_type, period_key, prefix, pad_width, next_value)
      VALUES ($1, 'invoice', $2, $3, 4, 1),
             ($1, 'journalEntry', $2, $4, 4, 1)
      ON CONFLICT DO NOTHING
    `,
      [org.id, periodKey, `INV-${year}`, `JE-${year}`],
    );

    await seedClient.query("COMMIT");
    console.log("✅ test fixtures seeded in afenda_test");
  } catch (err) {
    await seedClient.query("ROLLBACK");
    throw err;
  } finally {
    await seedClient.end();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function upsertParty(
  client: Client,
  externalKey: string,
  kind: "person" | "organization",
): Promise<string> {
  const {
    rows: [row],
  } = await client.query(
    `
    INSERT INTO party (kind, external_key)
    VALUES ($1, $2)
    ON CONFLICT (external_key) WHERE external_key IS NOT NULL
      DO UPDATE SET kind = $1
    RETURNING id
  `,
    [kind, externalKey],
  );
  if (!row) throw new Error(`party upsert failed for ${externalKey}`);
  return row.id;
}
