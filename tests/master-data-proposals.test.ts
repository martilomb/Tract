import { describe, expect, it } from "vitest";

import {
  createPartRevisionProposal,
  createProgramProposal,
  type ProposalContext,
} from "@/domain/master-data-proposals";

const context: ProposalContext = {
  existingPrograms: [{ id: "program-1", code: "FORD-F150", oem: "Ford", name: "F-150" }],
  existingParts: [
    { id: "part-1", partNumber: "FO-100", revision: "A", effectiveFrom: "2026-01-01" },
  ],
  proposals: [],
};

describe("browser-local governed master-data proposals", () => {
  it("requires review provenance and rejects an existing program code or alias", () => {
    expect(() =>
      createProgramProposal(
        {
          id: "proposal-1",
          organizationId: "demo-org",
          createdAt: "2026-08-27T00:00:00.000Z",
          oem: "Ford",
          code: "FORD-F150",
          name: "Confidential program",
          modelYears: [2028],
          effectiveFrom: "2027-01-01",
          effectiveTo: "2032-12-31",
          confidential: true,
          reviewReason: "Customer exception review",
          aliases: [],
        },
        context,
      ),
    ).toThrow(/duplicates existing program/i);
  });

  it("creates only a pending program proposal with normalized governed years", () => {
    const proposal = createProgramProposal(
      {
        id: "proposal-2",
        organizationId: "demo-org",
        createdAt: "2026-08-27T00:00:00.000Z",
        oem: "Ford",
        code: "FORD-SECRET",
        name: "Confidential program",
        modelYears: [2029, 2028, 2029],
        effectiveFrom: "2027-01-01",
        effectiveTo: "2032-12-31",
        confidential: true,
        reviewReason: "Approved customer confidentiality exception",
        aliases: ["Project Secret"],
      },
      context,
    );

    expect(proposal).toMatchObject({ kind: "program", status: "pending_review" });
    if (proposal.kind === "program") expect(proposal.modelYears).toEqual([2028, 2029]);
  });

  it("requires an explicit historical link for a revision and rejects an exact collision", () => {
    const input = {
      id: "proposal-3",
      organizationId: "demo-org",
      createdAt: "2026-08-27T00:00:00.000Z",
      partNumber: "FO-100",
      revision: "B",
      description: "Effective-dated revision",
      programId: "program-1",
      modelYears: [2028],
      effectiveFrom: "2027-01-01",
      reviewReason: "Approved DCR requires a revision",
    } as const;

    expect(() => createPartRevisionProposal(input, context)).toThrow(
      /link that historical record/i,
    );

    const proposal = createPartRevisionProposal({ ...input, historicalLink: "part-1" }, context);
    expect(proposal).toMatchObject({ kind: "part_revision", status: "pending_review" });

    expect(() =>
      createPartRevisionProposal(
        { ...input, revision: "A", effectiveFrom: "2026-01-01", historicalLink: "part-1" },
        context,
      ),
    ).toThrow(/duplicate existing record/i);
  });
});
