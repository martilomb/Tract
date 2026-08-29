import { useLocation } from "@tanstack/react-router";
import { Building2, LoaderCircle, LockKeyhole, LogOut } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductionOrganization } from "@/components/production-organization";
import { ProductionContracts } from "@/components/production-contracts";
import { isApplicationSession, type ApplicationSession } from "@/domain/application-session";

type SessionState =
  | { kind: "loading" }
  | { kind: "ready"; session: ApplicationSession }
  | { kind: "error"; message: string };

async function readSession(response: Response): Promise<ApplicationSession> {
  const payload: unknown = await response.json();
  if (!response.ok || !isApplicationSession(payload)) {
    throw new Error(
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message)
        : "The authenticated workspace could not be loaded.",
    );
  }
  return payload;
}

export function ProductionSpine() {
  const location = useLocation();
  const [state, setState] = useState<SessionState>({ kind: "loading" });

  const refreshSession = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/auth/session", { credentials: "same-origin" });
      setState({ kind: "ready", session: await readSession(response) });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "The workspace could not be loaded.",
      });
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  if (state.kind === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6" aria-busy>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
          Loading secure workspace…
        </div>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <ProductionCard title="Workspace unavailable" icon={<LockKeyhole aria-hidden />}>
        <p className="text-sm leading-6 text-muted-foreground">{state.message}</p>
        <Button className="mt-5" onClick={() => void refreshSession()}>
          Try again
        </Button>
      </ProductionCard>
    );
  }

  if (state.session.status === "unauthenticated") {
    return <SignIn onAuthenticated={(session) => setState({ kind: "ready", session })} />;
  }

  if (state.session.status === "organization_required") {
    return (
      <ProductionCard title="Organization access required" icon={<Building2 aria-hidden />}>
        <p className="text-sm leading-6 text-muted-foreground">
          This authenticated account has no active Tract organization membership. Ask an approved
          organization administrator to invite the account; invitation delivery remains disabled
          until the Auth email configuration is approved and verified.
        </p>
        <InvitationAcceptance token={invitationTokenFrom(location.hash)} />
        <SignOut onSignedOut={(session) => setState({ kind: "ready", session })} />
      </ProductionCard>
    );
  }

  const session = state.session;
  if (location.pathname === "/contracts") {
    return (
      <ProductionContracts
        session={session}
        initialAgreementId={new URLSearchParams(location.searchStr).get("agreement") ?? undefined}
        onSignedOut={(nextSession) => setState({ kind: "ready", session: nextSession })}
      />
    );
  }

  const pathIsAvailable = location.pathname === "/" || location.pathname === "/organization";
  return (
    <ProductionCard
      title={session.selectedMembership.organizationName}
      icon={<Building2 aria-hidden />}
    >
      <p className="text-sm text-muted-foreground">
        Signed in as {session.user.email}. Role: {session.selectedMembership.role.replace("_", " ")}
        .
      </p>

      {session.memberships.length > 1 && (
        <div className="mt-6 space-y-2">
          <Label htmlFor="organization-context">Organization context</Label>
          <select
            id="organization-context"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={session.selectedMembership.organizationId}
            onChange={async (event) => {
              try {
                const response = await fetch("/api/auth/organization", {
                  method: "POST",
                  credentials: "same-origin",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ organizationId: event.target.value }),
                });
                setState({ kind: "ready", session: await readSession(response) });
              } catch (error) {
                setState({
                  kind: "error",
                  message:
                    error instanceof Error ? error.message : "Organization access was denied.",
                });
              }
            }}
          >
            {session.memberships.map((membership) => (
              <option key={membership.organizationId} value={membership.organizationId}>
                {membership.organizationName}
              </option>
            ))}
          </select>
        </div>
      )}

      <section className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
        {pathIsAvailable ? (
          <>
            <h2 className="font-semibold">Authenticated application spine</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The organization and role above were retrieved from Supabase under this user's access
              token and survive a reload. Product workflows will appear here only as their
              production persistence, authorization, audit, and reconciliation gates pass.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-semibold">Workflow not enabled in production</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {location.pathname} is still demonstration-only and is intentionally unavailable in
              this production workspace until its Supabase persistence and verification slice is
              complete.
            </p>
          </>
        )}
      </section>

      <Button asChild className="mt-4 w-full">
        <a href="/contracts">Open recovery agreements</a>
      </Button>

      <InvitationAcceptance token={invitationTokenFrom(location.hash)} />

      <ProductionOrganization
        organizationId={session.selectedMembership.organizationId}
        currentUser={session.user}
        role={session.selectedMembership.role}
      />

      {session.selectedMembership.role === "administrator" && <InvitationCreator />}

      <SignOut onSignedOut={(nextSession) => setState({ kind: "ready", session: nextSession })} />
    </ProductionCard>
  );
}

