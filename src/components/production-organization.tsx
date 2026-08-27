import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ApplicationUser, OrganizationRole } from "@/domain/application-session";
import {
  isOrganizationAdministration,
  type OrganizationAdministration,
} from "@/domain/organization-administration";

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: OrganizationAdministration }
  | { kind: "error"; message: string };

async function responseMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json()) as { message?: string };
  return payload.message ?? fallback;
}

export function ProductionOrganization({
  organizationId,
  currentUser,
  role,
}: {
  organizationId: string;
  currentUser: ApplicationUser;
  role: OrganizationRole;
}) {
  const administrator = role === "administrator";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [actionError, setActionError] = useState<string>();

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/organization/", { credentials: "same-origin" });
      const payload: unknown = await response.json();
      if (!response.ok || !isOrganizationAdministration(payload)) {
        throw new Error("Organization administration could not be loaded.");
      }
      setState({ kind: "ready", data: payload });
    } catch (error) {
      setState({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Organization administration could not be loaded.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, organizationId]);

  useEffect(() => {
    const reload = () => void load();
    window.addEventListener("tract:organization-changed", reload);
    return () => window.removeEventListener("tract:organization-changed", reload);
  }, [load]);

  if (state.kind === "loading") {
    return <p className="mt-6 text-sm text-muted-foreground">Loading organization controls…</p>;
  }
  if (state.kind === "error") {
    return (
      <section className="mt-6 rounded-lg border border-destructive/30 p-4">
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
        <Button variant="outline" className="mt-3" onClick={() => void load()}>
          Retry
        </Button>
      </section>
    );
  }

  const { data } = state;
  const seatUsed = data.seat.activeMembers + data.seat.pendingInvitations;
  return (
    <section className="mt-6 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Organization access</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.seat.included === null
              ? role === "member"
                ? "Seat entitlement details are unavailable to this scoped role; ask an organization administrator to review capacity."
                : "No effective seat entitlement is configured; new invitations and activations fail closed."
              : administrator
                ? `${seatUsed} of ${data.seat.included} seats used or reserved · ${data.seat.subscriptionStatus ?? "subscription state unavailable"}`
                : `${data.seat.included} included seats · usage register is administrator-only · ${data.seat.subscriptionStatus ?? "subscription state unavailable"}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((membership) => (
              <tr key={membership.id} className="border-t border-border">
                <td className="px-3 py-3">
                  {membership.userId === currentUser.id
                    ? `You · ${currentUser.email}`
                    : `Member …${membership.userId.slice(-8)}`}
                </td>
                <td className="px-3 py-3">
                  {administrator ? (
                    <select
                      aria-label={`Role for ${membership.userId === currentUser.id ? "your membership" : `member ${membership.userId.slice(-8)}`}`}
                      className="h-9 rounded-md border border-input bg-background px-2"
                      value={membership.role}
                      onChange={(event) =>
                        void changeMembership(
                          {
                            action: "set_role",
                            membershipId: membership.id,
                            role: event.target.value as OrganizationRole,
                          },
                          setActionError,
                        )
                      }
                    >
                      <option value="member">Scoped member</option>
                      <option value="full_view">Full view</option>
                      <option value="administrator">Administrator</option>
                    </select>
                  ) : (
                    membership.role.replace("_", " ")
                  )}
                </td>
                <td className="px-3 py-3">{membership.active ? "Active" : "Inactive"}</td>
                <td className="px-3 py-3">
                  {administrator ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void changeMembership(
                          {
                            action: membership.active ? "deactivate" : "reactivate",
                            membershipId: membership.id,
                          },
                          setActionError,
                        )
                      }
                    >
                      {membership.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  ) : (
                    "Read only"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.memberListComplete && (
        <p className="mt-2 text-xs text-muted-foreground">
          Your role can view its own membership only. Administrators receive the complete tenant
          membership register.
        </p>
      )}

      {administrator && data.invitations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">Invitations</h3>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {data.invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="text-sm">
                  <p>{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {invitation.role.replace("_", " ")} · {invitation.status} · expires{" "}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                {invitation.status === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void revokeInvitation(invitation.id, setActionError, load)}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.audit.length > 0 && (
        <details className="mt-6 rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">Recent access audit</summary>
          <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
            {data.audit.map((event) => (
              <li key={event.id}>
                {event.action} {event.entityType} · {new Date(event.occurredAt).toLocaleString()} ·
                actor {event.actorId ? `…${event.actorId.slice(-8)}` : "system"}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

async function changeMembership(
  payload: Record<string, unknown>,
  setError: (message: string | undefined) => void,
) {
  setError(undefined);
  try {
    const response = await fetch("/api/organization/memberships", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setError(await responseMessage(response, "The membership change was denied."));
      return;
    }
    window.location.reload();
  } catch {
    setError("The membership change could not reach the secure server action.");
  }
}

async function revokeInvitation(
  invitationId: string,
  setError: (message: string | undefined) => void,
  reload: () => Promise<void>,
) {
  setError(undefined);
  try {
    const response = await fetch("/api/organization/invitations", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invitationId, action: "revoke" }),
    });
    if (!response.ok) {
      setError(await responseMessage(response, "The invitation could not be revoked."));
      return;
    }
    await reload();
  } catch {
    setError("The revocation could not reach the secure server action.");
  }
}
