import { createFileRoute } from "@tanstack/react-router";

import {
  assertSameOrigin,
  requireAuthenticatedApplicationContext,
} from "@/server/application-session.server";
import { changeOrganizationMembership } from "@/server/memberships.server";

function publicMembershipError(error: unknown): string {
  if (!(error instanceof Error)) return "The membership change was denied.";
  if (
    error.message ===
      "Assign another active administrator before changing the final administrator." ||
    error.message === "No active seat is available for this membership." ||
    error.message === "The membership change was denied by the organization policy."
  ) {
    return error.message;
  }
  return "The membership change was denied.";
}

export const Route = createFileRoute("/api/organization/memberships")({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const context = await requireAuthenticatedApplicationContext(request, process.env);
          if (context.session.selectedMembership.role !== "administrator") {
            throw new Error("Administrator access required");
          }
          await changeOrganizationMembership({
            client: context.client,
            organizationId: context.session.selectedMembership.organizationId,
            payload: await request.json(),
          });
          return Response.json({ status: "updated" }, { headers: context.headers });
        } catch (error) {
          return Response.json(
            {
              status: "error",
              message: publicMembershipError(error),
            },
            { status: 403, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
