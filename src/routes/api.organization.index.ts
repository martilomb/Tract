import { createFileRoute } from "@tanstack/react-router";

import { requireAuthenticatedApplicationContext } from "@/server/application-session.server";
import { loadOrganizationAdministration } from "@/server/repositories/organization-administration.server";

export const Route = createFileRoute("/api/organization/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireAuthenticatedApplicationContext(request, process.env);
          const administration = await loadOrganizationAdministration({
            client: context.client,
            organizationId: context.session.selectedMembership.organizationId,
            administrator: context.session.selectedMembership.role === "administrator",
          });
          return Response.json(administration, { headers: context.headers });
        } catch {
          return Response.json(
            { status: "error", message: "Organization administration could not be loaded." },
            { status: 403, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
