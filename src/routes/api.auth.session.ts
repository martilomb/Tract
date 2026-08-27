import { createFileRoute } from "@tanstack/react-router";

import { resolveApplicationSession } from "@/server/application-session.server";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const resolved = await resolveApplicationSession(request, process.env);
          return Response.json(resolved.session, { headers: resolved.headers });
        } catch {
          return Response.json(
            { status: "error", message: "The authenticated workspace could not be loaded." },
            { status: 503, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
