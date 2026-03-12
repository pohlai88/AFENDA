import { describe, expect, it, vi } from "vitest";
import { getSeparationCase } from "../queries/get-separation-case.query";

function makeSelectChain(whereMock: any) {
  const chain: any = {
    from: () => chain,
    where: whereMock,
  };
  return chain;
}

describe("Wave 5 onboarding read models", () => {
  it("returns separation case with Wave 5 aliases", async () => {
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([
        {
          separationCaseId: "sc-1",
          employmentId: "e-1",
          caseStatus: "open",
          separationType: "resignation",
          initiatedAt: "2026-03-10",
          targetLastWorkingDate: "2026-03-30",
          closedAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          itemId: "ci-1",
          itemCode: "EXIT-ASSET",
          itemLabel: "Return assets",
          ownerEmployeeId: "emp-1",
          mandatory: true,
          clearanceStatus: "pending",
          clearedAt: null,
        },
      ]);

    const db: any = {
      select: vi.fn(() => makeSelectChain(whereMock)),
    };

    const result = await getSeparationCase(db, "org-1", "sc-1");

    expect(result).not.toBeNull();
    expect(result?.caseNumber).toBe("sc-1");
    expect(result?.status).toBe("open");
    expect(result?.clearanceItems[0]?.exitClearanceItemId).toBe("ci-1");
    expect(result?.items[0]?.status).toBe("pending");
  });
});
