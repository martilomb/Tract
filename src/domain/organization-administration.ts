import type { OrganizationRole } from "./application-session";

export type OrganizationAdministration = Readonly<{
  organizationId: string;
  memberListComplete: boolean;
  members: readonly Readonly<{
    id: string;
    userId: string;
    role: OrganizationRole;
    active: boolean;
    updatedAt: string;
  }>[];
  invitations: readonly Readonly<{
    id: string;
    email: string;
    role: OrganizationRole;
    status: "pending" | "accepted" | "expired" | "revoked";
    expiresAt: string;
  }>[];
  seat: Readonly<{
    included: number | null;
    activeMembers: number;
    pendingInvitations: number;
    subscriptionStatus: string | null;
  }>;
  audit: readonly Readonly<{
    id: number;
    action: string;
    entityType: string;
    entityId: string | null;
    actorId: string | null;
    occurredAt: string;
  }>[];
}>;

export function isOrganizationAdministration(value: unknown): value is OrganizationAdministration {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  const seat = candidate.seat as Record<string, unknown> | undefined;
  return (
    typeof candidate.organizationId === "string" &&
    typeof candidate.memberListComplete === "boolean" &&
    Array.isArray(candidate.members) &&
    candidate.members.every(isMember) &&
    Array.isArray(candidate.invitations) &&
    candidate.invitations.every(isInvitation) &&
    Array.isArray(candidate.audit) &&
    candidate.audit.every(isAuditEvent) &&
    Boolean(seat) &&
    typeof seat === "object" &&
    (seat.included === null || isNonNegativeInteger(seat.included)) &&
    isNonNegativeInteger(seat.activeMembers) &&
    isNonNegativeInteger(seat.pendingInvitations) &&
    (seat.subscriptionStatus === null || typeof seat.subscriptionStatus === "string")
  );
}

function isMember(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const member = value as Record<string, unknown>;
  return (
    typeof member.id === "string" &&
    typeof member.userId === "string" &&
    isOrganizationRole(member.role) &&
    typeof member.active === "boolean" &&
    typeof member.updatedAt === "string"
  );
}

function isInvitation(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const invitation = value as Record<string, unknown>;
  return (
    typeof invitation.id === "string" &&
    typeof invitation.email === "string" &&
    isOrganizationRole(invitation.role) &&
    ["pending", "accepted", "expired", "revoked"].includes(String(invitation.status)) &&
    typeof invitation.expiresAt === "string"
  );
}

function isAuditEvent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "number" &&
    typeof event.action === "string" &&
    typeof event.entityType === "string" &&
    (event.entityId === null || typeof event.entityId === "string") &&
    (event.actorId === null || typeof event.actorId === "string") &&
    typeof event.occurredAt === "string"
  );
}

function isOrganizationRole(value: unknown): value is OrganizationRole {
  return ["administrator", "full_view", "member"].includes(String(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