function invitationTokenFrom(hash: string): string | undefined {
  const token = new URLSearchParams(hash.replace(/^#/u, "")).get("invitation");
  return token || undefined;
}

function InvitationAcceptance({ token }: { token: string | undefined }) {
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  if (!token) return null;
  return (
    <section className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <h2 className="font-semibold">Organization invitation</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Accept only if you recognize the inviting organization. Acceptance is atomic and uses the
        email address on this authenticated account.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        className="mt-4"
        disabled={submitting}
        onClick={async () => {
          setSubmitting(true);
          setError(undefined);
          try {
            const response = await fetch("/api/auth/accept-invitation", {
              method: "POST",
              credentials: "same-origin",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ token }),
            });
            const payload = (await response.json()) as { message?: string };
            if (!response.ok)
              throw new Error(payload.message ?? "The invitation was not accepted.");
            window.location.replace(`${window.location.pathname}${window.location.search}`);
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "The invitation was not accepted.");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {submitting ? "Accepting…" : "Accept invitation"}
      </Button>
    </section>
  );
}

function InvitationCreator() {
  const [error, setError] = useState<string>();
  const [invitationLink, setInvitationLink] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <section className="mt-6 border-t border-border pt-6">
      <h2 className="font-semibold">Invite an organization member</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        This creates a one-time governed invitation and reserves a seat. Automated email delivery
        remains unavailable until the approved Auth email configuration is activated; share the
        resulting link through an approved channel.
      </p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          setSubmitting(true);
          setError(undefined);
          setInvitationLink(undefined);
          setCopied(false);
          const form = new FormData(event.currentTarget);
          try {
            const response = await fetch("/api/organization/invitations", {
              method: "POST",
              credentials: "same-origin",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                email: form.get("invite-email"),
                role: form.get("invite-role"),
                expiresInDays: Number(form.get("invite-expiry")),
              }),
            });
            const payload = (await response.json()) as {
              invitationPath?: string;
              message?: string;
            };
            if (!response.ok || !payload.invitationPath) {
              throw new Error(payload.message ?? "The invitation could not be created.");
            }
            setInvitationLink(`${window.location.origin}${payload.invitationPath}`);
            window.dispatchEvent(new Event("tract:organization-changed"));
          } catch (caught) {
            setError(
              caught instanceof Error ? caught.message : "The invitation could not be created.",
            );
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="invite-email" type="email" autoComplete="off" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            name="invite-role"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            defaultValue="member"
          >
            <option value="member">Scoped member</option>
            <option value="full_view">Full view</option>
            <option value="administrator">Administrator</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-expiry">Expires in days</Label>
          <Input
            id="invite-expiry"
            name="invite-expiry"
            type="number"
            min={1}
            max={30}
            defaultValue={7}
            required
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting} className="sm:col-span-2">
          {submitting ? "Creating invitation…" : "Create invitation"}
        </Button>
      </form>
      {invitationLink && (
        <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
          <Label htmlFor="invitation-link">One-time invitation link</Label>
          <Input id="invitation-link" className="mt-2" value={invitationLink} readOnly />
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(invitationLink);
                setCopied(true);
              } catch {
                setError("Copy was blocked by the browser. Select and copy the link manually.");
              }
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      )}
    </section>
  );
}

function ProductionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <section className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="mt-3">{children}</div>
      </section>
    </main>
  );
}

function SignIn({ onAuthenticated }: { onAuthenticated: (session: ApplicationSession) => void }) {
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      onAuthenticated(await readSession(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProductionCard title="Sign in to Tract" icon={<LockKeyhole aria-hidden />}>
      <p className="mb-6 text-sm leading-6 text-muted-foreground">
        Use an approved organization account. Credentials are sent only to the server-side Auth
        endpoint and are never stored in browser application state.
      </p>
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </ProductionCard>
  );
}

function SignOut({ onSignedOut }: { onSignedOut: (session: ApplicationSession) => void }) {
  return (
    <Button
      variant="outline"
      className="mt-6"
      onClick={async () => {
        const response = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
        onSignedOut(await readSession(response));
      }}
    >
      <LogOut className="mr-2 h-4 w-4" aria-hidden />
      Sign out
    </Button>
  );
}
