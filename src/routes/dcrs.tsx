import { createFileRoute, Link } from "@tanstack/react-router";
import { Children, cloneElement, isValidElement, useId, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  Filter,
  History,
  Link2,
  MessageSquarePlus,
  Paperclip,
  Search,
  UserRound,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  transitionDcr,
  type DcrState,
  type DcrStatus,
  type DcrTransitionEvidence,
} from "@/domain/dcr-workflow";

export const Route = createFileRoute("/dcrs")({ component: DcrWorkflowPage });

interface DcrComment {
  id: string;
  author: string;
  createdAt: string;
  body: string;
}

interface DemoDcr {
  id: string;
  number: string;
  title: string;
  program: string;
  modelYears: readonly string[];
  partNumber: string;
  supplier: string;
  owner: string;
  agreement?: { number: string; status: "draft" | "approved" | "active" };
  evidence: DcrTransitionEvidence;
  comments: readonly DcrComment[];
  state: DcrState;
}

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

const PIPELINE: readonly DcrStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "active",
  "closed",
];

const NEXT_STATUS: Partial<Record<DcrStatus, DcrStatus>> = {
  draft: "submitted",
  submitted: "under_review",
  under_review: "approved",
  approved: "active",
  active: "closed",
};

const EMPTY_EVIDENCE: DcrTransitionEvidence = {
  documentTypes: [],
  assignmentRoles: ["owner"],
  approvedStages: [],
};

const INITIAL_DCRS: DemoDcr[] = [
  {
    id: "demo-dcr-1",
    number: "DCR-2026-0148",
    title: "Inverter cooling-plate revision",
    program: "F-150 Lightning",
    modelYears: ["2026", "2027"],
    partNumber: "FO-104582-B",
    supplier: "Demo Supplier A",
    owner: "Local reviewer",
    agreement: { number: "RA-2026-0041", status: "approved" },
    evidence: {
      documentTypes: ["technical_evidence"],
      assignmentRoles: ["owner", "reviewer", "approver"],
      approvedStages: ["technical"],
    },
    comments: [
      {
        id: "comment-1",
        author: "Local reviewer",
        createdAt: "2026-08-24 08:45 UTC",
        body: "Supplier drawing and affected model years confirmed against the evidence record.",
      },
    ],
    state: {
      id: "demo-dcr-1",
      organizationId: "demo-org",
      status: "under_review",
      history: [],
    },
  },
  {
    id: "demo-dcr-2",
    number: "DCR-2026-0149",
    title: "Wire-harness routing change",
    program: "Equinox EV",
    modelYears: ["2027"],
    partNumber: "GM-208441-C",
    supplier: "Demo Supplier B",
    owner: "Local reviewer",
    evidence: EMPTY_EVIDENCE,
    comments: [],
    state: {
      id: "demo-dcr-2",
      organizationId: "demo-org",
      status: "submitted",
      history: [],
    },
  },
  {
    id: "demo-dcr-3",
    number: "DCR-2026-0150",
    title: "Bracket material revision",
    program: "IONIQ 5",
    modelYears: ["2026"],
    partNumber: "HY-440218-D",
    supplier: "Not assigned",
    owner: "Local preparer",
    evidence: EMPTY_EVIDENCE,
    comments: [],
    state: { id: "demo-dcr-3", organizationId: "demo-org", status: "draft", history: [] },
  },
];

