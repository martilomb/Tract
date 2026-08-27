import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/database.types";
import {
  acceptOrganizationInvitation,
  createOrganizationInvitation,
  generateInvitationSecret,
} from "@/server/invitations.server";

describe("organization invitation secrets", () => {
  it("generates opaque URL-safe tokens and SHA-256 digests without persisting the raw token", async () => {
    const first = await generateInvitationSecret();
    const second = await generateInvitationSecret();

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(first.tokenDigest).toMatch(/^\\x[0-9a-f]{64}$/u);
    expect(first.tokenDigest).not.toContain(first.token);
    expect(second.token).not.toBe(first.token);
    expect(second.tokenDigest).not.toBe(first.tokenDigest);
  });

  it("persists only a normalized digest record and returns the raw token once in the link", async () => {
    let inserted: Record<string, unknown> | undefined;
    const expiredFilters: [string, string][] = [];
    const client = {
      from: () => ({
        update: (value: Record<string, unknown>) => ({
          eq(column: string, filter: string) {
            expiredFilters.push([column, filter]);
            return this;
          },
          async lte(column: string, filter: string) {
            expiredFilters.push([column, filter]);
            expect(value).toEqual({ status: "expired" });
            return { error: null };
          },
        }),
        insert: async (value: Record<string, unknown>) => {
          inserted = value;
          return { error: null };
        },
      }),
    } as unknown as SupabaseClient<Database>;

    const invitation = await createOrganizationInvitation({
      client,
      organizationId: "20000000-0000-0000-0000-000000000001",
      invitedBy: "10000000-0000-0000-0000-000000000001",
      payload: { email: "  Reviewer@Example.invalid ", role: "member", expiresInDays: 7 },
      now: new Date("2026-08-27T00:00:00.000Z"),
    });

    expect(inserted?.email).toBe("reviewer@example.invalid");
    expect(inserted?.expires_at).toBe("2026-09-03T00:00:00.000Z");
    expect(inserted?.token_digest).toMatch(/^\\x[0-9a-f]{64}$/u);
    expect(expiredFilters).toEqual([
      ["organization_id", "20000000-0000-0000-0000-000000000001"],
      ["email", "reviewer@example.invalid"],
      ["status", "pending"],
      ["expires_at", "2026-08-27T00:00:00.000Z"],
    ]);
    expect(invitation.invitationPath).toMatch(/^\/#invitation=[A-Za-z0-9_-]{43}$/u);
    expect(JSON.stringify(inserted)).not.toContain(invitation.invitationPath.split("=")[1]);
  });

  it("uses only the bounded invitation RPC for acceptance", async () => {
    let called: { name: string; parameters: Record<string, unknown> } | undefined;
    const client = {
      rpc: async (name: string, parameters: Record<string, unknown>) => {
        called = { name, parameters };
        return { data: "20000000-0000-0000-0000-000000000001", error: null };
      },
    } as unknown as SupabaseClient<Database>;

    await acceptOrganizationInvitation({ client, token: "opaque-invitation-token-value" });
    expect(called).toEqual({
      name: "accept_organization_invitation",
      parameters: { invitation_token: "opaque-invitation-token-value" },
    });
  });
});
