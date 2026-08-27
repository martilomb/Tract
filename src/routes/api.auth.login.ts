import { createFileRoute } from "@tanstack/react-router";

import { signInApplicationSession } from "@/server/application-session.server";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const resolved = await signInApplicationSession(
            request,
            process.env,
            await request.json(),
          );
          return Response.json(resolved.session, { headers: resolved.headers });
        } catch {
          return Response.json(
            { status: "error", message: "Sign-in failed. Check your approved account details." },
            { status: 401, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
