import { invariant } from "./errors";

export type DcrStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "active"
  | "closed"
  | "rejected"
  | "cancelled";

export type WorkflowRole = "administrator" | "preparer" | "reviewer" | "approver";

export interface WorkflowTransition {
  from: DcrStatus;
  to: DcrStatus;
  allowedRoles: readonly WorkflowRole[];
  requiresComment?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  version: number;
  effectiveFrom: string;
  transitions: readonly WorkflowTransition[];
}

export interface DcrHistoryEntry {
  from: DcrStatus;
  to: DcrStatus;
  actorId: string;
  occurredAt: string;
  comment?: string;
  workflowId: string;
  workflowVersion: number;
}

export interface DcrState {
  id: string;
  organizationId: string;
  status: DcrStatus;
  history: readonly DcrHistoryEntry[];
}

export const defaultDcrWorkflow: WorkflowDefinition = Object.freeze({
  id: "tract-default-dcr",
  version: 1,
  effectiveFrom: "2026-08-21",
  transitions: Object.freeze([
    { from: "draft", to: "submitted", allowedRoles: ["administrator", "preparer"] },
    {
      from: "draft",
      to: "cancelled",
      allowedRoles: ["administrator", "preparer"],
      requiresComment: true,
    },
    { from: "submitted", to: "under_review", allowedRoles: ["administrator", "reviewer"] },
    {
      from: "submitted",
      to: "rejected",
      allowedRoles: ["administrator", "reviewer"],
      requiresComment: true,
    },
    { from: "submitted", to: "cancelled", allowedRoles: ["administrator"], requiresComment: true },
    { from: "under_review", to: "approved", allowedRoles: ["administrator", "approver"] },
    {
      from: "under_review",
      to: "rejected",
      allowedRoles: ["administrator", "approver"],
      requiresComment: true,
    },
    {
      from: "under_review",
      to: "cancelled",
      allowedRoles: ["administrator"],
      requiresComment: true,
    },
    { from: "approved", to: "active", allowedRoles: ["administrator", "approver"] },
    { from: "approved", to: "cancelled", allowedRoles: ["administrator"], requiresComment: true },
    {
      from: "active",
      to: "closed",
      allowedRoles: ["administrator", "approver"],
      requiresComment: true,
    },
  ] satisfies readonly WorkflowTransition[]),
});

const TERMINAL_STATUSES = new Set<DcrStatus>(["closed", "rejected", "cancelled"]);

export function validateWorkflow(definition: WorkflowDefinition): WorkflowDefinition {
  invariant(definition.id.trim() !== "", "Workflow id is required", "invalid_workflow");
  invariant(
    Number.isInteger(definition.version) && definition.version > 0,
    "Workflow version must be positive",
    "invalid_workflow",
  );
  const keys = new Set<string>();
  for (const transition of definition.transitions) {
    invariant(
      !TERMINAL_STATUSES.has(transition.from),
      "Terminal states cannot have outgoing transitions",
      "invalid_workflow",
      {
        status: transition.from,
      },
    );
    invariant(
      transition.allowedRoles.length > 0,
      "Each transition requires an allowed role",
      "invalid_workflow",
    );
    const key = `${transition.from}:${transition.to}`;
    invariant(!keys.has(key), "Duplicate workflow transition", "invalid_workflow", { key });
    keys.add(key);
  }
  return definition;
}

export function transitionDcr(input: {
  dcr: DcrState;
  to: DcrStatus;
  actorId: string;
  actorRoles: readonly WorkflowRole[];
  occurredAt: string;
  comment?: string;
  workflow?: WorkflowDefinition;
}): DcrState {
  const workflow = validateWorkflow(input.workflow ?? defaultDcrWorkflow);
  const transition = workflow.transitions.find(
    (candidate) => candidate.from === input.dcr.status && candidate.to === input.to,
  );
  invariant(transition, "DCR transition is not allowed", "transition_not_allowed", {
    from: input.dcr.status,
    to: input.to,
  });
  invariant(
    input.actorRoles.some((role) => transition.allowedRoles.includes(role)),
    "Actor is not permitted to perform this DCR transition",
    "transition_forbidden",
  );
  invariant(
    !transition.requiresComment || Boolean(input.comment?.trim()),
    "A comment is required for this transition",
    "comment_required",
  );

  const entry: DcrHistoryEntry = Object.freeze({
    from: input.dcr.status,
    to: input.to,
    actorId: input.actorId,
    occurredAt: input.occurredAt,
    comment: input.comment?.trim() || undefined,
    workflowId: workflow.id,
    workflowVersion: workflow.version,
  });

  return Object.freeze({
    ...input.dcr,
    status: input.to,
    history: Object.freeze([...input.dcr.history, entry]),
  });
}
