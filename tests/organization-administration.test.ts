import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import { isOrganizationAdministration } from "@/domain/organization-administration";
import { changeOrganizationMembership } from "@/server/memberships.server";

describe("organization administration response boundary", () => {
  it("rejects incomplete server payloads before rendering privileged controls", () => {
    expect(isOrganizationAdministration(null)).toBe(false);
    expect(isOrganizationAdministration({ organizationId: "org" })).toBe(false);
    expect(
      isOrganizationAdministration({
        organizationId: "org",
        memberListComplete: true,
        members: [],
        invitations: [],
        audit: [],
        seat: {
          included: 3,
          activeMembers: 1,
          pendingInvitations: 0,
          subscriptionStatus: "trialing",
        },
      }),
    ).toBe(true);
    expect(
      isOrganizationAdministration({
        organizationId: "org",
        memberListComplete: true,
        members: [{ role: "administrator" }],
        invitations: [],
        audit: [],
        seat: {
          included: 3,
          activeMembers: 1,
          pendingInvitations: 0,
          subscriptionStatus: "trialing",
        },
      }),
    ).toBe(false);
    expect(
      isOrganizationAdministration({
        organizationId: "org",
        memberListComplete: true,
        members: [],
        invitations: [],
        audit: [],
        seat: {
          included: -1,
          activeMembers: 1,
          pendingInvitations: 0,
          subscriptionStatus: "trialing",
        },
      }),
    ).toBe(false);
  });
});

describe("organization membership actions", () => {
  it("scopes role changes to the selected organization and membership", async () => {
    const updates: Record<string, unknown>[] = [];
    const filters: [string, string][] = [];
    const query = {
      update(value: Record<string, unknown>) {
        updates.push(value);
        return this;
      },
      eq(column: string, value: string) {
        filters.push([column, value]);
        return this;
      },
      select() {
        return this;
      },
      async maybeSingle() {
        return { data: { id: "30000000-0000-0000-0000-000000000001" }, error: null };
      },
    };
    const client = { from: () => query } as unknown as SupabaseClient<Database>;

    await changeOrganizationMembership({
      client,
      organizationId: "20000000-0000-0000-0000-000000000001",
      payload: {
        action: "set_role",
        membershipId: "30000000-0000-0000-0000-000000000001",
        role: "full_view",
      },
    });

    expect(updates).toEqual([{ role: "full_view" }]);
    expect(filters).toEqual([
      ["organization_id", "20000000-0000-0000-0000-000000000001"],
      ["id", "30000000-0000-0000-0000-000000000001"],
    ]);
  });

  it.each([
    [
      "organization must retain an active administrator",
      "Assign another active administrator before changing the final administrator.",
    ],
    ["active membership requires an effective seat entitlement", "No active seat is available"],
    ["row was not available", "denied by the organization policy"],
  ])(
    "maps database denial without exposing internal details",
    async (databaseMessage, expected) => {
      const query = {
        update() {
          return this;
        },
        eq() {
          return this;
        },
        select() {
          return this;
        },
        async maybeSingle() {
          return { data: null, error: { message: databaseMessage } };
        },
      };
      const client = { from: () => query } as unknown as SupabaseClient<Database>;

      await expect(
        changeOrganizationMembership({
          client,
          organizationId: "20000000-0000-0000-0000-000000000001",
          payload: {
            action: "deactivate",
            membershipId: "30000000-0000-0000-0000-000000000001",
          },
        }),
      ).rejects.toThrow(expected);
    },
  );
});
