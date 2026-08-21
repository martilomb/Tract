import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, ClipboardCheck, Clock3, FilePlus2, History, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { transitionDcr, type DcrState, type DcrStatus } from "@/domain/dcr-workflow";

export const Route = createFileRoute("/dcrs")({ component: DcrWorkflowPage });

interface DemoDcr {
  id: string;
  number: string;
  title: string;
  program: string;
  partNumber: string;
  supplier: string;
  owner: string;
  state: DcrState;
}

const INITIAL_DCRS: DemoDcr[] = [
  {
    id: "demo-dcr-1",
    number: "DCR-2026-0148",
    title: "Inverter cooling-plate revision",
    program: "F-150 Lightning",
    partNumber: "FO-104582-B",
    supplier: "Demo Supplier A",
    owner: "Local reviewer",
    state: { id: "demo-dcr-1", organizationId: "demo-org", status: "submitted", history: [] },
  },
  {
    id: "demo-dcr-2",
    number: "DCR-2026-0149",
    title: "Wire-harness routing change",
    program: "Equinox EV",
    partNumber: "GM-208441-C",
    supplier: "Demo Supplier B",
    owner: "Local reviewer",
    state: { id: "demo-dcr-2", organizationId: "demo-org", status: "under_review", history: [] },
  },
];

const STATUS_LABELS: Record<DcrStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  active: "Active",
  closed: "Closed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const NEXT_STATUS: Partial<Record<DcrStatus, DcrStatus>> = {
  draft: "submitted",
  submitted: "under_review",
  under_review: "approved",
  approved: "active",
  active: "closed",
};

function DcrWorkflowPage() {
  const [dcrs, setDcrs] = useState<DemoDcr[]>(INITIAL_DCRS);
  const [selectedId, setSelectedId] = useState(INITIAL_DCRS[0]?.id ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [number, setNumber] = useState("DCR-2026-0150");
  const [title, setTitle] = useState("");
  const [program, setProgram] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const selected = useMemo(
    () => dcrs.find((dcr) => dcr.id === selectedId) ?? dcrs[0],
    [dcrs, selectedId],
  );

  const createDraft = () => {
    if (!number.trim() || !title.trim() || !program.trim() || !partNumber.trim()) {
      toast.error("DCR number, title, program, and part number are required.");
      return;
    }
    if (dcrs.some((dcr) => dcr.number.toLowerCase() === number.trim().toLowerCase())) {
      toast.error("DCR number already exists in this organization.");
      return;
    }
    const id = `demo-dcr-${dcrs.length + 1}`;
    const draft: DemoDcr = {
      id,
      number: number.trim(),
      title: title.trim(),
      program: program.trim(),
      partNumber: partNumber.trim(),
      supplier: "Not assigned",
      owner: "Local reviewer",
      state: { id, organizationId: "demo-org", status: "draft", history: [] },
    };
    setDcrs((current) => [...current, draft]);
    setSelectedId(id);
    setDialogOpen(false);
    toast.info("Demo DCR draft validated", {
      description: "The draft is local and was not persisted.",
    });
  };

  const advance = () => {
    if (!selected) return;
    const next = NEXT_STATUS[selected.state.status];
    if (!next) return;
    const now = new Date().toISOString();
    const state = transitionDcr({
      dcr: selected.state,
      to: next,
      actorId: "local-reviewer",
      actorRoles: ["administrator"],
      occurredAt: now,
      comment:
        next === "closed" ? "Closed through an explicit demonstration transition." : undefined,
    });
    setDcrs((current) => current.map((dcr) => (dcr.id === selected.id ? { ...dcr, state } : dcr)));
    toast.success(
      `Demo transition: ${STATUS_LABELS[selected.state.status]} → ${STATUS_LABELS[next]}`,
      {
        description: "Validated by the canonical versioned workflow; not persisted.",
      },
    );
  };

  return (
    <AppShell
      title="DCR workflow"
      description="Organization-scoped change requests with configurable transitions and immutable history."
      actions={
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> New DCR draft
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization DCRs</CardTitle>
            <CardDescription>{dcrs.length} synthetic workflow records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dcrs.map((dcr) => (
              <button
                key={dcr.id}
                type="button"
                onClick={() => setSelectedId(dcr.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === dcr.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold">{dcr.number}</span>
                  <Badge variant="outline">{STATUS_LABELS[dcr.state.status]}</Badge>
                </div>
                <div className="mt-2 text-sm font-medium">{dcr.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {dcr.program} · {dcr.partNumber}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selected && (
          <div className="space-y-5">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{selected.title}</CardTitle>
                    <Badge>{STATUS_LABELS[selected.state.status]}</Badge>
                  </div>
                  <CardDescription className="mt-1 font-mono">{selected.number}</CardDescription>
                </div>
                {NEXT_STATUS[selected.state.status] && (
                  <Button size="sm" onClick={advance}>
                    Advance to {STATUS_LABELS[NEXT_STATUS[selected.state.status]!]}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Detail icon={ClipboardCheck} label="Program" value={selected.program} />
                <Detail icon={FilePlus2} label="Part number" value={selected.partNumber} />
                <Detail icon={UserRound} label="Owner" value={selected.owner} />
                <Detail icon={Clock3} label="Supplier" value={selected.supplier} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" /> Transition history
                </CardTitle>
                <CardDescription>
                  Every status change records actor, timestamp, workflow id, and workflow version.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selected.state.history.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No local transitions in this review session.
                  </div>
                ) : (
                  <ol className="space-y-3">
                    {selected.state.history.map((entry, index) => (
                      <li
                        key={`${entry.occurredAt}-${index}`}
                        className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                      >
                        <div className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                        <div>
                          <div className="font-medium">
                            {STATUS_LABELS[entry.from]} → {STATUS_LABELS[entry.to]}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {entry.actorId} · {entry.occurredAt} · {entry.workflowId} v
                            {entry.workflowVersion}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New DCR draft</DialogTitle>
            <DialogDescription>
              Validates organization-scoped uniqueness and required fields. The demonstration draft
              is not persisted.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="DCR number">
              <Input value={number} onChange={(event) => setNumber(event.target.value)} />
            </Field>
            <Field label="Part number">
              <Input value={partNumber} onChange={(event) => setPartNumber(event.target.value)} />
            </Field>
            <Field label="Program">
              <Input value={program} onChange={(event) => setProgram(event.target.value)} />
            </Field>
            <Field label="Title">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Label htmlFor="dcr-comments">Comments</Label>
              <Textarea
                id="dcr-comments"
                className="mt-1"
                placeholder="Supporting context and evidence references"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDraft}>Validate demo draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
