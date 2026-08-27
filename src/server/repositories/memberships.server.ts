import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../database.types";
import type { ActiveMembership } from "../../domain/application-session";

type DataClient = SupabaseClient<Database>;

export async function loadActiveMemberships(
  client: DataClient,
  authenticatedUserId: string,
): Promise<readonly ActiveMembership[]> {
  const membershipResult = await client
    .from("memberships")
    .select("id, organization_id, role")
    .eq("user_id", authenticatedUserId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (membershipResult.error) {
    throw new Error("Active memberships could not be loaded", { cause: membershipResult.error });
  }

  const memberships = membershipResult.data;
  if (memberships.length === 0) return [];

  const organizationIds = [...new Set(memberships.map(({ organization_id }) => organization_id))];
  const organizationResult = await client
    .from("organizations")
    .select("id, name, slug, default_currency")
    .in("id", organizationIds);

  if (organizationResult.error) {
    throw new Error("Organizations could not be loaded", { cause: organizationResult.error });
  }

  const organizationsById = new Map(
    organizationResult.data.map((organization) => [organization.id, organization]),
  );

  return memberships.map((membership) => {
    const organization = organizationsById.get(membership.organization_id);
    if (!organization) {
      throw new Error("An active membership references an unavailable organization");
    }
    return Object.freeze({
      id: membership.id,
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      defaultCurrency: organization.default_currency,
      role: membership.role,
    });
  });
}
