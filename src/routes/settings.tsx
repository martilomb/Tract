import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Cable,
  CircleAlert,
  FileClock,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { CreatePartRevisionDialog } from "@/components/create-part-revision-dialog";
import { CreateProgramDialog } from "@/components/create-program-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canManagePermissions, type Membership } from "@/domain/authorization";
import { useDemoSettings } from "@/domain/demo-settings";
import {
  savePartRevisionProposal,
  saveProgramProposal,
  useDemoMasterDataProposals,
} from "@/lib/demo-master-data";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const DEMO_MEMBERSHIPS: readonly Membership[] = [
  {
    organizationId: "demo-org",
    userId: "local-reviewer",
    role: "administrator",
    active: true,
  },
];

function SettingsPage() {
  const settings = useDemoSettings();
  const masterDataProposals = useDemoMasterDataProposals();
  const canManageOrganization = canManagePermissions(
    "local-reviewer",
    "demo-org",
    DEMO_MEMBERSHIPS,
  );

  return (
    <AppShell
      title="Settings"
      description="Personal preferences, organization administration, governed rules, and activation boundaries."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4" /> Personal
            </CardTitle>
            <CardDescription>
              Browser-local display and review preferences for the current demonstration user.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="grid gap-2 rounded-lg border p-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Display name</dt>
                <dd className="mt-0.5 font-medium">{settings.profile.displayName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Time zone</dt>
                <dd className="mt-0.5 font-medium">{settings.profile.timeZone}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date format</dt>
                <dd className="mt-0.5 font-medium">{settings.profile.dateFormat}</dd>
              </div>
            </dl>
            <Button asChild variant="outline">
              <Link to="/profile">Manage personal preferences</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Organization
            </CardTitle>
            <CardDescription>
              Tenant profile, membership scopes, and controlled master-data maintenance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <div className="font-medium">{settings.organization.name}</div>
                <div className="text-xs text-muted-foreground">
                  Default settlement currency: {settings.organization.currency}
                </div>
              </div>
              <Badge>{canManageOrganization ? "Administrator demo" : "Read only"}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/organization">Manage organization</Link>
              </Button>
              <Button
                variant="outline"
                disabled
                title="Requires approved site and redirect URLs, invitation behavior, hosted Auth configuration, and invited test identities"
              >
                <UsersRound className="mr-1.5 h-4 w-4" /> Invite member unavailable
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="h-4 w-4" /> Rules &amp; policies
            </CardTitle>
            <CardDescription>
              Recovery, DCR, import, document, notification, and retention rules are versioned,
              effective-dated, approval-controlled, and audited.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border p-3 text-xs text-muted-foreground">
              Current policy administration is available only to organization administrators in the
              governed Operations workspace. No custom DCR properties, pipeline builders, or
              automation controls are available in this release.
            </div>
            <Button asChild variant="outline" disabled={!canManageOrganization}>
              <Link to="/operations">
                <FileClock className="mr-1.5 h-4 w-4" /> Open Rules &amp; policies
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Security, SSO &amp; data controls
            </CardTitle>
            <CardDescription>
              Security-sensitive actions remain disabled until their approved service inputs are
              available; this workspace never simulates a credential, invitation, or provider
              success.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <DisabledControl
                label="Password reset unavailable"
                title="Requires approved site and redirect URLs, password-reset behavior, hosted Auth configuration, and an invited test identity"
              />
              <DisabledControl
                label="MFA policy unavailable"
                title="Requires an approved MFA and session-expiry policy plus hosted Auth configuration"
              />
              <DisabledControl
                label="Enterprise SSO unavailable"
                title="Requires an approved SSO provider, customer domain metadata, server-side credentials, and customer activation approval"
              />
              <DisabledControl
                label="Retention policy unavailable"
                title="Requires customer-approved retention duration, data residency, legal-hold, and deletion-schedule decisions"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" disabled={!canManageOrganization}>
                <Link to="/connections">
                  <Cable className="mr-1.5 h-4 w-4" /> Manage data connections
                </Link>
              </Button>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LockKeyhole className="h-3.5 w-3.5" /> Credentials remain server-side as opaque
                references.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section id="master-data" className="mt-5" aria-labelledby="master-data-title">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle id="master-data-title" className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> Organization master-data maintenance
                </CardTitle>
                <CardDescription className="mt-1">
                  Separate controlled Program and Part/Revision drafts for authorized
                  administrators. Ordinary users begin with Set up / activate recovery.
                </CardDescription>
              </div>
              <Badge variant={canManageOrganization ? "secondary" : "outline"}>
                {canManageOrganization ? "Administrator available" : "Administrator required"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm lg:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="font-medium">Duplicate and alias review</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Review duplicate suggestions and preserve confidential proposal and alias
                  provenance before approval.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-medium">Effective dating</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Program scope and part revisions retain governed model years and effective dates;
                  historical revisions are never overwritten.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-medium">Browser-local pending review</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Proposals persist in this browser for review but do not create database programs,
                  parts, DCRs, agreements, or financial postings.
                </p>
              </div>
            </div>
            {canManageOrganization ? (
              <div className="flex flex-wrap gap-2">
                <CreateProgramDialog
                  onValidated={saveProgramProposal}
                  trigger={
                    <Button type="button">
                      <Building2 className="mr-1.5 h-4 w-4" /> Validate Program draft
                    </Button>
                  }
                />
                <CreatePartRevisionDialog
                  onValidated={savePartRevisionProposal}
                  trigger={
                    <Button type="button" variant="outline">
                      <KeyRound className="mr-1.5 h-4 w-4" /> Validate Part/Revision draft
                    </Button>
                  }
                />
                <Button asChild type="button" variant="outline">
                  <Link to="/contracts">Set up / activate recovery</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  disabled
                  title="Only organization administrators can maintain controlled Program or Part/Revision master data"
                >
                  Master-data maintenance unavailable
                </Button>
                <Button asChild variant="outline">
                  <Link to="/contracts">Set up / activate recovery</Link>
                </Button>
              </div>
            )}
            {masterDataProposals.length > 0 && (
              <div className="rounded-lg border" aria-label="Browser-local master-data proposals">
                <div className="border-b bg-secondary/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pending synthetic review · {masterDataProposals.length}
                </div>
                <div className="divide-y">
                  {masterDataProposals
                    .slice()
                    .reverse()
                    .slice(0, 10)
                    .map((proposal) => (
                      <div
                        key={proposal.id}
                        className="grid gap-1 px-3 py-2 text-xs sm:grid-cols-3"
                      >
                        <div className="font-medium">
                          {proposal.kind === "program"
                            ? `${proposal.oem} · ${proposal.code}`
                            : `${proposal.partNumber} · revision ${proposal.revision}`}
                        </div>
                        <div className="text-muted-foreground">
                          Effective {proposal.effectiveFrom} ·{" "}
                          {proposal.status.replaceAll("_", " ")}
                        </div>
                        <div className="text-muted-foreground">Reason: {proposal.reviewReason}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        Demonstration mode uses synthetic data and browser-local preferences only. Live tenant,
        identity, SSO, retention, and provider changes stay fail-closed until the named activation
        inputs are approved.
      </div>
    </AppShell>
  );
}

function DisabledControl({ label, title }: { label: string; title: string }) {
  return (
    <Button
      variant="outline"
      disabled
      title={title}
      className="h-auto min-h-11 justify-start text-left"
    >
      {label}
    </Button>
  );
}
