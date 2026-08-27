import { createFileRoute } from "@tanstack/react-router";

import {
  assertSameOrigin,
  requireApplicationUserContext,
} from "@/server/application-session.server";
import { acceptOrganizationInvitation } from "@/server/invitations.server";

export const Route = createFileRoute("/api/auth/accept-invitation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const context = await requireApplicationUserContext(request, process.env);
          const payload = (await request.json()) as { token?: unknown };
          await acceptOrganizationInvitation({ client: context.client, token: payload.token });
          return Response.json({ status: "accepted" }, { headers: context.headers });
        } catch (error) {
          return Response.json(
            {
              status: "error",
              message:
                error instanceof Error ? error.message : "The invitation could not be accepted.",
            },
            { status: 403, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
