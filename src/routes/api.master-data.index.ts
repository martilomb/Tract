import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { masterDataCsv, masterDataQuerySchema } from "@/domain/production-master-data";
import {
  assertSameOrigin,
  requireAuthenticatedApplicationContext,
} from "@/server/application-session.server";
import {
  createGovernedAlias,
  createGovernedPart,
  createGovernedProgram,
  loadProductionMasterDataWorkspace,
} from "@/server/repositories/master-data.server";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_program"), payload: z.unknown() }),
  z.object({ action: z.literal("create_part"), payload: z.unknown() }),
  z.object({ action: z.literal("create_alias"), payload: z.unknown() }),
]);

export const Route = createFileRoute("/api/master-data/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireAuthenticatedApplicationContext(request, process.env);
          const url = new URL(request.url);
          const view = url.searchParams.get("view") === "parts" ? "parts" : "programs";
          const query = masterDataQuerySchema.parse({
            view,
            q: url.searchParams.get("q") || undefined,
            program: url.searchParams.get("program") || undefined,
            part: url.searchParams.get("part") || undefined,
            asOf: url.searchParams.get("asOf") || new Date().toISOString().slice(0, 10),
            sort: url.searchParams.get("sort") || (view === "programs" ? "name" : "part_number"),
            direction: url.searchParams.get("direction") || "asc",
            limit:
              url.searchParams.get("format") === "csv"
                ? 20000
                : url.searchParams.get("limit") || 50,
            offset:
              url.searchParams.get("format") === "csv" ? 0 : url.searchParams.get("offset") || 0,
          });
          const workspace = await loadProductionMasterDataWorkspace({
            client: context.client,
            organizationId: context.session.selectedMembership.organizationId,
            query,
          });
          if (
            (query.program && !workspace.selected_program) ||
            (query.part && !workspace.selected_part)
          ) {
            return Response.json(
              { status: "error", message: "The requested master-data record is unavailable." },
              { status: 404, headers: context.headers },
            );
          }
          if (url.searchParams.get("format") === "csv") {
            const headers = new Headers(context.headers);
            headers.set("content-type", "text/csv; charset=utf-8");
            headers.set(
              "content-disposition",
              `attachment; filename="tract-${view}-${query.asOf}.csv"`,
            );
            return new Response(
              masterDataCsv({
                organizationName: context.session.selectedMembership.organizationName,
                workspace,
              }),
              { headers },
            );
          }
          return Response.json(workspace, { headers: context.headers });
        } catch (error) {
          const invalid = error instanceof z.ZodError;
          return Response.json(
            {
              status: "error",
              message: invalid
                ? (error.issues[0]?.message ?? "The master-data query is invalid.")
                : "Program and part master data could not be loaded.",
            },
            { status: invalid ? 400 : 403, headers: { "cache-control": "no-store" } },
          );
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const context = await requireAuthenticatedApplicationContext(request, process.env);
          if (context.session.selectedMembership.role !== "administrator") {
            throw new Error("Administrator access is required for master-data changes.");
          }
          const action = actionSchema.parse(await request.json());
          const input = {
            client: context.client,
            organizationId: context.session.selectedMembership.organizationId,
            payload: action.payload,
          };
          if (action.action === "create_program") await createGovernedProgram(input);
          else if (action.action === "create_part") await createGovernedPart(input);
          else await createGovernedAlias(input);
          return Response.json({ status: "ok" }, { headers: context.headers });
        } catch (error) {
          const message = publicActionMessage(error);
          return Response.json(
            { status: "error", message },
            {
              status: message.startsWith("Administrator access") ? 403 : 400,
              headers: { "cache-control": "no-store" },
            },
          );
        }
      },
    },
  },
});

function publicActionMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "The master-data input is invalid.";
  }
  if (error instanceof Error) {
    const safePrefixes = [
      "Administrator access",
      "a matching program",
      "a matching part",
      "a new revision",
      "select a same-tenant",
      "a source DCR",
      "this alias already",
      "The master-data request was denied",
    ];
    if (safePrefixes.some((prefix) => error.message.startsWith(prefix))) return error.message;
  }
  return "The master-data request was denied by the governed data policy.";
}
