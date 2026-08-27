import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../database.types";

const membershipChangeSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_role"),
    membershipId: z.string().uuid(),
    role: z.enum(["administrator", "full_view", "member"]),
  }),
  z.object({
    action: z.enum(["deactivate", "reactivate"]),
    membershipId: z.string().uuid(),
  }),
]);

export async function changeOrganizationMembership(input: {
  client: SupabaseClient<Database>;
  organizationId: string;
  payload: unknown;
}): Promise<void> {
  const change = membershipChangeSchema.parse(input.payload);
  const update =
    change.action === "set_role"
      ? { role: change.role }
      : { active: change.action === "reactivate" };
  const result = await input.client
    .from("memberships")
    .update(update)
    .eq("organization_id", input.organizationId)
    .eq("id", change.membershipId)
    .select("id")
    .maybeSingle();
  if (result.error || !result.data) {
    const message = result.error?.message ?? "membership was unavailable";
    if (message.includes("retain an active administrator")) {
      throw new Error(
        "Assign another active administrator before changing the final administrator.",
      );
    }
    if (message.includes("seat entitlement")) {
      throw new Error("No active seat is available for this membership.");
    }
    throw new Error("The membership change was denied by the organization policy.");
  }
}
