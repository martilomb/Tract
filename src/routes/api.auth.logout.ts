import { createFileRoute } from "@tanstack/react-router";

import { signOutApplicationSession } from "@/server/application-session.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return Response.json(
            { status: "unauthenticated" },
            { headers: await signOutApplicationSession(request, process.env) },
          );
        } catch {
          return Response.json(
            { status: "error", message: "Sign-out request was denied." },
            { status: 403, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
