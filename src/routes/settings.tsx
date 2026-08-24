import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleAlert,
  Cable,
  Database,
  FileClock,
  LockKeyhole,
  Workflow,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const controls = [
  {
    title: "Tenant boundary",
    detail: "Organization membership plus database-enforced scoped grants",
    icon: LockKeyhole,
    state: "implemented",
  },
  {
    title: "Recovery policy",
    detail: "Versioned effective dates, exact decimals, boundary-only rounding",
    icon: FileClock,
    state: "implemented",
  },
  {
    title: "DCR workflow",
    detail: "Versioned states, role-based transitions, immutable history",
    icon: Workflow,
    state: "implemented",
  },
  {
    title: "Staging database",
    detail: "Non-production project linked; migrations, RLS, lint, and generated types verified",
    icon: Database,
    state: "staging verified",
  },
  {
    title: "Data connections",
    detail:
      "Provider-neutral file/API wizard and declarative mapping boundary; live providers disabled",
    icon: Cable,
    state: "configuration available",
  },
] as const;

function SettingsPage() {
  return (
    <AppShell
      title="Workspace settings"
      description="Security, configuration, integrations, and operational readiness."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {controls.map((control) => {
          const Icon = control.icon;
          const ready = control.state === "implemented" || control.state === "staging verified";
          return (
            <Card key={control.title}>
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{control.title}</CardTitle>
                    <Badge variant={ready ? "secondary" : "outline"}>{control.state}</Badge>
                  </div>
                  <CardDescription className="mt-1">{control.detail}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Deployment readiness</CardTitle>
          <CardDescription>
            Production activation remains intentionally blocked until the required external
            configuration exists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>
              Cloudflare module build target, health endpoint, CI gates, migrations, and operational
              runbooks are versioned.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              Staging migrations and database tests pass. Hosted Auth identities, private document
              providers, and customer data remain intentionally absent, so demo mode stays on.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>
              Volume providers, notification delivery, document extraction, SSO, and production
              retention are not connected.
            </span>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
