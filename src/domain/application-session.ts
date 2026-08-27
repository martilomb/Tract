export type OrganizationRole = "administrator" | "full_view" | "member";

export type ActiveMembership = Readonly<{
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  defaultCurrency: string;
  role: OrganizationRole;
}>;

export type ApplicationUser = Readonly<{
  id: string;
  email: string;
}>;

export type ApplicationSession =
  | Readonly<{ status: "unauthenticated" }>
  | Readonly<{
      status: "organization_required";
      user: ApplicationUser;
      memberships: readonly [];
    }>
  | Readonly<{
      status: "authenticated";
      user: ApplicationUser;
      memberships: readonly ActiveMembership[];
      selectedMembership: ActiveMembership;
    }>;

export function selectActiveMembership(
  memberships: readonly ActiveMembership[],
  requestedOrganizationId: string | undefined,
): ActiveMembership | undefined {
  if (requestedOrganizationId) {
    const requested = memberships.find(
      (membership) => membership.organizationId === requestedOrganizationId,
    );
    if (requested) return requested;
  }
  return memberships[0];
}

export function isApplicationSession(value: unknown): value is ApplicationSession {
  if (!value || typeof value !== "object" || !("status" in value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.status === "unauthenticated") return true;
  if (!isApplicationUser(candidate.user) || !Array.isArray(candidate.memberships)) return false;
  if (candidate.status === "organization_required") return candidate.memberships.length === 0;
  if (candidate.status !== "authenticated" || !isActiveMembership(candidate.selectedMembership)) {
    return false;
  }
  return candidate.memberships.length > 0 && candidate.memberships.every(isActiveMembership);
}

function isApplicationUser(value: unknown): value is ApplicationUser {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).id === "string" &&
    typeof (value as Record<string, unknown>).email === "string"
  );
}

function isActiveMembership(value: unknown): value is ActiveMembership {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.organizationId === "string" &&
    typeof candidate.organizationName === "string" &&
    typeof candidate.organizationSlug === "string" &&
    typeof candidate.defaultCurrency === "string" &&
    ["administrator", "full_view", "member"].includes(String(candidate.role))
  );
}
