import { describe, expect, it } from "vitest";

import { DomainError, InMemoryRepository, PostgresRepository, type QueryClient } from "../db";

type Invoice = {
  id: string;
  org_id: string;
  amount_minor: string;
  currency_code: string;
};

describe("adapters/db", () => {
  it("InMemoryRepository supports create/get/update/list/delete", async () => {
    const repo = new InMemoryRepository<Invoice>();

    const created = await repo.create({
      id: "inv-1",
      org_id: "org-1",
      amount_minor: "100",
      currency_code: "USD",
    });

    expect(created instanceof DomainError).toBe(false);

    const fetched = await repo.getById("inv-1");
    expect(fetched instanceof DomainError).toBe(false);
    expect((fetched as Invoice | null)?.id).toBe("inv-1");

    const updated = await repo.update("inv-1", { amount_minor: "150" });
    expect(updated instanceof DomainError).toBe(false);
    expect((updated as Invoice).amount_minor).toBe("150");

    const listed = await repo.list({ org_id: "org-1" });
    expect(listed instanceof DomainError).toBe(false);
    expect(listed as Invoice[]).toHaveLength(1);

    const deleted = await repo.delete("inv-1");
    expect(deleted instanceof DomainError).toBe(false);
  });

  it("PostgresRepository builds parameterized create SQL", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];

    const client: QueryClient = {
      async query(sql, params) {
        calls.push({ sql, params });
        return {
          rows: [
            {
              id: "inv-2",
              org_id: "org-2",
              amount_minor: "500",
              currency_code: "EUR",
            },
          ],
          rowCount: 1,
        };
      },
    };

    const repo = new PostgresRepository<Invoice>({
      client,
      table: "invoice",
      idCol: "id",
      columns: ["id", "org_id", "amount_minor", "currency_code"],
      rowToEntity: (row) => ({
        id: String(row.id),
        org_id: String(row.org_id),
        amount_minor: String(row.amount_minor),
        currency_code: String(row.currency_code),
      }),
      entityToRow: (entity) => ({
        id: entity.id,
        org_id: entity.org_id,
        amount_minor: entity.amount_minor,
        currency_code: entity.currency_code,
      }),
    });

    const created = await repo.create({
      id: "inv-2",
      org_id: "org-2",
      amount_minor: "500",
      currency_code: "EUR",
    });

    expect(created instanceof DomainError).toBe(false);
    expect(calls[0]?.sql).toContain("INSERT INTO invoice");
    expect(calls[0]?.sql).toContain("VALUES ($1, $2, $3, $4)");
    expect(calls[0]?.params).toEqual(["inv-2", "org-2", "500", "EUR"]);
  });

  it("PostgresRepository returns DomainError for invalid orderBy", async () => {
    const client: QueryClient = {
      async query() {
        return { rows: [], rowCount: 0 };
      },
    };

    const repo = new PostgresRepository<Invoice>({
      client,
      table: "invoice",
      idCol: "id",
      columns: ["id", "org_id", "amount_minor", "currency_code"],
      rowToEntity: (row) => ({
        id: String(row.id),
        org_id: String(row.org_id),
        amount_minor: String(row.amount_minor),
        currency_code: String(row.currency_code),
      }),
      entityToRow: (entity) => ({
        id: entity.id,
        org_id: entity.org_id,
        amount_minor: entity.amount_minor,
        currency_code: entity.currency_code,
      }),
    });

    const listed = await repo.list({}, { orderBy: "id; DROP TABLE invoice" });
    expect(listed).toBeInstanceOf(DomainError);
  });
});
