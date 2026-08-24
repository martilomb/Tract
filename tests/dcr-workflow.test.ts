import { describe, expect, it } from "vitest";

import { transitionDcr, type DcrState } from "@/domain/dcr-workflow";

const draft: DcrState = { id: "dcr-1", organizationId: "org-a", status: "draft", history: [] };

describe("DCR workflow", () => {
  it("applies the default lifecycle and records immutable history", () => {
    const submitted = transitionDcr({
      dcr: draft,
      to: "submitted",
      actorId: "u1",
      actorRoles: ["preparer"],
      occurredAt: "2026-08-21T10:00:00Z",
    });
    const reviewed = transitionDcr({
      dcr: submitted,
      to: "under_review",
      actorId: "u2",
      actorRoles: ["reviewer"],
      occurredAt: "2026-08-21T11:00:00Z",
    });
    const approved = transitionDcr({
      dcr: reviewed,
      to: "approved",
      actorId: "u3",
      actorRoles: ["approver"],
      occurredAt: "2026-08-21T12:00:00Z",
      evidence: {
        documentTypes: ["technical_evidence"],
        assignmentRoles: ["reviewer", "approver"],
        approvedStages: ["technical"],
      },
    });
    expect(approved.status).toBe("approved");
    expect(approved.history.map((entry) => `${entry.from}:${entry.to}`)).toEqual([
      "draft:submitted",
      "submitted:under_review",
      "under_review:approved",
    ]);
    expect(draft.history).toHaveLength(0);
  });

  it("rejects unauthorized and undocumented terminal transitions", () => {
    expect(() =>
      transitionDcr({
        dcr: draft,
        to: "submitted",
        actorId: "u1",
        actorRoles: ["reviewer"],
        occurredAt: "2026-08-21T10:00:00Z",
      }),
    ).toThrow(/not permitted/);
    expect(() =>
      transitionDcr({
        dcr: draft,
        to: "cancelled",
        actorId: "u1",
        actorRoles: ["preparer"],
        occurredAt: "2026-08-21T10:00:00Z",
      }),
    ).toThrow(/comment/);
    expect(() =>
      transitionDcr({
        dcr: { ...draft, status: "closed" },
        to: "active",
        actorId: "u1",
        actorRoles: ["administrator"],
        occurredAt: "2026-08-21T10:00:00Z",
      }),
    ).toThrow(/not allowed/);
  });

  it("enforces configured evidence, assignment, and approval gates", () => {
    expect(() =>
      transitionDcr({
        dcr: { ...draft, status: "under_review" },
        to: "approved",
        actorId: "u3",
        actorRoles: ["approver"],
        occurredAt: "2026-08-21T12:00:00Z",
        evidence: {
          documentTypes: ["technical_evidence"],
          assignmentRoles: ["reviewer"],
          approvedStages: ["technical"],
        },
      }),
    ).toThrow(/approver/);
  });
});
