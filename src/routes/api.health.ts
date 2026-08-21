import { createFileRoute } from "@tanstack/react-router";

import { inspectServerEnvironment } from "@/server/env.server";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const environment = inspectServerEnvironment(process.env);
        return Response.json(
          {
            status: environment.configured ? "ready" : "degraded",
            service: "tract-web",
            version: "0.1.0",
            checks: {
              configuration: environment.configured,
              privilegedOperations: environment.serviceRoleConfigured,
            },
          },
          {
            status: environment.configured ? 200 : 503,
            headers: { "cache-control": "no-store" },
          },
        );
      },
    },
  },
});
