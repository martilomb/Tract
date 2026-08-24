import { createFileRoute } from "@tanstack/react-router";
import { Children, cloneElement, isValidElement, useId, useState } from "react";
import { Building2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/organization")({ component: OrganizationPage });

const MEMBERS = [
  { name: "Local reviewer", role: "Administrator", scope: "Organization", state: "Demo" },
  {
    name: "Program reviewer",
    role: "Member",
    scope: "Program and part grants",
    state: "Synthetic",
  },
  { name: "Finance viewer", role: "Full view", scope: "Read only", state: "Synthetic" },
] as const;

function OrganizationPage() {
  const [name, setName] = useState("Demonstration organization");
  const [currency, setCurrency] = useState("USD");

  return (
    <AppShell
      title="Organization"
      description="Tenant settings, membership roles, and governed access boundaries."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Organization profile
            </CardTitle>
            <CardDescription>
              Changes require administrator permission and are audited when persistence is
              connected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Organization name">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Default settlement currency">
              <Input
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                maxLength={3}
              />
            </Field>
            <Button
              onClick={() =>
                toast.success("Organization settings validated locally", {
                  description: "No staging record was changed.",
                })
              }
            >
              <Save className="mr-1.5 h-4 w-4" /> Save organization
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Tenant boundary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Every tenant-owned database record carries an immutable organization identifier.
              Membership and additive grants are checked by RLS.
            </p>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
              Cross-tenant and non-admin connector configuration denial pass in linked staging
              pgTAP.
            </div>
            <Button
              variant="outline"
              disabled
              title="Hosted invitation and Auth configuration must pass before membership changes are enabled"
            >
              Invite member unavailable
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Members and scopes</CardTitle>
          <CardDescription>
            Synthetic examples show the intended permission model; no user invitation has been sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MEMBERS.map((member) => (
                <TableRow key={member.name}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{member.scope}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.state}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  const labelledChildren = Children.toArray(children).map((child, index) =>
    index === 0 && isValidElement<{ id?: string }>(child) ? cloneElement(child, { id }) : child,
  );
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{labelledChildren}</div>
    </div>
  );
}
