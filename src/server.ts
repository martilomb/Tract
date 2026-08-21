import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders, resolveRequestId } from "./server/security-headers.server";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function supabaseUrlFrom(environment: unknown): string | undefined {
  if (!environment || typeof environment !== "object") return undefined;
  const value = (environment as Readonly<Record<string, unknown>>).VITE_SUPABASE_URL;
  return typeof value === "string" ? value : undefined;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const startedAt = performance.now();
    const requestId = resolveRequestId(request.headers.get("x-request-id"), () =>
      crypto.randomUUID(),
    );
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      console.log({
        event: "request_completed",
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        status: normalized.status,
        durationMs: Math.round(performance.now() - startedAt),
      });
      return applySecurityHeaders({
        response: normalized,
        request,
        requestId,
        supabaseUrl: supabaseUrlFrom(env),
      });
    } catch (error) {
      console.error({
        event: "request_failed",
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return applySecurityHeaders({
        response: new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request,
        requestId,
        supabaseUrl: supabaseUrlFrom(env),
      });
    }
  },
};
