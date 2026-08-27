import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../database.types";
import type { OrganizationRole } from "../domain/application-session";

const invitationInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.enum(["administrator", "full_view", "member"]),
  expiresInDays: z.number().int().min(1).max(30),
});

export type InvitationInput = z.infer<typeof invitationInputSchema>;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export async function generateInvitationSecret(): Promise<{
  token: string;
  tokenDigest: string;
}> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = base64Url(bytes);
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  );
  const tokenDigest = `\\x${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  return { token, tokenDigest };
}

function invitationFailure(message: string): Error {
  if (message.includes("seat entitlement")) {
    return new Error("No invitation seat is available under the active organization entitlement.");
  }
  if (message.includes("duplicate key")) {
    return new Error("A pending invitation already exists for this email address.");
  }
  return new Error("The invitation could not be created under the current organization policy.");
}

export async function createOrganizationInvitation(input: {
  client: SupabaseClient<Database>;
  organizationId: string;
  invitedBy: string;
  payload: unknown;
  now?: Date;
}): Promise<Readonly<{ invitationPath: string; email: string; role: OrganizationRole }>> {
  const payload = invitationInputSchema.parse(input.payload);
  const now = input.now ?? new Date();
  const closeExpired = await input.client
    .from("organization_invitations")
    .update({ status: "expired" })
    .eq("organization_id", input.organizationId)
    .eq("email", payload.email)
    .eq("status", "pending")
    .lte("expires_at", now.toISOString());
  if (closeExpired.error) throw invitationFailure(closeExpired.error.message);

  const secret = await generateInvitationSecret();
  const expiresAt = new Date(
    now.getTime() + payload.expiresInDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const result = await input.client.from("organization_invitations").insert({
    organization_id: input.organizationId,
    email: payload.email,
    role: payload.role,
    token_digest: secret.tokenDigest,
    invited_by: input.invitedBy,
    expires_at: expiresAt,
  });
  if (result.error) throw invitationFailure(result.error.message);
  return Object.freeze({
    invitationPath: `/#invitation=${encodeURIComponent(secret.token)}`,
    email: payload.email,
    role: payload.role,
  });
}

export async function acceptOrganizationInvitation(input: {
  client: SupabaseClient<Database>;
  token: unknown;
}): Promise<void> {
  const token = z.string().min(20).max(1024).parse(input.token);
  const result = await input.client.rpc("accept_organization_invitation", {
    invitation_token: token,
  });
  if (result.error) {
    throw new Error(
      "The invitation is invalid, expired, already used, or belongs to another user.",
    );
  }
}
