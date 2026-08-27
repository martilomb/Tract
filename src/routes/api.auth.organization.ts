import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { selectApplicationOrganization } from "@/server/application-session.server";

const payloadSchema = z.object({ organizationId: z.string().uuid() });

export const Route = createFileRoute("/api/auth/organization")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const payload = payloadSchema.parse(await request.json());
          const resolved = await selectApplicationOrganization(
            request,
            process.env,
            payload.organizationId,
          );
          return Response.json(resolved.session, { headers: resolved.headers });
        } catch {
          return Response.json(
            { status: "error", message: "Organization access was denied." },
            { status: 403, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
