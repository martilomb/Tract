import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../database.types";
import type { OrganizationAdministration } from "../../domain/organization-administration";

export async function loadOrganizationAdministration(input: {
  client: SupabaseClient<Database>;
  organizationId: string;
  administrator: boolean;
}): Promise<OrganizationAdministration> {
  const now = new Date().toISOString();
  const [members, invitations, entitlements, subscriptions, audit] = await Promise.all([
    input.client
      .from("memberships")
      .select("id, user_id, role, active, updated_at")
      .eq("organization_id", input.organizationId)
      .order("created_at", { ascending: true }),
    input.client
      .from("organization_invitations")
      .select("id, email, role, status, expires_at")
      .eq("organization_id", input.organizationId)
      .order("created_at", { ascending: false }),
    input.client
      .from("seat_entitlements")
      .select("included_seats, effective_until")
      .eq("organization_id", input.organizationId)
      .eq("status", "active")
      .lte("effective_from", now)
      .order("version", { ascending: false })
      .limit(1),
    input.client
      .from("organization_subscriptions")
      .select("status")
      .eq("organization_id", input.organizationId)
      .maybeSingle(),
    input.client
      .from("audit_events")
      .select("id, action, entity_type, entity_id, actor_id, occurred_at")
      .eq("organization_id", input.organizationId)
      .in("entity_type", [
        "memberships",
        "organization_invitations",
        "organization_subscriptions",
        "seat_entitlements",
      ])
      .order("occurred_at", { ascending: false })
      .limit(25),
  ]);

  const firstError = [members, invitations, entitlements, subscriptions, audit].find(
    (result) => result.error,
  )?.error;
  if (firstError) {
    throw new Error("Organization administration data could not be loaded", { cause: firstError });
  }

  const memberRows = members.data ?? [];
  const invitationRows = invitations.data ?? [];
  const effectiveEntitlement = (entitlements.data ?? []).find(
    (row) => row.effective_until === null || row.effective_until > now,
  );
  return Object.freeze({
    organizationId: input.organizationId,
    memberListComplete: input.administrator,
    members: memberRows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      role: row.role,
      active: row.active,
      updatedAt: row.updated_at,
    })),
    invitations: invitationRows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      status: row.status === "pending" && row.expires_at <= now ? "expired" : row.status,
      expiresAt: row.expires_at,
    })),
    seat: Object.freeze({
      included: effectiveEntitlement?.included_seats ?? null,
      activeMembers: memberRows.filter((row) => row.active).length,
      pendingInvitations: invitationRows.filter(
        (row) => row.status === "pending" && row.expires_at > now,
      ).length,
      subscriptionStatus: subscriptions.data?.status ?? null,
    }),
    audit: (audit.data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      actorId: row.actor_id,
      occurredAt: row.occurred_at,
    })),
  });
}