function DcrWorkflowPage() {
  const [dcrs, setDcrs] = useState<DemoDcr[]>(INITIAL_DCRS);
  const [selectedId, setSelectedId] = useState(INITIAL_DCRS[0]!.id);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DcrStatus | "all">("all");
  const [historyFilter, setHistoryFilter] = useState<DcrStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [number, setNumber] = useState("DCR-2026-0151");
  const [title, setTitle] = useState("");
  const [program, setProgram] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [comment, setComment] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dcrs.filter(
      (dcr) =>
        (statusFilter === "all" || dcr.state.status === statusFilter) &&
        (!query ||
          [dcr.number, dcr.title, dcr.program, dcr.partNumber, dcr.supplier].some((value) =>
            value.toLowerCase().includes(query),
          )),
    );
  }, [dcrs, search, statusFilter]);
  const selected = dcrs.find((dcr) => dcr.id === selectedId) ?? dcrs[0];
  const filteredHistory =
    selected?.state.history.filter(
      (entry) => historyFilter === "all" || entry.to === historyFilter,
    ) ?? [];

  const updateSelected = (updater: (dcr: DemoDcr) => DemoDcr) => {
    if (!selected) return;
    setDcrs((current) => current.map((dcr) => (dcr.id === selected.id ? updater(dcr) : dcr)));
  };

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
      modelYears: [],
      partNumber: partNumber.trim(),
      supplier: "Not assigned",
      owner: "Local preparer",
      evidence: EMPTY_EVIDENCE,
      comments: [],
      state: { id, organizationId: "demo-org", status: "draft", history: [] },
    };
    setDcrs((current) => [...current, draft]);
    setSelectedId(id);
    setDialogOpen(false);
    toast.success("DCR draft validated", {
      description: "No recovery agreement is required to draft a DCR. Demo data was not persisted.",
    });
  };

  const advance = () => {
    if (!selected) return;
    const next = NEXT_STATUS[selected.state.status];
    if (!next) return;
    try {
      const state = transitionDcr({
        dcr: selected.state,
        to: next,
        actorId: "local-reviewer",
        actorRoles: ["administrator"],
        occurredAt: new Date().toISOString(),
        comment:
          next === "closed" ? "Closed through an explicit demonstration transition." : undefined,
        evidence: selected.evidence,
      });
      updateSelected((dcr) => ({ ...dcr, state }));
      toast.success(`${STATUS_LABELS[selected.state.status]} → ${STATUS_LABELS[next]}`, {
        description: "Validated by workflow version 1; the demonstration change was not persisted.",
      });
    } catch (error) {
      toast.error("Transition blocked", {
        description: error instanceof Error ? error.message : "Required evidence is missing.",
      });
    }
  };

  const addEvidence = () => {
    updateSelected((dcr) => ({
      ...dcr,
      evidence: {
        ...dcr.evidence,
        documentTypes: Array.from(new Set([...dcr.evidence.documentTypes, "technical_evidence"])),
      },
    }));
    toast.success("Synthetic technical evidence linked", {
      description: "No customer document was uploaded or persisted.",
    });
  };

  const assignReviewers = () => {
    updateSelected((dcr) => ({
      ...dcr,
      evidence: {
        ...dcr.evidence,
        assignmentRoles: Array.from(
          new Set([...dcr.evidence.assignmentRoles, "owner", "reviewer", "approver"] as const),
        ),
      },
    }));
    toast.success("Required demo assignments recorded");
  };

  const recordApproval = (stage: "technical" | "release") => {
    updateSelected((dcr) => ({
      ...dcr,
      evidence: {
        ...dcr.evidence,
        approvedStages: Array.from(new Set([...dcr.evidence.approvedStages, stage])),
      },
    }));
    toast.success(`${stage === "technical" ? "Technical" : "Release"} approval recorded`, {
      description: "Local demonstration evidence only; no hosted approval was created.",
    });
  };

  const addComment = () => {
    if (!comment.trim()) {
      toast.error("Enter a comment before adding it.");
      return;
    }
    updateSelected((dcr) => ({
      ...dcr,
      comments: [
        ...dcr.comments,
        {
          id: `comment-${dcr.comments.length + 1}`,
          author: "Local reviewer",
          createdAt: new Date().toISOString(),
          body: comment.trim(),
        },
      ],
    }));
    setComment("");
    toast.success("Demo comment added locally");
  };

  return (
    <AppShell
      title="Design Change Requests"
      description="Evidence-gated engineering changes with affected records, accountable reviewers, comments, and immutable transitions."
      actions={
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> Create DCR draft
        </Button>
      }
    >
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base">DCR pipeline</CardTitle>
          <CardDescription>
            Select a stage to filter the register. Rejected and cancelled records remain searchable
            audit records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex min-w-max items-center gap-2 overflow-x-auto pb-2"
            aria-label="DCR pipeline"
          >
            {PIPELINE.map((status, index) => (
              <div key={status} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                  className={`min-w-28 rounded-lg border p-3 text-left ${statusFilter === status ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}
                >
                  <div className="text-xs font-medium">{STATUS_LABELS[status]}</div>
                  <div className="mt-1 text-lg font-semibold">
                    {dcrs.filter((dcr) => dcr.state.status === status).length}
                  </div>
                </button>
                {index < PIPELINE.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search DCRs"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search DCR, program, part, or supplier"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as DcrStatus | "all")}
        >
          <SelectTrigger className="sm:w-48" aria-label="Filter DCR status">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DCR register</CardTitle>
            <CardDescription>
              {filtered.length} of {dcrs.length} organization records
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[720px] space-y-2 overflow-y-auto">
            {filtered.map((dcr) => (
              <button
                key={dcr.id}
                type="button"
                onClick={() => setSelectedId(dcr.id)}
                className={`w-full rounded-lg border p-3 text-left transition ${selected?.id === dcr.id ? "border-primary bg-primary/5" : "hover:bg-secondary/50"}`}
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
            {filtered.length === 0 && (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No DCRs match the current search and status filter.
              </p>
            )}
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
                <Detail icon={FilePlus2} label="Part / revision" value={selected.partNumber} />
                <Detail
                  icon={Clock3}
                  label="Model years"
                  value={selected.modelYears.join(", ") || "Not assigned"}
                />
                <Detail icon={UserRound} label="Owner" value={selected.owner} />
              </CardContent>
              <CardContent className="flex flex-wrap gap-2 border-t pt-4">
                <Button asChild size="sm" variant="outline">
                  <Link to="/programs" search={{ programId: undefined }}>
                    Open program
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/parts">Open part</Link>
                </Button>
                {selected.agreement ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/contracts">Open {selected.agreement.number}</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/contracts">Create agreement link</Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Paperclip className="h-4 w-4" /> Transition requirements
                  </CardTitle>
                  <CardDescription>
                    A DCR can be drafted without a contract. Configured evidence gates approval and
                    release.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Gate
                    label="Technical evidence"
                    met={selected.evidence.documentTypes.includes("technical_evidence")}
                  />
                  <Gate
                    label="Reviewer and approver assigned"
                    met={
                      selected.evidence.assignmentRoles.includes("reviewer") &&
                      selected.evidence.assignmentRoles.includes("approver")
                    }
                  />
                  <Gate
                    label="Technical approval"
                    met={selected.evidence.approvedStages.includes("technical")}
                  />
                  <Gate
                    label="Release approval"
                    met={selected.evidence.approvedStages.includes("release")}
                  />
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={addEvidence}>
                      Link demo evidence
                    </Button>
                    <Button size="sm" variant="outline" onClick={assignReviewers}>
                      Assign reviewers
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => recordApproval("technical")}>
                      Record technical approval
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => recordApproval("release")}>
                      Record release approval
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4" /> Recovery agreement
                  </CardTitle>
                  <CardDescription>
                    Direct link to the canonical agreement record; terms are not duplicated in the
                    DCR.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selected.agreement ? (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono font-semibold">{selected.agreement.number}</span>
                        <Badge variant="outline">{selected.agreement.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Recovery activation and posting still require this agreement to be approved
                        and active.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No agreement linked. This does not block drafting or submission; recovery
                      activation and accounting posting remain unavailable.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquarePlus className="h-4 w-4" /> Comments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.comments.map((entry) => (
                    <div key={entry.id} className="rounded-lg border p-3 text-sm">
                      <p>{entry.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {entry.author} · {entry.createdAt}
                      </p>
                    </div>
                  ))}
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Add review context"
                    aria-label="DCR comment"
                  />
                  <Button size="sm" variant="outline" onClick={addComment}>
                    Add comment
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <History className="h-4 w-4" /> Transition history
                    </CardTitle>
                    <Select
                      value={historyFilter}
                      onValueChange={(value) => setHistoryFilter(value as DcrStatus | "all")}
                    >
                      <SelectTrigger className="w-36" aria-label="Filter transition history">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All events</SelectItem>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <CardDescription>
                    Actor, time, workflow id, and version remain attached to every transition.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredHistory.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No matching local transitions in this review session.
                    </div>
                  ) : (
                    <ol className="space-y-3">
                      {filteredHistory.map((entry, index) => (
                        <li
                          key={`${entry.occurredAt}-${index}`}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="font-medium">
                            {STATUS_LABELS[entry.from]} → {STATUS_LABELS[entry.to]}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {entry.actorId} · {entry.occurredAt} · {entry.workflowId} v
                            {entry.workflowVersion}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create DCR draft</DialogTitle>
            <DialogDescription>
              Creates a distinct change-request draft. A recovery agreement is not required at this
              stage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="DCR number">
              <Input value={number} onChange={(event) => setNumber(event.target.value)} />
            </Field>
            <Field label="Part number / revision">
              <Input value={partNumber} onChange={(event) => setPartNumber(event.target.value)} />
            </Field>
            <Field label="Affected program">
              <Input value={program} onChange={(event) => setProgram(event.target.value)} />
            </Field>
            <Field label="Change title">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDraft}>Validate draft</Button>
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

function Gate({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <span>{label}</span>
      <Badge variant={met ? "secondary" : "outline"}>
        {met ? (
          <>
            <Check className="mr-1 h-3 w-3" /> Ready
          </>
        ) : (
          "Required"
        )}
      </Badge>
    </div>
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
      <div className="mt-1">{labelledChildren}</div>
    </div>
  );
}
