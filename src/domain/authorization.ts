import { invariant } from "./errors";

export type OrganizationRole = "administrator" | "full_view" | "member";
export type GrantType = "department" | "technical_team" | "program" | "part";
export type Permission = "read" | "write" | "approve";

export interface Membership {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  active: boolean;
}

export interface ScopeGrant {
  organizationId: string;
  userId: string;
  grantType: GrantType;
  resourceId: string;
  permissions: readonly Permission[];
}

export interface ScopedResource {
  organizationId: string;
  departmentId?: string;
  technicalTeamId?: string;
  programId?: string;
  partId?: string;
}

function membershipFor(userId: string, organizationId: string, memberships: readonly Membership[]) {
  return memberships.find(
    (membership) =>
      membership.userId === userId &&
      membership.organizationId === organizationId &&
      membership.active,
  );
}

export function authorizeResource(input: {
  userId: string;
  permission: Permission;
  resource: ScopedResource;
  memberships: readonly Membership[];
  grants: readonly ScopeGrant[];
}): boolean {
  const membership = membershipFor(input.userId, input.resource.organizationId, input.memberships);
  if (!membership) return false;
  if (membership.role === "administrator" || membership.role === "full_view") {
    return input.permission === "read" || membership.role === "administrator";
  }

  const resourceScopes: Readonly<Record<GrantType, string | undefined>> = {
    department: input.resource.departmentId,
    technical_team: input.resource.technicalTeamId,
    program: input.resource.programId,
    part: input.resource.partId,
  };

  return input.grants.some(
    (grant) =>
      grant.userId === input.userId &&
      grant.organizationId === input.resource.organizationId &&
      resourceScopes[grant.grantType] === grant.resourceId &&
      grant.permissions.includes(input.permission),
  );
}

export function assertAuthorized(input: Parameters<typeof authorizeResource>[0]): void {
  invariant(authorizeResource(input), "Access denied", "access_denied", {
    userId: input.userId,
    organizationId: input.resource.organizationId,
    permission: input.permission,
  });
}

export function canManagePermissions(
  userId: string,
  organizationId: string,
  memberships: readonly Membership[],
): boolean {
  return membershipFor(userId, organizationId, memberships)?.role === "administrator";
}
