import { invariant } from "./errors";

export type ConfigurationKind =
  | "recovery_policy"
  | "dcr_workflow"
  | "notification_rules"
  | "document_mapping"
  | "import_mapping"
  | "retention_policy";

export interface VersionedConfiguration<T> {
  id: string;
  organizationId: string;
  kind: ConfigurationKind;
  version: number;
  effectiveFrom: string;
  status: "draft" | "active" | "superseded";
  payload: T;
  supersedesId?: string;
}

export function activateConfiguration<T>(input: {
  draft: VersionedConfiguration<T>;
  current?: VersionedConfiguration<T>;
  actorCanManage: boolean;
}): { active: VersionedConfiguration<T>; superseded?: VersionedConfiguration<T> } {
  invariant(
    input.actorCanManage,
    "Configuration management permission required",
    "configuration_forbidden",
  );
  invariant(
    input.draft.status === "draft",
    "Only draft configuration can be activated",
    "configuration_not_draft",
  );
  if (input.current) {
    invariant(
      input.current.organizationId === input.draft.organizationId,
      "Cross-tenant configuration change rejected",
      "tenant_mismatch",
    );
    invariant(
      input.current.kind === input.draft.kind,
      "Configuration kinds must match",
      "configuration_kind_mismatch",
    );
    invariant(
      input.draft.version === input.current.version + 1,
      "Configuration versions must be sequential",
      "configuration_version_gap",
    );
    invariant(
      input.draft.effectiveFrom > input.current.effectiveFrom,
      "New configuration requires a later effective date",
      "configuration_effective_date",
    );
  } else {
    invariant(
      input.draft.version === 1,
      "First configuration version must be 1",
      "configuration_version_gap",
    );
  }

  return Object.freeze({
    active: Object.freeze({
      ...input.draft,
      status: "active" as const,
      supersedesId: input.current?.id,
    }),
    superseded: input.current
      ? Object.freeze({ ...input.current, status: "superseded" as const })
      : undefined,
  });
}
