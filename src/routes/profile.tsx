import { createFileRoute } from "@tanstack/react-router";
import { Children, cloneElement, isValidElement, useId, useState } from "react";
import { Save, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const [displayName, setDisplayName] = useState("Local reviewer");
  const [timeZone, setTimeZone] = useState("Europe/Madrid");
  const [dateFormat, setDateFormat] = useState("yyyy-mm-dd");

  return (
    <AppShell
      title="Profile"
      description="Personal display and review preferences for the active organization."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" /> Personal preferences
            </CardTitle>
            <CardDescription>
              Demonstration changes remain local; authenticated persistence is fail-closed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </Field>
            <Field label="Email">
              <Input
                value="reviewer@example.invalid"
                disabled
                title="Identity email is managed by the approved Auth provider"
                aria-describedby="profile-email-reason"
              />
              <p id="profile-email-reason" className="mt-1 text-xs text-muted-foreground">
                Identity email is managed by the approved Auth provider.
              </p>
            </Field>
            <Field label="Time zone">
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger aria-label="Time zone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Madrid">Europe/Madrid</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/Detroit">America/Detroit</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date format">
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger aria-label="Date format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  <SelectItem value="dd-mm-yyyy">DD-MM-YYYY</SelectItem>
                  <SelectItem value="mm-dd-yyyy">MM-DD-YYYY</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Button
                onClick={() =>
                  toast.success("Profile preferences validated locally", {
                    description: "Connect authenticated staging to persist this change.",
                  })
                }
              >
                <Save className="mr-1.5 h-4 w-4" /> Save preferences
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Organization</span>
              <Badge variant="outline">Demo organization</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Role</span>
              <Badge>Administrator demo</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Real roles and organization switching are enforced by memberships and RLS after Auth
              activation.
            </p>
          </CardContent>
        </Card>
      </div>
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
