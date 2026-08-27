import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  assertSameOrigin,
  requireAuthenticatedApplicationContext,
} from "@/server/application-session.server";
import { createOrganizationInvitation } from "@/server/invitations.server";

const invitationChangeSchema = z.object({
  invitationId: z.string().uuid(),
  action: z.literal("revoke"),
});

function publicInvitationError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  if (
    error.message === "Administrator access required" ||
    error.message ===
      "No invitation seat is available under the active organization entitlement." ||
    error.message === "A pending invitation already exists for this email address." ||
    error.message ===
      "The invitation could not be created under the current organization policy." ||
    error.message === "Only a pending invitation in this organization can be revoked."
  ) {
    return error.message;
  }
  return fallback;
}

export const Route = createFileRoute("/api/organization/invitations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const context = await requireAuthenticatedApplicationContext(request, process.env);
          if (context.session.selectedMembership.role !== "administrator") {
            throw new Error("Administrator access required");
          }
          const invitation = await createOrganizationInvitation({
            client: context.client,
            organizationId: context.session.selectedMembership.organizationId,
            invitedBy: context.session.user.id,
            payload: await request.json(),
          });
          return Response.json(invitation, { status: 201, headers: context.headers });
        } catch (error) {
          return Response.json(
            {
              status: "error",
              message: publicInvitationError(
                error,
                "The organization invitation could not be created.",
              ),
            },
            { status: 403, headers: { "cache-control": "no-store" } },
          );
        }
      },
      PATCH: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const context = await requireAuthenticatedApplicationContext(request, process.env);
          if (context.session.selectedMembership.role !== "administrator") {
            throw new Error("Administrator access required");
          }
          const change = invitationChangeSchema.parse(await request.json());
          const result = await context.client
            .from("organization_invitations")
            .update({
              status: "revoked",
              revoked_by: context.session.user.id,
              revoked_at: new Date().toISOString(),
            })
            .eq("organization_id", context.session.selectedMembership.organizationId)
            .eq("id", change.invitationId)
            .eq("status", "pending")
            .select("id")
            .maybeSingle();
          if (result.error || !result.data) {
            throw new Error("Only a pending invitation in this organization can be revoked.");
          }
          return Response.json({ status: "revoked" }, { headers: context.headers });
        } catch (error) {
          return Response.json(
            {
              status: "error",
              message: publicInvitationError(error, "The invitation could not be revoked."),
            },
            { status: 403, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
