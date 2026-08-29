import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { recoveryAgreementCsv } from "@/domain/production-contracts";
import {
  assertSameOrigin,
  requireAuthenticatedApplicationContext,
} from "@/server/application-session.server";
import {
  createGovernedRecoveryMasterData,
  loadProductionRecoveryWorkspace,
  reviewAndActivateProductionRecovery,
  saveProductionRecoveryAgreementDraft,
} from "@/server/repositories/recovery-agreements.server";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_master_data"), payload: z.unknown() }),
  z.object({ action: z.literal("save_draft"), payload: z.unknown() }),
  z.object({
    action: z.literal("activate"),
    payload: z.object({ agreementId: z.string().uuid() }),
  }),
]);

export const Route = createFileRoute("/api/contracts/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const context = await requireAuthenticatedApplicationContext(request, process.env);
          const organizationId = context.session.selectedMembership.organizationId;
          const workspace = await loadProductionRecoveryWorkspace({
            client: context.client,
            organizationId,
          });
          const url = new URL(request.url);
          const exportAgreementId = url.searchParams.get("agreement");
          if (url.searchParams.get("format") === "csv" && exportAgreementId) {
            const agreement = workspace.agreements.find(
              (candidate) => candidate.id === exportAgreementId,
            );
            if (!agreement) throw new Error("Agreement export not found");
            const headers = new Headers(context.headers);
            headers.set("content-type", "text/csv; charset=utf-8");
            headers.set(
              "content-disposition",
              `attachment; filename="${safeFilename(agreement.agreement_number)}-recovery-evidence.csv"`,
            );
            return new Response(
              recoveryAgreementCsv({
                organizationName: context.session.selectedMembership.organizationName,
                workspace,
                agreement,
              }),
              { headers },
            );
          }
          return Response.json(workspace, { headers: context.headers });
        } catch {
          return Response.json(
            { status: "error", message: "Recovery agreements could not be loaded." },
            { status: 403, headers: { "cache-control": "no-store" } },
          );
        }
      },
      POST: async ({ request }) => {
        try {
          assertSameOrigin(request);
          const context = await requireAuthenticatedApplicationContext(request, process.env);
          if (context.session.selectedMembership.role !== "administrator") {
            throw new Error("Administrator access is required for recovery agreement changes.");
          }
          const organizationId = context.session.selectedMembership.organizationId;
          const action = actionSchema.parse(await request.json());
          if (action.action === "create_master_data") {
            await createGovernedRecoveryMasterData({
              client: context.client,
              organizationId,
              payload: action.payload,
            });
          } else if (action.action === "save_draft") {
            await saveProductionRecoveryAgreementDraft({
              client: context.client,
              organizationId,
              payload: action.payload,
            });
          } else {
            await reviewAndActivateProductionRecovery({
              client: context.client,
              agreementId: action.payload.agreementId,
            });
          }
          const workspace = await loadProductionRecoveryWorkspace({
            client: context.client,
            organizationId,
          });
          return Response.json(workspace, { headers: context.headers });
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
    return error.issues[0]?.message ?? "The recovery agreement input is invalid.";
  }
  if (error instanceof Error) {
    const safePrefixes = [
      "Administrator access",
      "The recovery agreement request was denied",
      "only a draft recovery agreement",
      "recovery agreement must be effective",
      "reviewed evidence",
      "guided activation requires",
      "linked DCRs",
      "recovery setup requires",
      "recovery activation requires",
      "a governed program exception reason",
      "an OEM with this name already exists",
      "a vehicle model with this code already exists",
      "a program with this code already exists",
      "a part number with this value already exists",
    ];
    if (safePrefixes.some((prefix) => error.message.startsWith(prefix))) return error.message;
  }
  return "The recovery agreement request was denied by the governed data policy.";
}

function safeFilename(value: string): string {
  return value.replaceAll(/[^a-z0-9._-]+/giu, "-").slice(0, 100) || "agreement";
}
