import { describe, expect, it } from "vitest";

import {
  authorizeResource,
  canManagePermissions,
  type Membership,
  type ScopeGrant,
} from "@/domain/authorization";

const memberships: Membership[] = [
  { organizationId: "org-a", userId: "admin", role: "administrator", active: true },
  { organizationId: "org-a", userId: "viewer", role: "full_view", active: true },
  { organizationId: "org-a", userId: "scoped", role: "member", active: true },
  { organizationId: "org-b", userId: "scoped", role: "administrator", active: true },
];

const grants: ScopeGrant[] = [
  {
    organizationId: "org-a",
    userId: "scoped",
    grantType: "program",
    resourceId: "program-1",
    permissions: ["read"],
  },
  {
    organizationId: "org-a",
    userId: "scoped",
    grantType: "part",
    resourceId: "part-2",
    permissions: ["read", "write"],
  },
];

describe("tenant authorization", () => {
  it("denies cross-tenant access even when the user administers another organization", () => {
    expect(
      authorizeResource({
        userId: "scoped",
        permission: "read",
        resource: { organizationId: "org-a", programId: "other" },
        memberships,
        grants,
      }),
    ).toBe(false);
    expect(
      authorizeResource({
        userId: "scoped",
        permission: "write",
        resource: { organizationId: "org-b", programId: "other" },
        memberships,
        grants,
      }),
    ).toBe(true);
  });

  it("combines scoped grants additively", () => {
    expect(
      authorizeResource({
        userId: "scoped",
        permission: "read",
        resource: { organizationId: "org-a", programId: "program-1" },
        memberships,
        grants,
      }),
    ).toBe(true);
    expect(
      authorizeResource({
        userId: "scoped",
        permission: "write",
        resource: { organizationId: "org-a", partId: "part-2" },
        memberships,
        grants,
      }),
    ).toBe(true);
    expect(
      authorizeResource({
        userId: "scoped",
        permission: "write",
        resource: { organizationId: "org-a", programId: "program-1" },
        memberships,
        grants,
      }),
    ).toBe(false);
  });

  it("separates full-view from permission administration", () => {
    expect(
      authorizeResource({
        userId: "viewer",
        permission: "read",
        resource: { organizationId: "org-a" },
        memberships,
        grants,
      }),
    ).toBe(true);
    expect(
      authorizeResource({
        userId: "viewer",
        permission: "write",
        resource: { organizationId: "org-a" },
        memberships,
        grants,
      }),
    ).toBe(false);
    expect(canManagePermissions("viewer", "org-a", memberships)).toBe(false);
    expect(canManagePermissions("admin", "org-a", memberships)).toBe(true);
  });
});
